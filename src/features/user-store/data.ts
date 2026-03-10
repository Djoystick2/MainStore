import 'server-only';

import {
  createSupabaseAdminClientOptional,
  getSupabaseAdminMissingEnvMessage,
} from '@/lib/supabase';
import { resolvePricingForProducts } from '@/features/pricing';
import type { Database } from '@/types/db';
import type { StoreProduct } from '@/components/store/types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type FavoriteRow = Database['public']['Tables']['favorites']['Row'];
type CartItemRow = Database['public']['Tables']['cart_items']['Row'];

const fallbackGradients = [
  'linear-gradient(135deg, #9fb8ff 0%, #5f7de8 100%)',
  'linear-gradient(135deg, #9ce6d7 0%, #37b59b 100%)',
  'linear-gradient(135deg, #f7d8a7 0%, #d6a85b 100%)',
  'linear-gradient(135deg, #b5d3fb 0%, #4d8ddd 100%)',
  'linear-gradient(135deg, #f7e5b9 0%, #d4bb78 100%)',
  'linear-gradient(135deg, #c2c4fb 0%, #7278e4 100%)',
];

function toPriceCents(price: unknown): number {
  if (typeof price === 'number' && Number.isFinite(price)) {
    return Math.round(price * 100);
  }
  const parsed = Number(price);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function buildGradient(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return fallbackGradients[Math.abs(hash) % fallbackGradients.length];
}

function buildLabel(title: string): string {
  const words = title.split(' ').filter(Boolean);
  return words.length > 0 ? words.slice(0, 2).join(' ') : 'Product';
}

function isDuplicateConstraintError(message: string | undefined): boolean {
  if (!message) {
    return false;
  }

  return (
    message.includes('duplicate key value violates unique constraint') ||
    message.includes('already exists')
  );
}

function toPublicDataErrorMessage(baseMessage: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${baseMessage} Details: ${details}`;
  }
  return baseMessage;
}

function selectPrimaryImage(images: ProductImageRow[]): ProductImageRow | null {
  if (images.length === 0) {
    return null;
  }

  const sorted = [...images].sort((left, right) => {
    if (left.is_primary !== right.is_primary) {
      return left.is_primary ? -1 : 1;
    }
    if (left.sort_order !== right.sort_order) {
      return left.sort_order - right.sort_order;
    }
    return left.created_at.localeCompare(right.created_at);
  });

  return sorted[0] ?? null;
}

async function mapProducts(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  productRows: ProductRow[],
  imageRows: ProductImageRow[],
): Promise<Map<string, StoreProduct>> {
  const imagesByProductId = new Map<string, ProductImageRow[]>();

  imageRows.forEach((image) => {
    const bucket = imagesByProductId.get(image.product_id);
    if (bucket) {
      bucket.push(image);
      return;
    }
    imagesByProductId.set(image.product_id, [image]);
  });

  const map = new Map<string, StoreProduct>();
  const pricingByProductId = await resolvePricingForProducts(client, productRows);
  productRows.forEach((row) => {
    const primaryImage = selectPrimaryImage(imagesByProductId.get(row.id) ?? []);
    const pricing = pricingByProductId.get(row.id);
    const basePrice = pricing?.basePrice ?? Number(row.price) ?? 0;
    const effectivePrice = pricing?.effectivePrice ?? basePrice;
    const compareAtPrice =
      pricing?.compareAtPrice ?? (row.compare_at_price ? Number(row.compare_at_price) : null);

    map.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.short_description,
      description:
        row.short_description ||
        row.description ||
        'Product description will be available soon.',
      basePriceCents: toPriceCents(basePrice),
      priceCents: toPriceCents(effectivePrice),
      compareAtPriceCents: compareAtPrice !== null ? toPriceCents(compareAtPrice) : null,
      discountAmountCents: toPriceCents(pricing?.discountAmount ?? 0),
      appliedDiscount: pricing?.appliedDiscount ?? null,
      currency: row.currency,
      imageLabel: buildLabel(row.title),
      imageGradient: buildGradient(row.slug || row.id),
      imageUrl: primaryImage?.url ?? null,
      imageAlt: primaryImage?.alt ?? row.title,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      categoryId: row.category_id,
    });
  });

  return map;
}

export interface FavoriteProductsResult {
  status: 'ok' | 'unauthorized' | 'not_configured' | 'error';
  products: StoreProduct[];
  message?: string;
}

export interface CartProductItem {
  id: string;
  quantity: number;
  baseLineTotalCents: number;
  lineTotalCents: number;
  discountTotalCents: number;
  product: StoreProduct;
}

export interface CartDataResult {
  status: 'ok' | 'unauthorized' | 'not_configured' | 'error';
  items: CartProductItem[];
  itemCount: number;
  baseSubtotalCents: number;
  subtotalCents: number;
  discountTotalCents: number;
  message?: string;
}

export interface MutationResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface UserStoreSummary {
  favoritesCount: number;
  cartItemsCount: number;
  cartQuantityTotal: number;
}

function getAdminClient() {
  return createSupabaseAdminClientOptional();
}

async function fetchProductsByIds(productIds: string[]): Promise<StoreProduct[]> {
  const client = getAdminClient();
  if (!client || productIds.length === 0) {
    return [];
  }

  const productsResult = await client
    .from('products')
    .select('*')
    .in('id', productIds)
    .eq('status', 'active');

  if (productsResult.error || !productsResult.data) {
    return [];
  }

  const imagesResult = await client
    .from('product_images')
    .select('*')
    .in('product_id', productIds);

  if (imagesResult.error) {
    return [];
  }

  const productMap = await mapProducts(
    client,
    productsResult.data as ProductRow[],
    (imagesResult.data ?? []) as ProductImageRow[],
  );

  return productIds
    .map((id) => productMap.get(id))
    .filter((item): item is StoreProduct => Boolean(item));
}

export async function getFavoriteProductsForProfile(
  profileId: string | null,
): Promise<FavoriteProductsResult> {
  if (!profileId) {
    return { status: 'unauthorized', products: [] };
  }

  const client = getAdminClient();
  if (!client) {
    return {
      status: 'not_configured',
      products: [],
      message: toPublicDataErrorMessage(
        'Favorites are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const favoritesResult = await client
    .from('favorites')
    .select('*')
    .eq('user_id', profileId)
    .order('created_at', { ascending: false });

  if (favoritesResult.error) {
    return {
      status: 'error',
      products: [],
      message: toPublicDataErrorMessage(
        'Could not load favorites right now.',
        favoritesResult.error.message,
      ),
    };
  }

  const favorites = (favoritesResult.data ?? []) as FavoriteRow[];
  if (favorites.length === 0) {
    return { status: 'ok', products: [] };
  }

  const productIds = favorites.map((favorite) => favorite.product_id);
  const products = await fetchProductsByIds(productIds);

  return { status: 'ok', products };
}

export async function getFavoriteProductIdsForProfile(
  profileId: string | null,
): Promise<string[]> {
  if (!profileId) {
    return [];
  }

  const client = getAdminClient();
  if (!client) {
    return [];
  }

  const result = await client
    .from('favorites')
    .select('product_id')
    .eq('user_id', profileId);

  if (result.error || !result.data) {
    return [];
  }

  const rows = result.data as Array<Pick<FavoriteRow, 'product_id'>>;
  return rows.map((row) => row.product_id);
}

export async function toggleFavoriteForProfile(
  profileId: string | null,
  productId: string,
): Promise<MutationResult<{ favorited: boolean }>> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const client = getAdminClient();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const existing = await client
    .from('favorites')
    .select('id')
    .eq('user_id', profileId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, error: existing.error.message };
  }

  const existingFavorite = existing.data as Pick<FavoriteRow, 'id'> | null;
  if (existingFavorite?.id) {
    const removeResult = await client
      .from('favorites')
      .delete()
      .eq('id', existingFavorite.id)
      .eq('user_id', profileId);

    if (removeResult.error) {
      return { ok: false, error: removeResult.error.message };
    }

    return { ok: true, data: { favorited: false } };
  }

  const insertResult = await client.from('favorites').insert(
    {
      user_id: profileId,
      product_id: productId,
    } as never,
  );

  if (insertResult.error) {
    if (isDuplicateConstraintError(insertResult.error.message)) {
      return { ok: true, data: { favorited: true } };
    }

    return { ok: false, error: insertResult.error.message };
  }

  return { ok: true, data: { favorited: true } };
}

export async function getCartDataForProfile(
  profileId: string | null,
): Promise<CartDataResult> {
  if (!profileId) {
    return {
      status: 'unauthorized',
      items: [],
      itemCount: 0,
      baseSubtotalCents: 0,
      subtotalCents: 0,
      discountTotalCents: 0,
    };
  }

  const client = getAdminClient();
  if (!client) {
    return {
      status: 'not_configured',
      items: [],
      itemCount: 0,
      baseSubtotalCents: 0,
      subtotalCents: 0,
      discountTotalCents: 0,
      message: toPublicDataErrorMessage(
        'Cart is temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const cartItemsResult = await client
    .from('cart_items')
    .select('*')
    .eq('user_id', profileId)
    .order('updated_at', { ascending: false });

  if (cartItemsResult.error) {
    return {
      status: 'error',
      items: [],
      itemCount: 0,
      baseSubtotalCents: 0,
      subtotalCents: 0,
      discountTotalCents: 0,
      message: toPublicDataErrorMessage(
        'Could not load cart right now.',
        cartItemsResult.error.message,
      ),
    };
  }

  const cartRows = (cartItemsResult.data ?? []) as CartItemRow[];
  if (cartRows.length === 0) {
    return {
      status: 'ok',
      items: [],
      itemCount: 0,
      baseSubtotalCents: 0,
      subtotalCents: 0,
      discountTotalCents: 0,
    };
  }

  const productIds = cartRows.map((item) => item.product_id);
  const products = await fetchProductsByIds(productIds);
  const productMap = new Map(products.map((product) => [product.id, product]));

  const items: CartProductItem[] = [];
  cartRows.forEach((item) => {
    const product = productMap.get(item.product_id);
    if (!product) {
      return;
    }

    const baseLineTotalCents = product.basePriceCents * item.quantity;
    const lineTotalCents = product.priceCents * item.quantity;
    const discountTotalCents = Math.max(0, baseLineTotalCents - lineTotalCents);
    items.push({
      id: item.id,
      quantity: item.quantity,
      baseLineTotalCents,
      lineTotalCents,
      discountTotalCents,
      product,
    });
  });

  const baseSubtotalCents = items.reduce((sum, item) => sum + item.baseLineTotalCents, 0);
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const discountTotalCents = items.reduce((sum, item) => sum + item.discountTotalCents, 0);
  const itemCount = items.length;

  return { status: 'ok', items, itemCount, baseSubtotalCents, subtotalCents, discountTotalCents };
}

export async function addProductToCartForProfile(
  profileId: string | null,
  productId: string,
  quantity = 1,
): Promise<MutationResult<{ quantity: number }>> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: 'invalid_quantity' };
  }

  const client = getAdminClient();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const productResult = await client
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('status', 'active')
    .maybeSingle();

  if (productResult.error || !productResult.data) {
    return { ok: false, error: 'product_not_found' };
  }

  const existingResult = await client
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', profileId)
    .eq('product_id', productId)
    .maybeSingle();

  if (existingResult.error) {
    return { ok: false, error: existingResult.error.message };
  }

  const existingCartItem = existingResult.data as Pick<CartItemRow, 'id' | 'quantity'> | null;
  if (existingCartItem?.id) {
    const nextQuantity = existingCartItem.quantity + quantity;

    const updateResult = await client
      .from('cart_items')
      .update({ quantity: nextQuantity } as never)
      .eq('id', existingCartItem.id)
      .eq('user_id', profileId);

    if (updateResult.error) {
      return { ok: false, error: updateResult.error.message };
    }

    return { ok: true, data: { quantity: nextQuantity } };
  }

  const insertResult = await client.from('cart_items').insert(
    {
      user_id: profileId,
      product_id: productId,
      quantity,
    } as never,
  );

  if (insertResult.error) {
    if (isDuplicateConstraintError(insertResult.error.message)) {
      const retryExistingResult = await client
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', profileId)
        .eq('product_id', productId)
        .maybeSingle();

      if (retryExistingResult.error) {
        return { ok: false, error: retryExistingResult.error.message };
      }

      const retryExistingCartItem = retryExistingResult.data as Pick<
        CartItemRow,
        'id' | 'quantity'
      > | null;
      if (!retryExistingCartItem?.id) {
        return { ok: false, error: insertResult.error.message };
      }

      const retryQuantity = retryExistingCartItem.quantity + quantity;
      const retryUpdateResult = await client
        .from('cart_items')
        .update({ quantity: retryQuantity } as never)
        .eq('id', retryExistingCartItem.id)
        .eq('user_id', profileId);

      if (retryUpdateResult.error) {
        return { ok: false, error: retryUpdateResult.error.message };
      }

      return { ok: true, data: { quantity: retryQuantity } };
    }

    return { ok: false, error: insertResult.error.message };
  }

  return { ok: true, data: { quantity } };
}

export async function updateCartItemQuantityForProfile(
  profileId: string | null,
  cartItemId: string,
  quantity: number,
): Promise<MutationResult<{ quantity: number }>> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const client = getAdminClient();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  if (!Number.isFinite(quantity)) {
    return { ok: false, error: 'invalid_quantity' };
  }

  if (quantity <= 0) {
    const removeResult = await client
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', profileId);

    if (removeResult.error) {
      return { ok: false, error: removeResult.error.message };
    }

    return { ok: true, data: { quantity: 0 } };
  }

  const updateResult = await client
    .from('cart_items')
    .update({ quantity } as never)
    .eq('id', cartItemId)
    .eq('user_id', profileId);

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message };
  }

  return { ok: true, data: { quantity } };
}

export async function removeCartItemForProfile(
  profileId: string | null,
  cartItemId: string,
): Promise<MutationResult> {
  if (!profileId) {
    return { ok: false, error: 'unauthorized' };
  }

  const client = getAdminClient();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const removeResult = await client
    .from('cart_items')
    .delete()
    .eq('id', cartItemId)
    .eq('user_id', profileId);

  if (removeResult.error) {
    return { ok: false, error: removeResult.error.message };
  }

  return { ok: true };
}

export async function getUserStoreSummaryForProfile(
  profileId: string | null,
): Promise<UserStoreSummary> {
  if (!profileId) {
    return {
      favoritesCount: 0,
      cartItemsCount: 0,
      cartQuantityTotal: 0,
    };
  }

  const client = getAdminClient();
  if (!client) {
    return {
      favoritesCount: 0,
      cartItemsCount: 0,
      cartQuantityTotal: 0,
    };
  }

  const [favoritesResult, cartResult] = await Promise.all([
    client.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', profileId),
    client.from('cart_items').select('quantity').eq('user_id', profileId),
  ]);

  const favoritesCount = favoritesResult.count ?? 0;
  const cartItems = (cartResult.data ?? []) as Pick<CartItemRow, 'quantity'>[];

  return {
    favoritesCount,
    cartItemsCount: cartItems.length,
    cartQuantityTotal: cartItems.reduce((sum, item) => sum + item.quantity, 0),
  };
}
