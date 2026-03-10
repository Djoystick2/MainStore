import 'server-only';

import type { NextRequest } from 'next/server';

import { createSupabaseAdminClientOptional, getSupabaseAdminMissingEnvMessage } from '@/lib/supabase';
import { resolvePricingForProducts } from '@/features/pricing';
import type { Database } from '@/types/db';

import { resolveConfiguredPaymentProvider } from './env';
import { getRegisteredPaymentProviderAdapter, isRegisteredPaymentProvider } from './providers/registry';
import type {
  PaymentAttemptSummary,
  PaymentInitiationResult,
  PaymentUpdatePayload,
  PaymentUpdateResult,
} from './types';

type CartItemRow = Database['public']['Tables']['cart_items']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type PaymentAttemptRow = Database['public']['Tables']['payment_attempts']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PaymentProvider = Database['public']['Enums']['payment_provider'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export interface CheckoutPayload {
  fullName: string;
  phone: string;
  city: string;
  addressLine: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface PaymentAttemptViewResult {
  status: 'ok' | 'unauthorized' | 'not_configured' | 'not_found' | 'error';
  attempt: (PaymentAttemptSummary & {
    orderStatus: Database['public']['Enums']['order_status'];
    orderTotalAmount: number;
    orderCurrency: string;
  }) | null;
  message?: string;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toPriceCents(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.round(price * 100);
  }

  const parsed = Number(price);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function normalizeField(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function validateCheckoutPayload(payload: CheckoutPayload): string | null {
  const fullName = normalizeField(payload.fullName, 120);
  const phone = normalizeField(payload.phone, 40);
  const city = normalizeField(payload.city, 120);
  const addressLine = normalizeField(payload.addressLine, 240);
  const postalCode = normalizeField(payload.postalCode, 40);
  const phoneDigits = phone.replace(/\D/g, '');

  if (!fullName) {
    return 'full_name_required';
  }
  if (fullName.length < 2) {
    return 'full_name_too_short';
  }
  if (!phone) {
    return 'phone_required';
  }
  if (phoneDigits.length < 6) {
    return 'phone_invalid';
  }
  if (!city) {
    return 'city_required';
  }
  if (city.length < 2) {
    return 'city_too_short';
  }
  if (!addressLine) {
    return 'address_required';
  }
  if (addressLine.length < 6) {
    return 'address_too_short';
  }
  if (postalCode && postalCode.length < 3) {
    return 'postal_code_invalid';
  }

  return null;
}

function toPublicErrorMessage(baseMessage: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${baseMessage} Подробности: ${details}`;
  }

  return baseMessage;
}

function createAttemptKey(raw: string | null | undefined): string {
  const normalized = normalizeField(raw, 120);
  return normalized || crypto.randomUUID();
}

function isContinuationStatus(status: PaymentStatus): boolean {
  return status === 'pending' || status === 'requires_action';
}

function isFinalPaymentStatus(status: PaymentStatus): boolean {
  return status === 'paid' || status === 'failed' || status === 'cancelled' || status === 'expired';
}

function defaultPaymentError(status: PaymentStatus): string | null {
  switch (status) {
    case 'failed':
      return 'Оплата завершилась ошибкой.';
    case 'cancelled':
      return 'Оплата была отменена.';
    case 'expired':
      return 'Платёжная сессия истекла.';
    default:
      return null;
  }
}

function resolvePaymentProviderOrError():
  | { ok: true; provider: Exclude<PaymentProvider, 'legacy'> }
  | { ok: false; error: 'payment_provider_not_supported' } {
  const configured = resolveConfiguredPaymentProvider();
  if (configured.ok && configured.provider) {
    return { ok: true, provider: configured.provider };
  }

  return { ok: false, error: 'payment_provider_not_supported' };
}

function resolveRetryProvider(
  orderProvider: PaymentProvider | null,
):
  | { ok: true; provider: Exclude<PaymentProvider, 'legacy'> }
  | { ok: false; error: 'payment_provider_not_supported' } {
  if (orderProvider && orderProvider !== 'legacy') {
    const adapter = getRegisteredPaymentProviderAdapter(orderProvider);
    if (adapter) {
      return { ok: true, provider: adapter.provider };
    }
  }

  return resolvePaymentProviderOrError();
}

function mapPaymentAttemptRow(row: PaymentAttemptRow): PaymentAttemptSummary {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    provider: row.provider,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    amount: Number(row.amount),
    currency: row.currency,
    checkoutUrl: row.checkout_url,
    providerReference: row.provider_reference,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    metadata: row.metadata,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function selectPrimaryImage(images: ProductImageRow[]): ProductImageRow | null {
  if (images.length === 0) {
    return null;
  }

  return [...images].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.created_at.localeCompare(right.created_at);
  })[0] ?? null;
}

async function clearCartSilently(profileId: string) {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return;
  }

  await client.from('cart_items').delete().eq('user_id', profileId);
}

async function buildCartDraft(profileId: string) {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false as const, error: 'not_configured', details: getSupabaseAdminMissingEnvMessage() };
  }

  const cartResult = await client
    .from('cart_items')
    .select('*')
    .eq('user_id', profileId)
    .order('updated_at', { ascending: false });

  if (cartResult.error) {
    return { ok: false as const, error: cartResult.error.message };
  }

  const cartRows = (cartResult.data ?? []) as CartItemRow[];
  if (cartRows.length === 0) {
    return { ok: false as const, error: 'empty_cart' };
  }

  const productIds = cartRows.map((row) => row.product_id);
  const productsResult = await client
    .from('products')
    .select('*')
    .in('id', productIds)
    .eq('status', 'active');

  if (productsResult.error) {
    return { ok: false as const, error: productsResult.error.message };
  }

  const productRows = (productsResult.data ?? []) as ProductRow[];
  if (productRows.length !== productIds.length) {
    return { ok: false as const, error: 'unavailable_items' };
  }

  const distinctCurrencies = new Set(productRows.map((row) => row.currency));
  if (distinctCurrencies.size > 1) {
    return { ok: false as const, error: 'mixed_currency' };
  }

  const imagesResult = await client
    .from('product_images')
    .select('*')
    .in('product_id', productIds);

  if (imagesResult.error) {
    return { ok: false as const, error: imagesResult.error.message };
  }

  const pricingByProductId = await resolvePricingForProducts(client, productRows);
  const productsById = new Map(productRows.map((row) => [row.id, row]));
  const imageRows = (imagesResult.data ?? []) as ProductImageRow[];
  const imagesByProductId = new Map<string, ProductImageRow[]>();

  imageRows.forEach((image) => {
    const bucket = imagesByProductId.get(image.product_id);
    if (bucket) {
      bucket.push(image);
      return;
    }
    imagesByProductId.set(image.product_id, [image]);
  });

  const lineItems = cartRows
    .map((cartRow) => {
      const product = productsById.get(cartRow.product_id);
      if (!product) {
        return null;
      }

      const pricing = pricingByProductId.get(product.id);
      const basePrice = pricing?.basePrice ?? Number(product.price) ?? 0;
      const unitPrice = pricing?.effectivePrice ?? basePrice;
      const primaryImage = selectPrimaryImage(imagesByProductId.get(product.id) ?? []);

      return {
        product,
        quantity: cartRow.quantity,
        baseLineTotal: roundMoney(basePrice * cartRow.quantity),
        discountTotal: roundMoney((pricing?.discountAmount ?? 0) * cartRow.quantity),
        unitPrice,
        productImageUrl: primaryImage?.url ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (lineItems.length !== cartRows.length) {
    return { ok: false as const, error: 'unavailable_items' };
  }

  const subtotalAmount = roundMoney(lineItems.reduce((sum, item) => sum + item.baseLineTotal, 0));
  const discountAmount = roundMoney(lineItems.reduce((sum, item) => sum + item.discountTotal, 0));
  const totalAmount = roundMoney(Math.max(0, subtotalAmount - discountAmount));

  return {
    ok: true as const,
    client,
    lineItems,
    subtotalAmount,
    discountAmount,
    totalAmount,
    currency: lineItems[0]?.product.currency ?? 'USD',
  };
}

async function fetchProfileUsername(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  profileId: string,
): Promise<string | null> {
  const profileResult = await client
    .from('profiles')
    .select('username')
    .eq('id', profileId)
    .maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  return ((profileResult.data ?? null) as Pick<ProfileRow, 'username'> | null)?.username ?? null;
}

async function insertOrderFromDraft(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  profileId: string,
  payload: CheckoutPayload,
  provider: Exclude<PaymentProvider, 'legacy'>,
  checkoutIdempotencyKey: string,
  draft: {
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    currency: string;
    lineItems: Array<{
      product: ProductRow;
      quantity: number;
      unitPrice: number;
      productImageUrl: string | null;
    }>;
  },
): Promise<{ order: OrderRow; orderItemsCount: number }> {
  const customerUsername = await fetchProfileUsername(client, profileId);
  const orderResult = await client
    .from('orders')
    .insert(
      {
        user_id: profileId,
        status: 'pending',
        checkout_idempotency_key: checkoutIdempotencyKey,
        payment_status: 'pending',
        payment_provider: provider,
        subtotal_amount: draft.subtotalAmount,
        discount_amount: draft.discountAmount,
        shipping_amount: 0,
        total_amount: draft.totalAmount,
        currency: draft.currency,
        customer_display_name: normalizeField(payload.fullName, 120),
        customer_username: customerUsername,
        customer_phone: normalizeField(payload.phone, 40),
        shipping_address: {
          city: normalizeField(payload.city, 120),
          address_line: normalizeField(payload.addressLine, 240),
          postal_code: normalizeField(payload.postalCode, 40) || null,
        },
        notes: normalizeField(payload.notes, 500) || null,
      } as never,
    )
    .select('*')
    .single();

  const typedOrderResult = orderResult as {
    data: OrderRow | null;
    error: { message: string } | null;
  };

  if (typedOrderResult.error || !typedOrderResult.data) {
    throw new Error(typedOrderResult.error?.message ?? 'create_order_failed');
  }

  const order = typedOrderResult.data;
  const orderItemsResult = await client.from('order_items').insert(
    draft.lineItems.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      product_title: item.product.title,
      product_slug: item.product.slug,
      product_image_url: item.productImageUrl,
      unit_price: item.unitPrice,
      currency: item.product.currency,
    })) as never,
  );

  if (orderItemsResult.error) {
    await client.from('orders').delete().eq('id', order.id);
    throw new Error(orderItemsResult.error.message);
  }

  return { order, orderItemsCount: draft.lineItems.length };
}

async function findExistingInitiationByKey(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  profileId: string,
  idempotencyKey: string,
): Promise<PaymentInitiationResult | null> {
  const orderResult = await client
    .from('orders')
    .select('id, user_id')
    .eq('checkout_idempotency_key', idempotencyKey)
    .eq('user_id', profileId)
    .maybeSingle();

  if (orderResult.error) {
    throw new Error(orderResult.error.message);
  }

  if (!orderResult.data) {
    return null;
  }

  const order = orderResult.data as Pick<OrderRow, 'id'>;
  const latestAttempt = await getLatestAttemptForOrder(client, order.id);
  if (!latestAttempt) {
    return {
      ok: false,
      error: 'payment_attempt_not_found',
    };
  }

  return buildInitiationResult(client, order.id, latestAttempt);
}

async function createPaymentAttempt(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  input: {
    orderId: string;
    userId: string;
    provider: Exclude<PaymentProvider, 'legacy'>;
    amount: number;
    currency: string;
    idempotencyKey: string;
  },
): Promise<PaymentAttemptRow> {
  const insertResult = await client
    .from('payment_attempts')
    .insert(
      {
        order_id: input.orderId,
        user_id: input.userId,
        provider: input.provider,
        status: 'pending',
        idempotency_key: input.idempotencyKey,
        amount: input.amount,
        currency: input.currency,
      } as never,
    )
    .select('*')
    .single();

  const typedInsertResult = insertResult as {
    data: PaymentAttemptRow | null;
    error: { message: string } | null;
  };

  if (!typedInsertResult.error && typedInsertResult.data) {
    return typedInsertResult.data;
  }

  if (typedInsertResult.error?.message.includes('payment_attempts_idempotency_key_key')) {
    const existingResult = await client
      .from('payment_attempts')
      .select('*')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();

    if (existingResult.error || !existingResult.data) {
      throw new Error(existingResult.error?.message ?? 'payment_attempt_lookup_failed');
    }

    return existingResult.data as PaymentAttemptRow;
  }

  throw new Error(typedInsertResult.error?.message ?? 'create_payment_attempt_failed');
}

function buildReturnUrl(appOrigin: string, orderId: string, status: 'success' | 'cancel' | 'failed'): string {
  return `${appOrigin}/orders/${orderId}?payment=${status}`;
}

async function attachProviderSession(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  attempt: PaymentAttemptRow,
  order: OrderRow,
  appOrigin: string,
) {
  const provider = attempt.provider as Exclude<PaymentProvider, 'legacy'>;
  const adapter = getRegisteredPaymentProviderAdapter(provider);
  if (!adapter) {
    throw new Error(`Unsupported payment provider: ${provider}`);
  }
  const session = await adapter.createPaymentSession({
    attemptId: attempt.id,
    orderId: order.id,
    amount: Number(attempt.amount),
    currency: attempt.currency,
    appOrigin,
    customerDisplayName: order.customer_display_name,
    customerPhone: order.customer_phone,
    returnUrl: buildReturnUrl(appOrigin, order.id, 'success'),
    cancelUrl: buildReturnUrl(appOrigin, order.id, 'cancel'),
    metadata: {
      order_id: order.id,
      user_id: order.user_id,
    },
  });

  const attemptUpdateResult = await client
    .from('payment_attempts')
    .update(
      {
        status: session.status,
        checkout_url: session.checkoutUrl,
        provider_reference: session.providerReference,
        expires_at: session.expiresAt,
        metadata: session.metadata ?? {},
        error_code: null,
        error_message: null,
      } as never,
    )
    .eq('id', attempt.id)
    .select('*')
    .single();

  const typedAttemptUpdateResult = attemptUpdateResult as {
    data: PaymentAttemptRow | null;
    error: { message: string } | null;
  };

  if (typedAttemptUpdateResult.error || !typedAttemptUpdateResult.data) {
    throw new Error(typedAttemptUpdateResult.error?.message ?? 'update_payment_attempt_failed');
  }

  const orderUpdateResult = await client
    .from('orders')
    .update(
      {
        payment_status: session.status,
        payment_provider: session.provider,
        payment_reference: session.providerReference,
        payment_last_error: null,
      } as never,
    )
    .eq('id', order.id)
    .select('*')
    .single();

  const typedOrderUpdateResult = orderUpdateResult as {
    data: OrderRow | null;
    error: { message: string } | null;
  };

  if (typedOrderUpdateResult.error || !typedOrderUpdateResult.data) {
    throw new Error(typedOrderUpdateResult.error?.message ?? 'update_order_payment_state_failed');
  }

  return {
    attempt: typedAttemptUpdateResult.data,
    order: typedOrderUpdateResult.data,
  };
}

async function getOrderForUser(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  profileId: string,
  orderId: string,
): Promise<OrderRow | null> {
  const result = await client
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', profileId)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? null) as OrderRow | null;
}

async function getLatestAttemptForOrder(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  orderId: string,
): Promise<PaymentAttemptRow | null> {
  const result = await client
    .from('payment_attempts')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? null) as PaymentAttemptRow | null;
}

function isAttemptExpired(attempt: Pick<PaymentAttemptRow, 'expires_at'>): boolean {
  return Boolean(attempt.expires_at && new Date(attempt.expires_at).getTime() < Date.now());
}

async function buildInitiationResult(
  client: NonNullable<ReturnType<typeof createSupabaseAdminClientOptional>>,
  orderId: string,
  attempt: PaymentAttemptRow,
): Promise<PaymentInitiationResult> {
  const orderResult = await client
    .from('orders')
    .select('id, total_amount, currency, payment_status, payment_provider')
    .eq('id', orderId)
    .maybeSingle();

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: orderResult.error?.message ?? 'order_not_found' };
  }

  const order = orderResult.data as Pick<
    OrderRow,
    'id' | 'total_amount' | 'currency' | 'payment_status' | 'payment_provider'
  >;

  return {
    ok: true,
    orderId: order.id,
    paymentAttemptId: attempt.id,
    paymentStatus: order.payment_status,
    paymentProvider: order.payment_provider,
    checkoutUrl: attempt.checkout_url,
    totalAmount: Number(order.total_amount),
    totalCents: toPriceCents(order.total_amount),
    currency: order.currency,
  };
}

export async function startCheckoutPaymentForProfile(
  profileId: string | null,
  payload: CheckoutPayload,
  input: {
    appOrigin: string;
    idempotencyKey?: string | null;
  },
): Promise<PaymentInitiationResult> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const validationError = validateCheckoutPayload(payload);
  if (validationError) {
    return { ok: false, error: 'invalid_input' };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const providerResult = resolvePaymentProviderOrError();
  if (!providerResult.ok) {
    return { ok: false, error: providerResult.error };
  }

  const provider = providerResult.provider;
  const idempotencyKey = createAttemptKey(input.idempotencyKey);

  try {
    const existing = await findExistingInitiationByKey(client, profileId, idempotencyKey);
    if (existing) {
      return existing;
    }
  } catch (error) {
    return {
      ok: false,
      error: toPublicErrorMessage(
        'Сейчас не удалось проверить существующую платёжную сессию.',
        error instanceof Error ? error.message : 'payment_idempotency_lookup_failed',
      ),
    };
  }

  const draftResult = await buildCartDraft(profileId);
  if (!draftResult.ok) {
    if (draftResult.error === 'not_configured') {
      return {
        ok: false,
        error: 'not_configured',
      };
    }

    if (draftResult.error === 'empty_cart') {
      return { ok: false, error: 'empty_cart' };
    }

    if (draftResult.error === 'unavailable_items') {
      return { ok: false, error: 'unavailable_items' };
    }

    if (draftResult.error === 'mixed_currency') {
      return { ok: false, error: 'mixed_currency' };
    }

    return {
      ok: false,
      error: toPublicErrorMessage('Сейчас не удалось подготовить оплату.', draftResult.error),
    };
  }

  const draftClient = draftResult.client;

  try {
    const { order } = await insertOrderFromDraft(
      draftClient,
      profileId,
      payload,
      provider,
      idempotencyKey,
      draftResult,
    );
    const attempt = await createPaymentAttempt(draftClient, {
      orderId: order.id,
      userId: profileId,
      provider,
      amount: draftResult.totalAmount,
      currency: draftResult.currency,
      idempotencyKey,
    });

    const attached = attempt.checkout_url
      ? { attempt, order }
      : await attachProviderSession(draftClient, attempt, order, input.appOrigin);

    await clearCartSilently(profileId);

    return buildInitiationResult(draftClient, attached.order.id, attached.attempt);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_payment_start_error';
    if (message.includes('idx_orders_checkout_idempotency_key') || message.includes('checkout_idempotency_key')) {
      const existing = await findExistingInitiationByKey(draftClient, profileId, idempotencyKey);
      if (existing) {
        return existing;
      }
    }
    return {
      ok: false,
      error: ['empty_cart', 'unavailable_items', 'mixed_currency'].includes(message)
        ? message
        : toPublicErrorMessage('Сейчас не удалось запустить оплату.', message),
    };
  }
}

export async function retryOrderPaymentForProfile(
  profileId: string | null,
  orderId: string,
  input: {
    appOrigin: string;
    idempotencyKey?: string | null;
  },
): Promise<PaymentInitiationResult> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  try {
    const order = await getOrderForUser(client, profileId, orderId);
    if (!order) {
      return { ok: false, error: 'order_not_found' };
    }

    if (order.status === 'cancelled') {
      return { ok: false, error: 'order_cancelled' };
    }

    if (order.payment_status === 'paid') {
      return { ok: false, error: 'already_paid' };
    }

    const latestAttempt = await getLatestAttemptForOrder(client, orderId);
    if (
      latestAttempt &&
      latestAttempt.checkout_url &&
      isContinuationStatus(latestAttempt.status) &&
      !isAttemptExpired(latestAttempt)
    ) {
      return buildInitiationResult(client, orderId, latestAttempt);
    }

    const providerResult = resolveRetryProvider(order.payment_provider);
    if (!providerResult.ok) {
      return { ok: false, error: providerResult.error };
    }

    const provider = providerResult.provider;
    const idempotencyKey = createAttemptKey(input.idempotencyKey);
    const attempt = await createPaymentAttempt(client, {
      orderId,
      userId: profileId,
      provider,
      amount: Number(order.total_amount),
      currency: order.currency,
      idempotencyKey,
    });
    const attached = attempt.checkout_url
      ? { attempt, order }
      : await attachProviderSession(client, attempt, order, input.appOrigin);

    return buildInitiationResult(client, attached.order.id, attached.attempt);
  } catch (error) {
    return {
      ok: false,
      error: toPublicErrorMessage(
        'Сейчас не удалось продолжить оплату.',
        error instanceof Error ? error.message : 'unknown_retry_payment_error',
      ),
    };
  }
}

export async function getPaymentAttemptForProfile(
  profileId: string | null,
  attemptId: string,
): Promise<PaymentAttemptViewResult> {
  if (!profileId) {
    return { status: 'unauthorized', attempt: null };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      attempt: null,
      message: toPublicErrorMessage('Платёжный шаг временно недоступен.', getSupabaseAdminMissingEnvMessage()),
    };
  }

  try {
    const result = await client
      .from('payment_attempts')
      .select('*, orders!inner(id, user_id, status, total_amount, currency)')
      .eq('id', attemptId)
      .eq('user_id', profileId)
      .maybeSingle();

    if (result.error) {
      throw new Error(result.error.message);
    }

    if (!result.data) {
      return { status: 'not_found', attempt: null };
    }

    const row = result.data as PaymentAttemptRow & {
      orders: Pick<OrderRow, 'id' | 'user_id' | 'status' | 'total_amount' | 'currency'>;
    };

    return {
      status: 'ok',
      attempt: {
        ...mapPaymentAttemptRow(row),
        orderStatus: row.orders.status,
        orderTotalAmount: Number(row.orders.total_amount),
        orderCurrency: row.orders.currency,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      attempt: null,
      message: toPublicErrorMessage(
        'Сейчас не удалось загрузить платёжный шаг.',
        error instanceof Error ? error.message : 'unknown_payment_attempt_error',
      ),
    };
  }
}

export async function applyPaymentUpdateByAttemptId(
  attemptId: string,
  payload: PaymentUpdatePayload,
  options?: {
    expectedProvider?: Exclude<PaymentProvider, 'legacy'>;
  },
): Promise<PaymentUpdateResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  try {
    const attemptResult = await client
      .from('payment_attempts')
      .select('*')
      .eq('id', attemptId)
      .maybeSingle();

    if (attemptResult.error || !attemptResult.data) {
      return { ok: false, error: 'payment_attempt_not_found' };
    }

    const attempt = attemptResult.data as PaymentAttemptRow;
    if (options?.expectedProvider && attempt.provider !== options.expectedProvider) {
      return { ok: false, error: 'payment_provider_mismatch' };
    }

    const orderResult = await client
      .from('orders')
      .select('*')
      .eq('id', attempt.order_id)
      .maybeSingle();

    if (orderResult.error || !orderResult.data) {
      return { ok: false, error: 'order_not_found' };
    }

    const order = orderResult.data as OrderRow;
    const nextStatus = payload.status;

    if (isFinalPaymentStatus(attempt.status)) {
      return {
        ok: true,
        orderId: order.id,
        paymentAttemptId: attemptId,
        paymentStatus: order.payment_status,
        orderStatus: order.status,
      };
    }

    const attemptUpdate = {
      status: nextStatus,
      provider_reference: payload.providerReference ?? attempt.provider_reference,
      error_code: payload.errorCode ?? null,
      error_message: payload.errorMessage ?? defaultPaymentError(nextStatus),
      completed_at:
        nextStatus === 'paid' ? payload.completedAt ?? new Date().toISOString() : null,
    };

    const updatedAttemptResult = await client
      .from('payment_attempts')
      .update(attemptUpdate as never)
      .eq('id', attemptId)
      .select('*')
      .single();

    if (updatedAttemptResult.error || !updatedAttemptResult.data) {
      return { ok: false, error: updatedAttemptResult.error?.message ?? 'payment_attempt_update_failed' };
    }

    const orderUpdate: Database['public']['Tables']['orders']['Update'] = {
      payment_status: nextStatus,
      payment_provider: attempt.provider,
      payment_reference: payload.providerReference ?? attempt.provider_reference,
      payment_last_error: attemptUpdate.error_message,
    };

    if (nextStatus === 'paid') {
      orderUpdate.payment_completed_at = attemptUpdate.completed_at;
      orderUpdate.payment_last_error = null;
      if (order.status === 'pending') {
        orderUpdate.status = 'confirmed';
      }
      await clearCartSilently(order.user_id);
    }

    if (nextStatus === 'requires_action' || nextStatus === 'pending') {
      orderUpdate.payment_last_error = null;
    }

    const updatedOrderResult = await client
      .from('orders')
      .update(orderUpdate as never)
      .eq('id', order.id)
      .select('id, status, payment_status')
      .single();

    const typedUpdatedOrderResult = updatedOrderResult as {
      data: Pick<OrderRow, 'id' | 'status' | 'payment_status'> | null;
      error: { message: string } | null;
    };

    if (typedUpdatedOrderResult.error || !typedUpdatedOrderResult.data) {
      return { ok: false, error: typedUpdatedOrderResult.error?.message ?? 'order_payment_update_failed' };
    }

    const updatedOrder = typedUpdatedOrderResult.data;
    return {
      ok: true,
      orderId: updatedOrder.id,
      paymentAttemptId: attemptId,
      paymentStatus: updatedOrder.payment_status,
      orderStatus: updatedOrder.status,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'unknown_payment_update_error',
    };
  }
}

export async function applySandboxActionForProfile(
  profileId: string | null,
  attemptId: string,
  action: 'paid' | 'failed' | 'cancelled',
): Promise<PaymentUpdateResult> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const viewResult = await getPaymentAttemptForProfile(profileId, attemptId);
  if (viewResult.status !== 'ok' || !viewResult.attempt) {
    switch (viewResult.status) {
      case 'not_found':
        return { ok: false, error: 'payment_attempt_not_found' };
      case 'not_configured':
        return { ok: false, error: 'not_configured' };
      case 'error':
        return { ok: false, error: 'payment_attempt_load_failed' };
      default:
        return { ok: false, error: 'unauthorized' };
    }
  }

  return applyPaymentUpdateByAttemptId(attemptId, { status: action });
}

export async function applyPaymentWebhook(
  provider: string,
  request: NextRequest,
): Promise<PaymentUpdateResult> {
  if (!isRegisteredPaymentProvider(provider)) {
    return { ok: false, error: 'unsupported_payment_provider' };
  }

  const adapter = getRegisteredPaymentProviderAdapter(provider);
  if (!adapter) {
    return { ok: false, error: 'unsupported_payment_provider' };
  }

  const event = await adapter.parseWebhook(request);
  if (!event) {
    return { ok: false, error: 'invalid_payment_webhook' };
  }

  return applyPaymentUpdateByAttemptId(event.attemptId, {
    status: event.status,
    providerReference: event.providerReference ?? null,
    errorCode: event.errorCode ?? null,
    errorMessage: event.errorMessage ?? null,
    completedAt: event.completedAt ?? null,
  }, {
    expectedProvider: provider,
  });
}
