import 'server-only';

import {
  createSupabaseAdminClientOptional,
  getSupabaseAdminMissingEnvMessage,
} from '@/lib/supabase';
import type { Database, Json } from '@/types/db';

import type {
  AdminCategoryOption,
  AdminDashboardData,
  AdminOrderDetail,
  AdminOrderDetailItem,
  AdminOrderListItem,
  AdminProductDetail,
  AdminProductImageItem,
  AdminProductListItem,
} from './types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface AdminResultBase {
  status: 'ok' | 'not_configured' | 'error';
  message?: string;
}

function toPublicDataErrorMessage(baseMessage: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${baseMessage} Details: ${details}`;
  }
  return baseMessage;
}

export interface AdminProductsResult extends AdminResultBase {
  products: AdminProductListItem[];
  categories: AdminCategoryOption[];
}

export interface AdminProductDetailResult extends AdminResultBase {
  product: AdminProductDetail | null;
  categories: AdminCategoryOption[];
}

export interface AdminOrdersResult extends AdminResultBase {
  orders: AdminOrderListItem[];
}

export interface AdminOrderDetailResult extends AdminResultBase {
  order: AdminOrderDetail | null;
}

export interface AdminDashboardResult extends AdminResultBase {
  dashboard: AdminDashboardData | null;
}

export interface AdminCategoriesResult extends AdminResultBase {
  categories: AdminCategoryOption[];
}

function parseShippingAddress(shippingAddress: Json) {
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

function mapCategories(rows: CategoryRow[]): AdminCategoryOption[] {
  return rows
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      isActive: row.is_active,
    }));
}

function mapProductImages(rows: ProductImageRow[]): Map<string, ProductImageRow[]> {
  const imagesByProductId = new Map<string, ProductImageRow[]>();

  rows.forEach((row) => {
    const bucket = imagesByProductId.get(row.product_id);
    if (bucket) {
      bucket.push(row);
      return;
    }
    imagesByProductId.set(row.product_id, [row]);
  });

  imagesByProductId.forEach((bucket, productId) => {
    imagesByProductId.set(
      productId,
      [...bucket].sort((left, right) => {
        if (left.is_primary !== right.is_primary) {
          return left.is_primary ? -1 : 1;
        }
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return left.created_at.localeCompare(right.created_at);
      }),
    );
  });

  return imagesByProductId;
}

function mapProductList(
  productRows: ProductRow[],
  categoryRows: CategoryRow[],
  imageRows: ProductImageRow[],
): AdminProductListItem[] {
  const categoriesById = new Map(categoryRows.map((row) => [row.id, row]));
  const imagesByProductId = mapProductImages(imageRows);

  return productRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    isFeatured: row.is_featured,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price ? Number(row.compare_at_price) : null,
    currency: row.currency,
    stockQuantity: row.stock_quantity,
    categoryId: row.category_id,
    categoryTitle: row.category_id ? categoriesById.get(row.category_id)?.title ?? null : null,
    updatedAt: row.updated_at,
    primaryImageUrl: (imagesByProductId.get(row.id)?.[0]?.url ?? null),
  }));
}

function mapImageList(rows: ProductImageRow[]): AdminProductImageItem[] {
  return [...rows]
    .sort((left, right) => {
      if (left.is_primary !== right.is_primary) {
        return left.is_primary ? -1 : 1;
      }
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }
      return left.created_at.localeCompare(right.created_at);
    })
    .map((row) => ({
      id: row.id,
      productId: row.product_id,
      url: row.url,
      alt: row.alt,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      createdAt: row.created_at,
    }));
}

export async function getAdminCategories(): Promise<AdminCategoriesResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      categories: [],
      message: toPublicDataErrorMessage(
        'Admin categories are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const result = await client
    .from('categories')
    .select('*')
    .order('title', { ascending: true });

  if (result.error) {
    return {
      status: 'error',
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load categories right now.',
        result.error.message,
      ),
    };
  }

  return {
    status: 'ok',
    categories: mapCategories((result.data ?? []) as CategoryRow[]),
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      dashboard: null,
      message: toPublicDataErrorMessage(
        'Admin dashboard is temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const [productsResult, ordersResult] = await Promise.all([
    client.from('products').select('status'),
    client.from('orders').select('status'),
  ]);

  if (productsResult.error) {
    return {
      status: 'error',
      dashboard: null,
      message: toPublicDataErrorMessage(
        'Could not load dashboard products right now.',
        productsResult.error.message,
      ),
    };
  }

  if (ordersResult.error) {
    return {
      status: 'error',
      dashboard: null,
      message: toPublicDataErrorMessage(
        'Could not load dashboard orders right now.',
        ordersResult.error.message,
      ),
    };
  }

  const products = (productsResult.data ?? []) as Array<Pick<ProductRow, 'status'>>;
  const orders = (ordersResult.data ?? []) as Array<Pick<OrderRow, 'status'>>;

  return {
    status: 'ok',
    dashboard: {
      productsCount: products.length,
      activeProductsCount: products.filter((item) => item.status === 'active').length,
      draftProductsCount: products.filter((item) => item.status === 'draft').length,
      archivedProductsCount: products.filter((item) => item.status === 'archived').length,
      ordersCount: orders.length,
      pendingOrdersCount: orders.filter((item) =>
        ['pending', 'confirmed', 'processing'].includes(item.status),
      ).length,
    },
  };
}

export async function getAdminProducts(): Promise<AdminProductsResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      products: [],
      categories: [],
      message: toPublicDataErrorMessage(
        'Admin products are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const [productsResult, categoriesResult] = await Promise.all([
    client.from('products').select('*').order('updated_at', { ascending: false }),
    client.from('categories').select('*'),
  ]);

  if (productsResult.error) {
    return {
      status: 'error',
      products: [],
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load products right now.',
        productsResult.error.message,
      ),
    };
  }

  if (categoriesResult.error) {
    return {
      status: 'error',
      products: [],
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load product categories right now.',
        categoriesResult.error.message,
      ),
    };
  }

  const productRows = (productsResult.data ?? []) as ProductRow[];
  const productIds = productRows.map((row) => row.id);

  let imageRows: ProductImageRow[] = [];
  if (productIds.length > 0) {
    const imagesResult = await client
      .from('product_images')
      .select('*')
      .in('product_id', productIds);

    if (imagesResult.error) {
      return {
        status: 'error',
        products: [],
        categories: [],
        message: toPublicDataErrorMessage(
          'Could not load product images right now.',
          imagesResult.error.message,
        ),
      };
    }

    imageRows = (imagesResult.data ?? []) as ProductImageRow[];
  }

  const mappedCategories = mapCategories((categoriesResult.data ?? []) as CategoryRow[]);

  return {
    status: 'ok',
    categories: mappedCategories,
    products: mapProductList(
      productRows,
      (categoriesResult.data ?? []) as CategoryRow[],
      imageRows,
    ),
  };
}

export async function getAdminProductDetail(
  productId: string,
): Promise<AdminProductDetailResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      product: null,
      categories: [],
      message: toPublicDataErrorMessage(
        'Admin product details are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const [productResult, categoriesResult, imagesResult] = await Promise.all([
    client.from('products').select('*').eq('id', productId).maybeSingle(),
    client.from('categories').select('*').order('title', { ascending: true }),
    client
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true }),
  ]);

  if (productResult.error) {
    return {
      status: 'error',
      product: null,
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load product details right now.',
        productResult.error.message,
      ),
    };
  }

  if (categoriesResult.error) {
    return {
      status: 'error',
      product: null,
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load categories right now.',
        categoriesResult.error.message,
      ),
    };
  }

  if (imagesResult.error) {
    return {
      status: 'error',
      product: null,
      categories: [],
      message: toPublicDataErrorMessage(
        'Could not load product images right now.',
        imagesResult.error.message,
      ),
    };
  }

  const categories = mapCategories((categoriesResult.data ?? []) as CategoryRow[]);
  if (!productResult.data) {
    return {
      status: 'ok',
      product: null,
      categories,
    };
  }

  const productRow = productResult.data as ProductRow;
  const categoryTitle = productRow.category_id
    ? categories.find((category) => category.id === productRow.category_id)?.title ?? null
    : null;

  return {
    status: 'ok',
    categories,
    product: {
      id: productRow.id,
      slug: productRow.slug,
      title: productRow.title,
      status: productRow.status,
      isFeatured: productRow.is_featured,
      price: Number(productRow.price),
      compareAtPrice: productRow.compare_at_price
        ? Number(productRow.compare_at_price)
        : null,
      currency: productRow.currency,
      stockQuantity: productRow.stock_quantity,
      categoryId: productRow.category_id,
      categoryTitle,
      updatedAt: productRow.updated_at,
      primaryImageUrl:
        ((imagesResult.data ?? []) as ProductImageRow[]).find((row) => row.is_primary)?.url ??
        null,
      shortDescription: productRow.short_description,
      description: productRow.description,
      images: mapImageList((imagesResult.data ?? []) as ProductImageRow[]),
    },
  };
}

export async function getAdminOrders(): Promise<AdminOrdersResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      orders: [],
      message: toPublicDataErrorMessage(
        'Admin orders are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const ordersResult = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (ordersResult.error) {
    return {
      status: 'error',
      orders: [],
      message: toPublicDataErrorMessage(
        'Could not load orders right now.',
        ordersResult.error.message,
      ),
    };
  }

  const orderRows = (ordersResult.data ?? []) as OrderRow[];
  if (orderRows.length === 0) {
    return {
      status: 'ok',
      orders: [],
    };
  }

  const [itemsResult, profilesResult] = await Promise.all([
    client
      .from('order_items')
      .select('order_id, quantity')
      .in(
        'order_id',
        orderRows.map((row) => row.id),
      ),
    client
      .from('profiles')
      .select('id, display_name, username')
      .in(
        'id',
        orderRows.map((row) => row.user_id),
      ),
  ]);

  if (itemsResult.error) {
    return {
      status: 'error',
      orders: [],
      message: toPublicDataErrorMessage(
        'Could not load order items right now.',
        itemsResult.error.message,
      ),
    };
  }

  if (profilesResult.error) {
    return {
      status: 'error',
      orders: [],
      message: toPublicDataErrorMessage(
        'Could not load order profiles right now.',
        profilesResult.error.message,
      ),
    };
  }

  const profileRows = (profilesResult.data ?? []) as Array<
    Pick<ProfileRow, 'id' | 'display_name' | 'username'>
  >;
  const profilesById = new Map(profileRows.map((row) => [row.id, row]));

  const quantityByOrder = new Map<string, number>();
  ((itemsResult.data ?? []) as Array<Pick<OrderItemRow, 'order_id' | 'quantity'>>).forEach(
    (item) => {
      const current = quantityByOrder.get(item.order_id) ?? 0;
      quantityByOrder.set(item.order_id, current + item.quantity);
    },
  );

  const orders: AdminOrderListItem[] = orderRows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    status: row.status,
    totalAmount: Number(row.total_amount),
    currency: row.currency,
    customerDisplayName:
      row.customer_display_name ?? profilesById.get(row.user_id)?.display_name ?? null,
    customerUsername:
      row.customer_username ?? profilesById.get(row.user_id)?.username ?? null,
    createdAt: row.created_at,
    itemsCount: quantityByOrder.get(row.id) ?? 0,
  }));

  return {
    status: 'ok',
    orders,
  };
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetailResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      order: null,
      message: toPublicDataErrorMessage(
        'Admin order details are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const [orderResult, orderItemsResult] = await Promise.all([
    client.from('orders').select('*').eq('id', orderId).maybeSingle(),
    client
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
  ]);

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

  if (orderItemsResult.error) {
    return {
      status: 'error',
      order: null,
      message: toPublicDataErrorMessage(
        'Could not load order items right now.',
        orderItemsResult.error.message,
      ),
    };
  }

  if (!orderResult.data) {
    return {
      status: 'ok',
      order: null,
    };
  }

  const orderRow = orderResult.data as OrderRow;
  const itemRows = (orderItemsResult.data ?? []) as OrderItemRow[];

  const items: AdminOrderDetailItem[] = itemRows.map((row) => ({
    id: row.id,
    quantity: row.quantity,
    productTitle: row.product_title,
    productSlug: row.product_slug,
    productImageUrl: row.product_image_url,
    unitPrice: Number(row.unit_price),
    lineTotal: Number(row.line_total),
    currency: row.currency,
  }));

  return {
    status: 'ok',
    order: {
      id: orderRow.id,
      userId: orderRow.user_id,
      status: orderRow.status,
      subtotalAmount: Number(orderRow.subtotal_amount),
      totalAmount: Number(orderRow.total_amount),
      currency: orderRow.currency,
      customerDisplayName: orderRow.customer_display_name,
      customerUsername: orderRow.customer_username,
      customerPhone: orderRow.customer_phone,
      shippingAddress: parseShippingAddress(orderRow.shipping_address),
      notes: orderRow.notes,
      createdAt: orderRow.created_at,
      items,
    },
  };
}
