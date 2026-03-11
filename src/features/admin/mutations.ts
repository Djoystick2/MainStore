import 'server-only';

import { createSupabaseAdminClientOptional } from '@/lib/supabase';
import type { Database } from '@/types/db';
import { buildTaxonomyMetadata } from '@/features/catalog-taxonomy/metadata';

import type {
  CategoryUpsertInput,
  CollectionUpsertInput,
  OrderStatus,
  ProductImageUpsertInput,
  ProductStatus,
  ProductUpsertInput,
} from './types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];
type CollectionItemRow = Database['public']['Tables']['collection_items']['Row'];

const PRODUCT_STATUS_VALUES: ProductStatus[] = ['draft', 'active', 'archived'];
const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export interface MutationResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

function isSlugValid(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function normalizeText(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function parseNullableNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function mapDatabaseError(error: string | null | undefined, fallback: string): string {
  if (!error) {
    return fallback;
  }

  if (error.includes('duplicate key value') && error.includes('_slug_key')) {
    return 'slug_conflict';
  }

  return error;
}

function validateTaxonomyInput(
  input: CategoryUpsertInput | CollectionUpsertInput,
  kind: 'category' | 'collection',
): string | null {
  const normalizedTitle = normalizeText(input.title, 160);
  const normalizedSlug = normalizeText(input.slug, 120);

  if (!normalizedTitle) {
    return kind === 'category' ? 'category_title_required' : 'collection_title_required';
  }

  if (!isSlugValid(normalizedSlug)) {
    return kind === 'category' ? 'invalid_category_slug' : 'invalid_collection_slug';
  }

  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return kind === 'category' ? 'invalid_category_sort_order' : 'invalid_collection_sort_order';
  }

  if (kind === 'category') {
    const categoryInput = input as CategoryUpsertInput;
    const normalizedGroupSlug = normalizeText(categoryInput.catalogGroupSlug, 120);

    if (normalizedGroupSlug && !isSlugValid(normalizedGroupSlug)) {
      return 'invalid_catalog_group_slug';
    }

    if (
      categoryInput.catalogGroupOrder !== undefined &&
      (!Number.isInteger(categoryInput.catalogGroupOrder) || categoryInput.catalogGroupOrder < 0)
    ) {
      return 'invalid_catalog_group_order';
    }

    const normalizedArtworkUrl = normalizeText(categoryInput.catalogGroupArtworkUrl, 2000);
    if (normalizedArtworkUrl && !isHttpUrl(normalizedArtworkUrl)) {
      return 'invalid_catalog_group_artwork_url';
    }
  }

  return null;
}

function validateProductInput(input: ProductUpsertInput): string | null {
  if (!isSlugValid(normalizeText(input.slug, 120))) {
    return 'invalid_slug';
  }
  if (!normalizeText(input.title, 180)) {
    return 'title_required';
  }
  if (!PRODUCT_STATUS_VALUES.includes(input.status)) {
    return 'invalid_status';
  }
  if (!normalizeText(input.currency, 3)) {
    return 'currency_required';
  }
  if (!/^[A-Za-z]{3}$/.test(normalizeText(input.currency, 3))) {
    return 'invalid_currency';
  }
  if (!Number.isFinite(input.price) || input.price < 0) {
    return 'invalid_price';
  }
  const compareAtPrice = parseNullableNumber(input.compareAtPrice);
  if (compareAtPrice !== null && compareAtPrice < input.price) {
    return 'compare_at_price_less_than_price';
  }
  if (!Number.isInteger(input.stockQuantity) || input.stockQuantity < 0) {
    return 'invalid_stock_quantity';
  }
  return null;
}

function validateImageInput(input: ProductImageUpsertInput): string | null {
  const normalizedUrl = normalizeText(input.url, 2000);
  if (!normalizedUrl) {
    return 'image_url_required';
  }
  if (!isHttpUrl(normalizedUrl)) {
    return 'invalid_image_url';
  }
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0) {
    return 'invalid_sort_order';
  }
  return null;
}

async function getProductRow(
  productId: string,
): Promise<
  | { ok: true; product: ProductRow }
  | { ok: false; error: string }
> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const result = await client
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (result.error || !result.data) {
    return { ok: false, error: 'product_not_found' };
  }

  return { ok: true, product: result.data as ProductRow };
}

async function getUniqueDuplicateSlug(baseSlug: string): Promise<string | null> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return null;
  }

  const baseCandidate = `${normalizeText(baseSlug, 120)}-copy`.slice(0, 120);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
    const candidate = `${baseCandidate}${suffix}`.slice(0, 120);
    const result = await client
      .from('products')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (result.error) {
      return null;
    }

    if (!result.data) {
      return candidate;
    }
  }

  return null;
}

async function ensureCategoryExists(categoryId: string | null): Promise<boolean> {
  if (!categoryId) {
    return true;
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return false;
  }

  const result = await client
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();

  return !result.error && Boolean(result.data);
}

async function ensureCollectionExists(collectionId: string): Promise<boolean> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return false;
  }

  const result = await client
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .maybeSingle();

  return !result.error && Boolean(result.data);
}

async function clearOtherPrimaryImages(productId: string, exceptImageId?: string) {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return;
  }

  let query = client
    .from('product_images')
    .update({ is_primary: false } as never)
    .eq('product_id', productId)
    .eq('is_primary', true);

  if (exceptImageId) {
    query = query.neq('id', exceptImageId);
  }

  await query;
}

export async function createAdminProduct(
  input: ProductUpsertInput,
): Promise<MutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateProductInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const categoryId = input.categoryId ?? null;
  const categoryExists = await ensureCategoryExists(categoryId);
  if (!categoryExists) {
    return { ok: false, error: 'invalid_category' };
  }

  const payload = {
    slug: normalizeText(input.slug, 120),
    title: normalizeText(input.title, 180),
    short_description: normalizeText(input.shortDescription, 400) || null,
    description: normalizeText(input.description, 5000) || null,
    price: input.price,
    compare_at_price: parseNullableNumber(input.compareAtPrice),
    currency: normalizeText(input.currency, 3).toUpperCase(),
    status: input.status,
    is_featured: input.isFeatured,
    stock_quantity: input.stockQuantity,
    category_id: categoryId,
  };

  const result = await client
    .from('products')
    .insert(payload as never)
    .select('id')
    .single();
  const typedResult = result as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'create_product_failed'),
    };
  }

  return {
    ok: true,
    data: { id: typedResult.data.id },
  };
}

export async function updateAdminProduct(
  productId: string,
  input: ProductUpsertInput,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateProductInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const categoryId = input.categoryId ?? null;
  const categoryExists = await ensureCategoryExists(categoryId);
  if (!categoryExists) {
    return { ok: false, error: 'invalid_category' };
  }

  const payload = {
    slug: normalizeText(input.slug, 120),
    title: normalizeText(input.title, 180),
    short_description: normalizeText(input.shortDescription, 400) || null,
    description: normalizeText(input.description, 5000) || null,
    price: input.price,
    compare_at_price: parseNullableNumber(input.compareAtPrice),
    currency: normalizeText(input.currency, 3).toUpperCase(),
    status: input.status,
    is_featured: input.isFeatured,
    stock_quantity: input.stockQuantity,
    category_id: categoryId,
  };

  const result = await client
    .from('products')
    .update(payload as never)
    .eq('id', productId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'product_not_found'),
    };
  }

  return { ok: true };
}

export async function updateAdminProductStatus(
  productId: string,
  status: ProductStatus,
): Promise<MutationResult> {
  if (!PRODUCT_STATUS_VALUES.includes(status)) {
    return { ok: false, error: 'invalid_status' };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const result = await client
    .from('products')
    .update({ status } as never)
    .eq('id', productId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return { ok: false, error: typedResult.error?.message || 'product_not_found' };
  }

  return { ok: true };
}

export async function updateAdminProductFeatured(
  productId: string,
  isFeatured: boolean,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const result = await client
    .from('products')
    .update({ is_featured: isFeatured } as never)
    .eq('id', productId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return { ok: false, error: typedResult.error?.message || 'product_not_found' };
  }

  return { ok: true };
}

export async function duplicateAdminProduct(
  productId: string,
): Promise<MutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const productResult = await getProductRow(productId);
  if (!productResult.ok) {
    return { ok: false, error: productResult.error };
  }

  const duplicateSlug = await getUniqueDuplicateSlug(productResult.product.slug);
  if (!duplicateSlug) {
    return { ok: false, error: 'duplicate_slug_generation_failed' };
  }

  const duplicateTitle = normalizeText(`${productResult.product.title} Copy`, 180);
  const createResult = await client
    .from('products')
    .insert(
      {
        slug: duplicateSlug,
        title: duplicateTitle || 'Product copy',
        short_description: productResult.product.short_description,
        description: productResult.product.description,
        price: productResult.product.price,
        compare_at_price: productResult.product.compare_at_price,
        currency: productResult.product.currency,
        status: 'draft',
        is_featured: false,
        stock_quantity: productResult.product.stock_quantity,
        category_id: productResult.product.category_id,
      } as never,
    )
    .select('id')
    .single();
  const typedCreateResult = createResult as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedCreateResult.error || !typedCreateResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedCreateResult.error?.message, 'duplicate_product_failed'),
    };
  }

  const duplicateProductId = typedCreateResult.data.id;

  const [imagesResult, collectionItemsResult] = await Promise.all([
    client
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true }),
    client
      .from('collection_items')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order', { ascending: true }),
  ]);

  if (imagesResult.error) {
    return { ok: false, error: imagesResult.error.message };
  }

  if (collectionItemsResult.error) {
    return { ok: false, error: collectionItemsResult.error.message };
  }

  const imageRows = (imagesResult.data ?? []) as ProductImageRow[];
  if (imageRows.length > 0) {
    const imageInsertResult = await client
      .from('product_images')
      .insert(
        imageRows.map((row) => ({
          product_id: duplicateProductId,
          url: row.url,
          alt: row.alt,
          sort_order: row.sort_order,
          is_primary: row.is_primary,
        })) as never,
      );

    if (imageInsertResult.error) {
      await client.from('products').delete().eq('id', duplicateProductId);
      return { ok: false, error: imageInsertResult.error.message };
    }
  }

  const collectionItemRows = (collectionItemsResult.data ?? []) as CollectionItemRow[];
  if (collectionItemRows.length > 0) {
    const collectionInsertResult = await client
      .from('collection_items')
      .insert(
        collectionItemRows.map((row) => ({
          collection_id: row.collection_id,
          product_id: duplicateProductId,
          sort_order: row.sort_order,
        })) as never,
      );

    if (collectionInsertResult.error) {
      await client.from('product_images').delete().eq('product_id', duplicateProductId);
      await client.from('products').delete().eq('id', duplicateProductId);
      return { ok: false, error: collectionInsertResult.error.message };
    }
  }

  return {
    ok: true,
    data: { id: duplicateProductId },
  };
}

export async function deleteAdminProduct(
  productId: string,
): Promise<
  MutationResult<{
    detachedOrderItemsCount: number;
    removedImagesCount: number;
    removedCollectionLinksCount: number;
    removedFavoritesCount: number;
    removedCartItemsCount: number;
  }>
> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const productResult = await getProductRow(productId);
  if (!productResult.ok) {
    return { ok: false, error: productResult.error };
  }

  const [imagesCountResult, collectionCountResult, favoritesCountResult, cartItemsCountResult, orderItemsCountResult] =
    await Promise.all([
      client.from('product_images').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      client.from('collection_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      client.from('favorites').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      client.from('cart_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
      client.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', productId),
    ]);

  if (
    imagesCountResult.error ||
    collectionCountResult.error ||
    favoritesCountResult.error ||
    cartItemsCountResult.error ||
    orderItemsCountResult.error
  ) {
    return { ok: false, error: 'delete_precheck_failed' };
  }

  const detachOrderItemsResult = await client
    .from('order_items')
    .update({ product_id: null } as never)
    .eq('product_id', productId);
  if (detachOrderItemsResult.error) {
    return { ok: false, error: detachOrderItemsResult.error.message };
  }

  const [deleteDiscountResult, deleteCollectionsResult, deleteFavoritesResult, deleteCartItemsResult, deleteImagesResult] =
    await Promise.all([
      client.from('discounts').delete().eq('scope', 'product').eq('target_id', productId),
      client.from('collection_items').delete().eq('product_id', productId),
      client.from('favorites').delete().eq('product_id', productId),
      client.from('cart_items').delete().eq('product_id', productId),
      client.from('product_images').delete().eq('product_id', productId),
    ]);

  if (deleteDiscountResult.error) {
    return { ok: false, error: deleteDiscountResult.error.message };
  }
  if (deleteCollectionsResult.error) {
    return { ok: false, error: deleteCollectionsResult.error.message };
  }
  if (deleteFavoritesResult.error) {
    return { ok: false, error: deleteFavoritesResult.error.message };
  }
  if (deleteCartItemsResult.error) {
    return { ok: false, error: deleteCartItemsResult.error.message };
  }
  if (deleteImagesResult.error) {
    return { ok: false, error: deleteImagesResult.error.message };
  }

  const deleteProductResult = await client
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id')
    .maybeSingle();
  const typedDeleteProductResult = deleteProductResult as {
    data: Pick<ProductRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedDeleteProductResult.error || !typedDeleteProductResult.data) {
    return {
      ok: false,
      error: typedDeleteProductResult.error?.message || 'delete_product_failed',
    };
  }

  return {
    ok: true,
    data: {
      detachedOrderItemsCount: orderItemsCountResult.count ?? 0,
      removedImagesCount: imagesCountResult.count ?? 0,
      removedCollectionLinksCount: collectionCountResult.count ?? 0,
      removedFavoritesCount: favoritesCountResult.count ?? 0,
      removedCartItemsCount: cartItemsCountResult.count ?? 0,
    },
  };
}

export async function createAdminProductImage(
  productId: string,
  input: ProductImageUpsertInput,
): Promise<MutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateImageInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const productResult = await client
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle();

  if (productResult.error || !productResult.data) {
    return { ok: false, error: 'invalid_product' };
  }

  if (input.isPrimary) {
    await clearOtherPrimaryImages(productId);
  }

  const result = await client
    .from('product_images')
    .insert(
      {
        product_id: productId,
        url: normalizeText(input.url, 2000),
        alt: normalizeText(input.alt, 500) || null,
        sort_order: input.sortOrder,
        is_primary: input.isPrimary,
      } as never,
    )
    .select('id')
    .single();
  const typedResult = result as {
    data: Pick<ProductImageRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return { ok: false, error: typedResult.error?.message || 'create_image_failed' };
  }

  return {
    ok: true,
    data: { id: typedResult.data.id },
  };
}

export async function updateAdminProductImage(
  imageId: string,
  input: ProductImageUpsertInput,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateImageInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const imageResult = await client
    .from('product_images')
    .select('id, product_id')
    .eq('id', imageId)
    .maybeSingle();

  if (imageResult.error || !imageResult.data) {
    return { ok: false, error: 'image_not_found' };
  }

  const imageRow = imageResult.data as Pick<ProductImageRow, 'id' | 'product_id'>;
  if (input.isPrimary) {
    await clearOtherPrimaryImages(imageRow.product_id, imageId);
  }

  const updateResult = await client
    .from('product_images')
    .update(
      {
        url: normalizeText(input.url, 2000),
        alt: normalizeText(input.alt, 500) || null,
        sort_order: input.sortOrder,
        is_primary: input.isPrimary,
      } as never,
    )
    .eq('id', imageId);

  if (updateResult.error) {
    return { ok: false, error: updateResult.error.message };
  }

  return { ok: true };
}

export async function deleteAdminProductImage(imageId: string): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const imageResult = await client
    .from('product_images')
    .select('id, product_id, is_primary')
    .eq('id', imageId)
    .maybeSingle();

  if (imageResult.error || !imageResult.data) {
    return { ok: false, error: 'image_not_found' };
  }

  const imageRow = imageResult.data as Pick<ProductImageRow, 'id' | 'product_id' | 'is_primary'>;

  const removeResult = await client
    .from('product_images')
    .delete()
    .eq('id', imageId);

  if (removeResult.error) {
    return { ok: false, error: removeResult.error.message };
  }

  if (imageRow.is_primary) {
    const nextImageResult = await client
      .from('product_images')
      .select('id')
      .eq('product_id', imageRow.product_id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextImageResult.error && nextImageResult.data) {
      await client
        .from('product_images')
        .update({ is_primary: true } as never)
        .eq('id', (nextImageResult.data as Pick<ProductImageRow, 'id'>).id);
    }
  }

  return { ok: true };
}

export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<MutationResult> {
  if (!ORDER_STATUS_VALUES.includes(status)) {
    return { ok: false, error: 'invalid_order_status' };
  }

  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const orderResult = await client
    .from('orders')
    .select('id, status, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (orderResult.error || !orderResult.data) {
    return { ok: false, error: orderResult.error?.message || 'order_not_found' };
  }

  const orderRow = orderResult.data as Pick<
    Database['public']['Tables']['orders']['Row'],
    'id' | 'status' | 'payment_status'
  >;

  if (
    orderRow.payment_status !== 'paid' &&
    ['confirmed', 'processing', 'shipped', 'delivered'].includes(status)
  ) {
    return { ok: false, error: 'payment_not_completed' };
  }

  const result = await client
    .from('orders')
    .update({ status } as never)
    .eq('id', orderId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: { id: string } | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return { ok: false, error: typedResult.error?.message || 'order_not_found' };
  }

  return { ok: true };
}

export async function createAdminCategory(
  input: CategoryUpsertInput,
): Promise<MutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateTaxonomyInput(input, 'category');
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const result = await client
    .from('categories')
    .insert(
      {
        title: normalizeText(input.title, 160),
        slug: normalizeText(input.slug, 120),
        description: normalizeText(input.description, 600) || null,
        is_active: input.isActive,
        metadata: buildTaxonomyMetadata({
          shortText: input.shortText,
          displayOrder: input.sortOrder,
          catalogGroupSlug: input.catalogGroupSlug,
          catalogGroupTitle: input.catalogGroupTitle,
          catalogGroupDescription: input.catalogGroupDescription,
          catalogGroupOrder: input.catalogGroupOrder,
          catalogVisible: input.catalogVisible,
          catalogVisual: input.catalogVisual,
          catalogGroupArtworkUrl: input.catalogGroupArtworkUrl,
        }),
      } as never,
    )
    .select('id')
    .single();
  const typedResult = result as {
    data: Pick<CategoryRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'create_category_failed'),
    };
  }

  return {
    ok: true,
    data: { id: typedResult.data.id },
  };
}

export async function updateAdminCategory(
  categoryId: string,
  input: CategoryUpsertInput,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateTaxonomyInput(input, 'category');
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const result = await client
    .from('categories')
    .update(
      {
        title: normalizeText(input.title, 160),
        slug: normalizeText(input.slug, 120),
        description: normalizeText(input.description, 600) || null,
        is_active: input.isActive,
        metadata: buildTaxonomyMetadata({
          shortText: input.shortText,
          displayOrder: input.sortOrder,
          catalogGroupSlug: input.catalogGroupSlug,
          catalogGroupTitle: input.catalogGroupTitle,
          catalogGroupDescription: input.catalogGroupDescription,
          catalogGroupOrder: input.catalogGroupOrder,
          catalogVisible: input.catalogVisible,
          catalogVisual: input.catalogVisual,
          catalogGroupArtworkUrl: input.catalogGroupArtworkUrl,
        }),
      } as never,
    )
    .eq('id', categoryId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: Pick<CategoryRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'category_not_found'),
    };
  }

  return { ok: true };
}

export async function deleteAdminCategory(
  categoryId: string,
): Promise<MutationResult<{ detachedProductsCount: number }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const categoryResult = await client
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();

  if (categoryResult.error || !categoryResult.data) {
    return { ok: false, error: 'category_not_found' };
  }

  const linkedProductsResult = await client
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', categoryId);

  if (linkedProductsResult.error) {
    return { ok: false, error: 'category_delete_precheck_failed' };
  }

  const detachProductsResult = await client
    .from('products')
    .update({ category_id: null } as never)
    .eq('category_id', categoryId);

  if (detachProductsResult.error) {
    return { ok: false, error: detachProductsResult.error.message };
  }

  const deleteDiscountResult = await client
    .from('discounts')
    .delete()
    .eq('scope', 'category')
    .eq('target_id', categoryId);

  if (deleteDiscountResult.error) {
    return { ok: false, error: deleteDiscountResult.error.message };
  }

  const deleteResult = await client
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .select('id')
    .maybeSingle();
  const typedDeleteResult = deleteResult as {
    data: Pick<CategoryRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedDeleteResult.error || !typedDeleteResult.data) {
    return { ok: false, error: typedDeleteResult.error?.message || 'delete_category_failed' };
  }

  return {
    ok: true,
    data: {
      detachedProductsCount: linkedProductsResult.count ?? 0,
    },
  };
}

export async function createAdminCollection(
  input: CollectionUpsertInput,
): Promise<MutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateTaxonomyInput(input, 'collection');
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const result = await client
    .from('collections')
    .insert(
      {
        title: normalizeText(input.title, 160),
        slug: normalizeText(input.slug, 120),
        description: normalizeText(input.description, 600) || null,
        is_active: input.isActive,
        metadata: buildTaxonomyMetadata({
          shortText: input.shortText,
          displayOrder: input.sortOrder,
          isFeatured: input.isFeatured,
        }),
      } as never,
    )
    .select('id')
    .single();
  const typedResult = result as {
    data: Pick<CollectionRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'create_collection_failed'),
    };
  }

  return {
    ok: true,
    data: { id: typedResult.data.id },
  };
}

export async function updateAdminCollection(
  collectionId: string,
  input: CollectionUpsertInput,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateTaxonomyInput(input, 'collection');
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const result = await client
    .from('collections')
    .update(
      {
        title: normalizeText(input.title, 160),
        slug: normalizeText(input.slug, 120),
        description: normalizeText(input.description, 600) || null,
        is_active: input.isActive,
        metadata: buildTaxonomyMetadata({
          shortText: input.shortText,
          displayOrder: input.sortOrder,
          isFeatured: input.isFeatured,
        }),
      } as never,
    )
    .eq('id', collectionId)
    .select('id')
    .maybeSingle();
  const typedResult = result as {
    data: Pick<CollectionRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDatabaseError(typedResult.error?.message, 'collection_not_found'),
    };
  }

  return { ok: true };
}

export async function deleteAdminCollection(
  collectionId: string,
): Promise<MutationResult<{ removedProductLinksCount: number }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const collectionResult = await client
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .maybeSingle();

  if (collectionResult.error || !collectionResult.data) {
    return { ok: false, error: 'collection_not_found' };
  }

  const linkedItemsResult = await client
    .from('collection_items')
    .select('id', { count: 'exact', head: true })
    .eq('collection_id', collectionId);

  if (linkedItemsResult.error) {
    return { ok: false, error: 'collection_delete_precheck_failed' };
  }

  const deleteLinksResult = await client
    .from('collection_items')
    .delete()
    .eq('collection_id', collectionId);

  if (deleteLinksResult.error) {
    return { ok: false, error: deleteLinksResult.error.message };
  }

  const deleteDiscountResult = await client
    .from('discounts')
    .delete()
    .eq('scope', 'collection')
    .eq('target_id', collectionId);

  if (deleteDiscountResult.error) {
    return { ok: false, error: deleteDiscountResult.error.message };
  }

  const deleteResult = await client
    .from('collections')
    .delete()
    .eq('id', collectionId)
    .select('id')
    .maybeSingle();
  const typedDeleteResult = deleteResult as {
    data: Pick<CollectionRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedDeleteResult.error || !typedDeleteResult.data) {
    return { ok: false, error: typedDeleteResult.error?.message || 'delete_collection_failed' };
  }

  return {
    ok: true,
    data: {
      removedProductLinksCount: linkedItemsResult.count ?? 0,
    },
  };
}

export async function upsertAdminProductCollection(
  productId: string,
  collectionId: string,
  sortOrder: number,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    return { ok: false, error: 'invalid_collection_sort_order' };
  }

  const productResult = await getProductRow(productId);
  if (!productResult.ok) {
    return { ok: false, error: productResult.error };
  }

  const collectionExists = await ensureCollectionExists(collectionId);
  if (!collectionExists) {
    return { ok: false, error: 'collection_not_found' };
  }

  const result = await client
    .from('collection_items')
    .upsert(
      {
        collection_id: collectionId,
        product_id: productId,
        sort_order: sortOrder,
      } as never,
      { onConflict: 'collection_id,product_id' },
    );

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  return { ok: true };
}

export async function deleteAdminProductCollection(
  productId: string,
  collectionId: string,
): Promise<MutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const result = await client
    .from('collection_items')
    .delete()
    .eq('product_id', productId)
    .eq('collection_id', collectionId);

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  return { ok: true };
}
