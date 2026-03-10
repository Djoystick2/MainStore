import 'server-only';

import {
  createSupabaseAdminClientOptional,
  getSupabaseAdminMissingEnvMessage,
} from '@/lib/supabase';
import { resolvePricingForProducts } from '@/features/pricing';
import type { Database, Json } from '@/types/db';

type CartItemRow = Database['public']['Tables']['cart_items']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

interface ShippingAddressSnapshot {
  city: string | null;
  addressLine: string | null;
  postalCode: string | null;
}

export interface OrderListItem {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: string;
  itemsCount: number;
}

export interface OrderListResult {
  status: 'ok' | 'unauthorized' | 'not_configured' | 'error';
  orders: OrderListItem[];
  totalOrders: number;
  inProgressOrders: number;
  message?: string;
}

export interface OrderDetailItem {
  id: string;
  quantity: number;
  productTitle: string;
  productSlug: string | null;
  productImageUrl: string | null;
  unitPriceCents: number;
  lineTotalCents: number;
  currency: string;
}

export interface OrderDetail {
  id: string;
  status: OrderStatus;
  totalCents: number;
  subtotalCents: number;
  discountCents: number;
  currency: string;
  createdAt: string;
  customerDisplayName: string | null;
  customerPhone: string | null;
  shippingAddress: ShippingAddressSnapshot;
  notes: string | null;
  items: OrderDetailItem[];
}

export interface OrderDetailResult {
  status:
    | 'ok'
    | 'unauthorized'
    | 'not_configured'
    | 'not_found'
    | 'error';
  order: OrderDetail | null;
  message?: string;
}

export interface CheckoutPayload {
  fullName: string;
  phone: string;
  city: string;
  addressLine: string;
  postalCode?: string | null;
  notes?: string | null;
}

export interface PlaceOrderResult {
  status:
    | 'ok'
    | 'unauthorized'
    | 'not_configured'
    | 'invalid_input'
    | 'empty_cart'
    | 'unavailable_items'
    | 'mixed_currency'
    | 'error';
  orderId?: string;
  totalCents?: number;
  currency?: string;
  itemsCount?: number;
  message?: string;
}

function toPriceCents(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.round(price * 100);
  }

  const parsed = Number(price);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function roundToMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseShippingAddress(shippingAddress: Json): ShippingAddressSnapshot {
  if (!shippingAddress || typeof shippingAddress !== 'object' || Array.isArray(shippingAddress)) {
    return {
      city: null,
      addressLine: null,
      postalCode: null,
    };
  }

  const city = typeof shippingAddress.city === 'string' ? shippingAddress.city : null;
  const addressLine =
    typeof shippingAddress.address_line === 'string' ? shippingAddress.address_line : null;
  const postalCode =
    typeof shippingAddress.postal_code === 'string' ? shippingAddress.postal_code : null;

  return {
    city,
    addressLine,
    postalCode,
  };
}

function normalizeField(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function validateCheckoutPayload(payload: CheckoutPayload): string | null {
  if (!normalizeField(payload.fullName, 120)) {
    return 'full_name_required';
  }
  if (!normalizeField(payload.phone, 40)) {
    return 'phone_required';
  }
  if (!normalizeField(payload.city, 120)) {
    return 'city_required';
  }
  if (!normalizeField(payload.addressLine, 240)) {
    return 'address_required';
  }
  return null;
}

function mapOrderCreationError(message: string): PlaceOrderResult['status'] {
  if (message.includes('cart_empty')) {
    return 'empty_cart';
  }
  if (message.includes('cart_contains_unavailable_items')) {
    return 'unavailable_items';
  }
  if (message.includes('mixed_currency_not_supported')) {
    return 'mixed_currency';
  }
  if (message.includes('unauthorized')) {
    return 'unauthorized';
  }
  return 'error';
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

function toPublicDataErrorMessage(baseMessage: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${baseMessage} Details: ${details}`;
  }
  return baseMessage;
}

export async function placeOrderFromCartForProfile(
  profileId: string | null,
  payload: CheckoutPayload,
): Promise<PlaceOrderResult> {
  if (!profileId) {
    return { status: 'unauthorized' };
  }

  const validationError = validateCheckoutPayload(payload);
  if (validationError) {
    return {
      status: 'invalid_input',
      message: validationError,
    };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      message: toPublicDataErrorMessage(
        'Checkout is temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  try {
    const [cartResult, profileResult] = await Promise.all([
      client
        .from('cart_items')
        .select('*')
        .eq('user_id', profileId)
        .order('updated_at', { ascending: false }),
      client
        .from('profiles')
        .select('username')
        .eq('id', profileId)
        .maybeSingle(),
    ]);

    if (cartResult.error) {
      throw new Error(cartResult.error.message);
    }
    if (profileResult.error) {
      throw new Error(profileResult.error.message);
    }

    const cartRows = (cartResult.data ?? []) as CartItemRow[];
    if (cartRows.length === 0) {
      return { status: 'empty_cart' };
    }

    const productIds = cartRows.map((row) => row.product_id);
    const productsResult = await client
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('status', 'active');

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }

    const productRows = (productsResult.data ?? []) as ProductRow[];
    if (productRows.length !== productIds.length) {
      return { status: 'unavailable_items' };
    }

    const distinctCurrencies = new Set(productRows.map((row) => row.currency));
    if (distinctCurrencies.size > 1) {
      return { status: 'mixed_currency' };
    }

    const imagesResult = await client
      .from('product_images')
      .select('*')
      .in('product_id', productIds);

    if (imagesResult.error) {
      throw new Error(imagesResult.error.message);
    }

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

    const pricingByProductId = await resolvePricingForProducts(client, productRows);
    const productsById = new Map(productRows.map((row) => [row.id, row]));
    const currency = productRows[0]?.currency ?? 'USD';

    const lineItems = cartRows.map((cartRow) => {
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
        baseLineTotal: roundToMoney(basePrice * cartRow.quantity),
        discountTotal: roundToMoney((pricing?.discountAmount ?? 0) * cartRow.quantity),
        unitPrice,
        productImageUrl: primaryImage?.url ?? null,
      };
    }).filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (lineItems.length !== cartRows.length) {
      return { status: 'unavailable_items' };
    }

    const subtotalAmount = roundToMoney(
      lineItems.reduce((sum, item) => sum + item.baseLineTotal, 0),
    );
    const discountAmount = roundToMoney(
      lineItems.reduce((sum, item) => sum + item.discountTotal, 0),
    );
    const totalAmount = roundToMoney(Math.max(0, subtotalAmount - discountAmount));

    const orderInsertResult = await client
      .from('orders')
      .insert(
        {
          user_id: profileId,
          status: 'pending',
          subtotal_amount: subtotalAmount,
          discount_amount: discountAmount,
          shipping_amount: 0,
          total_amount: totalAmount,
          currency,
          customer_display_name: normalizeField(payload.fullName, 120),
          customer_username:
            (profileResult.data as { username?: string | null } | null)?.username ?? null,
          customer_phone: normalizeField(payload.phone, 40),
          shipping_address: {
            city: normalizeField(payload.city, 120),
            address_line: normalizeField(payload.addressLine, 240),
            postal_code: normalizeField(payload.postalCode, 40) || null,
          },
          notes: normalizeField(payload.notes, 500) || null,
        } as never,
      )
      .select('id')
      .single();

    const orderRow = orderInsertResult.data as Pick<OrderRow, 'id'> | null;
    if (orderInsertResult.error || !orderRow) {
      throw new Error(orderInsertResult.error?.message ?? 'create_order_failed');
    }

    const orderItemsResult = await client.from('order_items').insert(
      lineItems.map((item) => ({
        order_id: orderRow.id,
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
      await client.from('orders').delete().eq('id', orderRow.id);
      throw new Error(orderItemsResult.error.message);
    }

    const clearCartResult = await client.from('cart_items').delete().eq('user_id', profileId);
    if (clearCartResult.error) {
      throw new Error(clearCartResult.error.message);
    }

    return {
      status: 'ok',
      orderId: orderRow.id,
      totalCents: toPriceCents(totalAmount),
      currency,
      itemsCount: lineItems.length,
    };
  } catch (error) {
    return {
      status: mapOrderCreationError(error instanceof Error ? error.message : 'unknown_checkout_error'),
      message: toPublicDataErrorMessage(
        'Could not place order right now.',
        error instanceof Error ? error.message : 'Unknown checkout error.',
      ),
    };
  }
}

export async function getOrdersForProfile(
  profileId: string | null,
): Promise<OrderListResult> {
  if (!profileId) {
    return {
      status: 'unauthorized',
      orders: [],
      totalOrders: 0,
      inProgressOrders: 0,
    };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      orders: [],
      totalOrders: 0,
      inProgressOrders: 0,
      message: toPublicDataErrorMessage(
        'Orders are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const ordersResult = await client
    .from('orders')
    .select('id, status, total_amount, currency, created_at')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (ordersResult.error) {
    return {
      status: 'error',
      orders: [],
      totalOrders: 0,
      inProgressOrders: 0,
      message: toPublicDataErrorMessage(
        'Could not load orders right now.',
        ordersResult.error.message,
      ),
    };
  }

  const orderRows = (ordersResult.data ?? []) as Array<
    Pick<OrderRow, 'id' | 'status' | 'total_amount' | 'currency' | 'created_at'>
  >;

  if (orderRows.length === 0) {
    return {
      status: 'ok',
      orders: [],
      totalOrders: 0,
      inProgressOrders: 0,
    };
  }

  const orderIds = orderRows.map((row) => row.id);
  const itemsResult = await client
    .from('order_items')
    .select('order_id, quantity')
    .in('order_id', orderIds);

  if (itemsResult.error) {
    return {
      status: 'error',
      orders: [],
      totalOrders: 0,
      inProgressOrders: 0,
      message: toPublicDataErrorMessage(
        'Could not load order items right now.',
        itemsResult.error.message,
      ),
    };
  }

  const itemRows = (itemsResult.data ?? []) as Array<
    Pick<OrderItemRow, 'order_id' | 'quantity'>
  >;

  const itemsCountByOrderId = new Map<string, number>();
  itemRows.forEach((row) => {
    const existing = itemsCountByOrderId.get(row.order_id) ?? 0;
    itemsCountByOrderId.set(row.order_id, existing + row.quantity);
  });

  const orders: OrderListItem[] = orderRows.map((row) => ({
    id: row.id,
    status: row.status,
    totalCents: toPriceCents(row.total_amount),
    currency: row.currency,
    createdAt: row.created_at,
    itemsCount: itemsCountByOrderId.get(row.id) ?? 0,
  }));

  const inProgressOrders = orders.filter(
    (order) => !['delivered', 'cancelled'].includes(order.status),
  ).length;

  return {
    status: 'ok',
    orders,
    totalOrders: orders.length,
    inProgressOrders,
  };
}

export async function getOrderDetailForProfile(
  profileId: string | null,
  orderId: string,
): Promise<OrderDetailResult> {
  if (!profileId) {
    return {
      status: 'unauthorized',
      order: null,
    };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      order: null,
      message: toPublicDataErrorMessage(
        'Order details are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const orderResult = await client
    .from('orders')
    .select(
      'id, status, total_amount, subtotal_amount, discount_amount, currency, created_at, customer_display_name, customer_phone, shipping_address, notes',
    )
    .eq('user_id', profileId)
    .eq('id', orderId)
    .maybeSingle();

  if (orderResult.error) {
    return {
      status: 'error',
      order: null,
      message: toPublicDataErrorMessage(
        'Could not load order details right now.',
        orderResult.error.message,
      ),
    };
  }

  if (!orderResult.data) {
    return {
      status: 'not_found',
      order: null,
    };
  }

  const orderRow = orderResult.data as Pick<
    OrderRow,
    | 'id'
    | 'status'
    | 'total_amount'
    | 'subtotal_amount'
    | 'discount_amount'
    | 'currency'
    | 'created_at'
    | 'customer_display_name'
    | 'customer_phone'
    | 'shipping_address'
    | 'notes'
  >;

  const itemsResult = await client
    .from('order_items')
    .select(
      'id, quantity, product_title, product_slug, product_image_url, unit_price, line_total, currency',
    )
    .eq('order_id', orderRow.id)
    .order('created_at', { ascending: true });

  if (itemsResult.error) {
    return {
      status: 'error',
      order: null,
      message: toPublicDataErrorMessage(
        'Could not load order items right now.',
        itemsResult.error.message,
      ),
    };
  }

  const itemRows = (itemsResult.data ?? []) as Array<
    Pick<
      OrderItemRow,
      | 'id'
      | 'quantity'
      | 'product_title'
      | 'product_slug'
      | 'product_image_url'
      | 'unit_price'
      | 'line_total'
      | 'currency'
    >
  >;

  const items: OrderDetailItem[] = itemRows.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    productTitle: item.product_title,
    productSlug: item.product_slug,
    productImageUrl: item.product_image_url,
    unitPriceCents: toPriceCents(item.unit_price),
    lineTotalCents: toPriceCents(item.line_total),
    currency: item.currency,
  }));

  return {
    status: 'ok',
    order: {
      id: orderRow.id,
      status: orderRow.status,
      totalCents: toPriceCents(orderRow.total_amount),
      subtotalCents: toPriceCents(orderRow.subtotal_amount),
      discountCents: toPriceCents(orderRow.discount_amount),
      currency: orderRow.currency,
      createdAt: orderRow.created_at,
      customerDisplayName: orderRow.customer_display_name,
      customerPhone: orderRow.customer_phone,
      shippingAddress: parseShippingAddress(orderRow.shipping_address),
      notes: orderRow.notes,
      items,
    },
  };
}

export async function getLatestOrderForProfile(
  profileId: string | null,
): Promise<OrderListItem | null> {
  const listResult = await getOrdersForProfile(profileId);
  if (listResult.status !== 'ok') {
    return null;
  }
  return listResult.orders[0] ?? null;
}
