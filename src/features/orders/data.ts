import 'server-only';

import {
  createSupabaseAdminClientOptional,
  getSupabaseAdminMissingEnvMessage,
} from '@/lib/supabase';
import type { Database, Json } from '@/types/db';

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

  const rpcResult = await client.rpc(
    'create_order_from_cart' as never,
    {
      p_user_id: profileId,
      p_customer_display_name: normalizeField(payload.fullName, 120),
      p_customer_phone: normalizeField(payload.phone, 40),
      p_shipping_city: normalizeField(payload.city, 120),
      p_shipping_address_line: normalizeField(payload.addressLine, 240),
      p_shipping_postal_code: normalizeField(payload.postalCode, 40) || null,
      p_notes: normalizeField(payload.notes, 500) || null,
    } as never,
  );

  if (rpcResult.error) {
    return {
      status: mapOrderCreationError(rpcResult.error.message),
      message: toPublicDataErrorMessage(
        'Could not place order right now.',
        rpcResult.error.message,
      ),
    };
  }

  const row = (Array.isArray(rpcResult.data) ? rpcResult.data[0] : rpcResult.data) as
    | {
        order_id: string;
        total_amount: number;
        currency: string;
        items_count: number;
      }
    | null;

  if (!row?.order_id) {
    return {
      status: 'error',
      message: 'Order was not created due to an unknown checkout error.',
    };
  }

  return {
    status: 'ok',
    orderId: row.order_id,
    totalCents: toPriceCents(row.total_amount),
    currency: row.currency,
    itemsCount: row.items_count,
  };
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
      'id, status, total_amount, subtotal_amount, currency, created_at, customer_display_name, customer_phone, shipping_address, notes',
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
