import { cache } from 'react';
import {
  createSupabaseServerClientOptional,
} from '@/lib/supabase';
import { findStoreProduct, storeProducts } from '@/components/store/mock-products';
import type { StoreCollectionLink, StoreProduct, StoreProductMedia, StoreStockState } from '@/components/store/types';
import type { Database } from '@/types/db';
import { parseTaxonomyMetadata } from '@/features/catalog-taxonomy/metadata';
import { resolvePricingForProducts } from '@/features/pricing';
import { buildProductPresentation } from '@/features/storefront/product-presentation';

import {
  buildStorefrontPromoBanners,
  buildStorefrontMiniShelves,
  type StorefrontMiniShelf,
  type StorefrontPromoBanner,
} from './marketing';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductImageRow = Database['public']['Tables']['product_images']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];
type CollectionItemRow = Database['public']['Tables']['collection_items']['Row'];
type ProductListRow = Pick<
  ProductRow,
  | 'id'
  | 'category_id'
  | 'slug'
  | 'title'
  | 'short_description'
  | 'description'
  | 'price'
  | 'compare_at_price'
  | 'currency'
  | 'is_featured'
  | 'stock_quantity'
  | 'created_at'
>;
type ProductImageListRow = Pick<
  ProductImageRow,
  'id' | 'product_id' | 'url' | 'alt' | 'sort_order' | 'is_primary' | 'created_at'
>;
type CollectionListRow = Pick<
  CollectionRow,
  'id' | 'slug' | 'title' | 'description' | 'metadata' | 'updated_at'
>;
type CollectionItemListRow = Pick<
  CollectionItemRow,
  'collection_id' | 'product_id' | 'sort_order' | 'created_at'
>;

interface ProductDiscoverySignal {
  favoritesCount: number;
  cartCount: number;
  orderCount: number;
  popularityScore: number;
}

const fallbackGradients = [
  'linear-gradient(135deg, #9fb8ff 0%, #5f7de8 100%)',
  'linear-gradient(135deg, #9ce6d7 0%, #37b59b 100%)',
  'linear-gradient(135deg, #f7d8a7 0%, #d6a85b 100%)',
  'linear-gradient(135deg, #b5d3fb 0%, #4d8ddd 100%)',
  'linear-gradient(135deg, #f7e5b9 0%, #d4bb78 100%)',
  'linear-gradient(135deg, #c2c4fb 0%, #7278e4 100%)',
];

const fallbackCategories: StorefrontCategory[] = [
  { id: 'all', slug: 'all', title: 'Все' },
  { id: 'essentials', slug: 'essentials', title: 'База' },
  { id: 'home', slug: 'home', title: 'Дом' },
  { id: 'tech', slug: 'tech', title: 'Техника' },
];

const presentationCategoryPool: StorefrontCategory[] = [
  { id: 'hoodies', slug: 'hoodies', title: 'Худи', description: 'Мягкие модели на каждый день' },
  { id: 'jackets', slug: 'jackets', title: 'Куртки', description: 'Городские верхние слои' },
  { id: 'tshirts', slug: 'tshirts', title: 'Футболки', description: 'Базовые и акцентные модели' },
  { id: 'shirts', slug: 'shirts', title: 'Рубашки', description: 'Чистые силуэты и фактуры' },
  { id: 'pants', slug: 'pants', title: 'Брюки', description: 'Повседневные и свободные силуэты' },
  { id: 'sneakers', slug: 'sneakers', title: 'Кроссовки', description: 'Лёгкие пары на каждый день' },
  { id: 'bags', slug: 'bags', title: 'Сумки', description: 'Небольшие и готовые к поездкам' },
  { id: 'backpacks', slug: 'backpacks', title: 'Рюкзаки', description: 'Работа, город и поездки' },
  { id: 'accessories', slug: 'accessories', title: 'Аксессуары', description: 'Финальные детали образа' },
  { id: 'home-living', slug: 'home-living', title: 'Дом', description: 'Уютные предметы для пространства' },
  { id: 'lighting', slug: 'lighting', title: 'Свет', description: 'Лампы и мягкое освещение' },
  { id: 'kitchen', slug: 'kitchen', title: 'Кухня', description: 'Практичные предметы на каждый день' },
  { id: 'audio', slug: 'audio', title: 'Аудио', description: 'Колонки и звуковые сценарии' },
  { id: 'chargers', slug: 'chargers', title: 'Зарядка', description: 'Кабели, блоки и дорожные наборы' },
  { id: 'wellness', slug: 'wellness', title: 'Уход', description: 'Бутылки, уход и ритм дня' },
  { id: 'travel', slug: 'travel', title: 'Путешествия', description: 'Компактные вещи в дорогу' },
  { id: 'stationery', slug: 'stationery', title: 'Канцелярия', description: 'Блокноты и вещи для рабочего стола' },
  { id: 'sport', slug: 'sport', title: 'Спорт', description: 'Вещи для активного режима' },
  { id: 'kids', slug: 'kids', title: 'Детское', description: 'Мягкие решения на каждый день' },
  { id: 'gifts', slug: 'gifts', title: 'Подарки', description: 'Готовые идеи и наборы' },
];

const catalogPresentationCategories: StorefrontCategory[] = [
  { id: 'all', slug: 'all', title: 'Все' },
  ...presentationCategoryPool,
  ...fallbackCategories.filter(
    (category) =>
      category.id !== 'all' && !presentationCategoryPool.some((item) => item.slug === category.slug),
  ),
];

const fallbackCollectionDefinitions = [
  {
    id: 'fallback-featured',
    slug: 'featured',
    title: 'Рекомендуемое',
    description: 'Подборка товаров, с которых удобно начать.',
    start: 0,
    size: 4,
  },
  {
    id: 'fallback-fresh',
    slug: 'fresh-drops',
    title: 'Новые поступления',
    description: 'Свежие позиции, которые уже доступны к заказу.',
    start: 2,
    size: 4,
  },
  {
    id: 'fallback-daily',
    slug: 'daily-setup',
    title: 'На каждый день',
    description: 'Сбалансированная подборка для дома и повседневных задач.',
    start: 1,
    size: 4,
  },
] as const;

function withDevDetails(message: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${message} Подробности: ${details}`;
  }

  return message;
}

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

  const normalized = Math.abs(hash) % fallbackGradients.length;
  return fallbackGradients[normalized];
}

function buildLabel(title: string): string {
  const words = title.split(' ').filter(Boolean);
  if (words.length === 0) {
    return 'Товар';
  }
  return words.slice(0, 2).join(' ');
}

function withPresentationCategories(categories: StorefrontCategory[]): StorefrontCategory[] {
  const actual = categories.filter((category) => category.id !== 'all');
  if (actual.length > 0) {
    return [{ id: 'all', slug: 'all', title: 'Все' }, ...actual];
  }
  const actualSlugs = new Set(actual.map((category) => category.slug));
  const missing = presentationCategoryPool
    .filter((category) => !actualSlugs.has(category.slug))
    .map((category) => ({ ...category, isPresentationOnly: true }));

  return [{ id: 'all', slug: 'all', title: 'Все' }, ...actual, ...missing].slice(0, 21);
}


function getStockState(stockQuantity: number | null | undefined): StoreStockState {
  if (!Number.isFinite(stockQuantity)) {
    return 'unknown';
  }

  if (Number(stockQuantity) <= 0) {
    return 'out_of_stock';
  }

  if (Number(stockQuantity) <= 3) {
    return 'low_stock';
  }

  return 'in_stock';
}

function mapImagesByProductId(rows: ProductImageListRow[]): Map<string, ProductImageListRow[]> {
  const byProductId = new Map<string, ProductImageListRow[]>();

  rows.forEach((row) => {
    const bucket = byProductId.get(row.product_id);
    if (bucket) {
      bucket.push(row);
      return;
    }
    byProductId.set(row.product_id, [row]);
  });

  byProductId.forEach((images, productId) => {
    byProductId.set(
      productId,
      [...images].sort((left, right) => {
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

  return byProductId;
}

async function fetchProductDiscoverySignals(
  client: NonNullable<ReturnType<typeof createSupabaseServerClientOptional>>,
  productIds: string[],
): Promise<Map<string, ProductDiscoverySignal>> {
  const signals = new Map<string, ProductDiscoverySignal>();
  if (productIds.length === 0) {
    return signals;
  }

  const [favoritesResult, cartItemsResult, orderItemsResult] = await Promise.all([
    client.from('favorites').select('product_id').in('product_id', productIds),
    client.from('cart_items').select('product_id, quantity').in('product_id', productIds),
    client.from('order_items').select('product_id, quantity').in('product_id', productIds),
  ]);

  if (favoritesResult.error) {
    throw new Error(favoritesResult.error.message);
  }
  if (cartItemsResult.error) {
    throw new Error(cartItemsResult.error.message);
  }
  if (orderItemsResult.error) {
    throw new Error(orderItemsResult.error.message);
  }

  const apply = (productId: string | null, updater: (signal: ProductDiscoverySignal) => void) => {
    if (!productId) {
      return;
    }

    const signal = signals.get(productId) ?? {
      favoritesCount: 0,
      cartCount: 0,
      orderCount: 0,
      popularityScore: 0,
    };

    updater(signal);
    signal.popularityScore = signal.favoritesCount + signal.cartCount + signal.orderCount;
    signals.set(productId, signal);
  };

  (favoritesResult.data ?? []).forEach((row) => {
    apply((row as { product_id: string | null }).product_id, (signal) => {
      signal.favoritesCount += 1;
    });
  });

  (cartItemsResult.data ?? []).forEach((row) => {
    const typedRow = row as { product_id: string | null; quantity: number | null };
    apply(typedRow.product_id, (signal) => {
      signal.cartCount += Number(typedRow.quantity) || 0;
    });
  });

  (orderItemsResult.data ?? []).forEach((row) => {
    const typedRow = row as { product_id: string | null; quantity: number | null };
    apply(typedRow.product_id, (signal) => {
      signal.orderCount += Number(typedRow.quantity) || 0;
    });
  });

  return signals;
}

async function buildProductContext(
  client: NonNullable<ReturnType<typeof createSupabaseServerClientOptional>>,
  rows: ProductListRow[],
  images: ProductImageListRow[],
) {
  const productIds = rows.map((row) => row.id);
  const categoryIds = Array.from(
    new Set(rows.map((row) => row.category_id).filter((value): value is string => Boolean(value))),
  );
  const imageMap = mapImagesByProductId(images);

  const [pricingByProductId, signalsByProductId, categoriesResult, collectionItemsResult] = await Promise.all([
    resolvePricingForProducts(client, rows),
    fetchProductDiscoverySignals(client, productIds),
    categoryIds.length > 0
      ? client.from('categories').select('id, title').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from('collection_items')
      .select('collection_id, product_id, sort_order, created_at')
      .in('product_id', productIds),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }
  if (collectionItemsResult.error) {
    throw new Error(collectionItemsResult.error.message);
  }

  const categoryTitleById = new Map(
    ((categoriesResult.data ?? []) as Array<Pick<CategoryRow, 'id' | 'title'>>).map((row) => [row.id, row.title]),
  );

  const collectionItems = (collectionItemsResult.data ?? []) as CollectionItemListRow[];
  const collectionIds = Array.from(new Set(collectionItems.map((item) => item.collection_id)));
  let collectionById = new Map<string, StoreCollectionLink>();

  if (collectionIds.length > 0) {
    const collectionsResult = await client
      .from('collections')
      .select('id, slug, title')
      .in('id', collectionIds)
      .eq('is_active', true);

    if (collectionsResult.error) {
      throw new Error(collectionsResult.error.message);
    }

    collectionById = new Map(
      ((collectionsResult.data ?? []) as Array<Pick<CollectionRow, 'id' | 'slug' | 'title'>>).map((row) => [
        row.id,
        { id: row.id, slug: row.slug, title: row.title },
      ]),
    );
  }

  const collectionsByProductId = new Map<string, StoreCollectionLink[]>();
  [...collectionItems]
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }
      return left.created_at.localeCompare(right.created_at);
    })
    .forEach((item) => {
      const collection = collectionById.get(item.collection_id);
      if (!collection) {
        return;
      }

      const bucket = collectionsByProductId.get(item.product_id) ?? [];
      if (!bucket.some((entry) => entry.id === collection.id)) {
        bucket.push(collection);
        collectionsByProductId.set(item.product_id, bucket);
      }
    });

  return {
    imageMap,
    pricingByProductId,
    signalsByProductId,
    categoryTitleById,
    collectionsByProductId,
  };
}

async function mapProductRows(
  client: NonNullable<ReturnType<typeof createSupabaseServerClientOptional>>,
  rows: ProductListRow[],
  images: ProductImageListRow[],
): Promise<StoreProduct[]> {
  if (rows.length === 0) {
    return [];
  }

  const context = await buildProductContext(client, rows, images);

  return rows.map((row) => {
    const mediaRows = context.imageMap.get(row.id) ?? [];
    const primaryImage = mediaRows[0] ?? null;
    const media: StoreProductMedia[] = mediaRows.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      isPrimary: image.is_primary,
      sortOrder: image.sort_order,
    }));
    const pricing = context.pricingByProductId.get(row.id);
    const signal = context.signalsByProductId.get(row.id);
    const basePrice = pricing?.basePrice ?? Number(row.price) ?? 0;
    const effectivePrice = pricing?.effectivePrice ?? basePrice;
    const compareAtPrice =
      pricing?.compareAtPrice ?? (row.compare_at_price ? Number(row.compare_at_price) : null);
    const stockQuantity = Number.isFinite(row.stock_quantity) ? Number(row.stock_quantity) : null;

    const product = {
      id: row.id,
      slug: row.slug,
      title: row.title,
      shortDescription: row.short_description,
      description:
        row.short_description ||
        row.description ||
        'Описание товара скоро появится.',
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
      categoryTitle: row.category_id ? context.categoryTitleById.get(row.category_id) ?? null : null,
      stockQuantity: stockQuantity === null ? undefined : stockQuantity,
      stockState: getStockState(stockQuantity),
      popularityScore: signal?.popularityScore ?? 0,
      media,
      collections: context.collectionsByProductId.get(row.id) ?? [],
    };

    return {
      ...product,
      presentation: buildProductPresentation(product),
    };
  });
}

async function fetchActiveProductsByIds(productIds: string[]): Promise<StoreProduct[]> {

  if (productIds.length === 0) {
    return [];
  }

  const client = createSupabaseServerClientOptional();
  if (!client) {
    return [];
  }

  const { data: productRows, error: productsError } = await client
    .from('products')
    .select(
      'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
    )
    .eq('status', 'active')
    .in('id', productIds);

  if (productsError || !productRows || productRows.length === 0) {
    return [];
  }
  const typedProductRows = productRows as ProductListRow[];

  const { data: imageRows, error: imagesError } = await client
    .from('product_images')
    .select('id, product_id, url, alt, sort_order, is_primary, created_at')
    .in(
      'product_id',
      typedProductRows.map((row) => row.id),
    )
    .order('sort_order', { ascending: true });

  if (imagesError) {
    return [];
  }

  const mapped = await mapProductRows(
    client,
    typedProductRows,
    (imageRows ?? []) as ProductImageListRow[],
  );
  const mappedById = new Map(mapped.map((product) => [product.id, product]));

  return productIds
    .map((id) => mappedById.get(id))
    .filter((product): product is StoreProduct => Boolean(product));
}

async function fetchActiveProducts(limit?: number) {
  const client = createSupabaseServerClientOptional();

  if (!client) {
    return { kind: 'no_env' as const };
  }

  const baseQuery = client
    .from('products')
    .select(
      'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
    )
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const { data: productRows, error: productsError } =
    limit && limit > 0 ? await baseQuery.limit(limit) : await baseQuery;

  if (productsError) {
    return { kind: 'error' as const, message: productsError.message };
  }

  const rows = (productRows ?? []) as ProductListRow[];
  if (rows.length === 0) {
    return { kind: 'ok' as const, products: [] as StoreProduct[] };
  }

  const { data: imageRows, error: imagesError } = await client
    .from('product_images')
    .select('id, product_id, url, alt, sort_order, is_primary, created_at')
    .in(
      'product_id',
      rows.map((row) => row.id),
    )
    .order('sort_order', { ascending: true });

  if (imagesError) {
    return { kind: 'error' as const, message: imagesError.message };
  }

  return {
    kind: 'ok' as const,
    products: await mapProductRows(client, rows, (imageRows ?? []) as ProductImageListRow[]),
  };
}

function buildFallbackCollections(products: StoreProduct[]): StorefrontCollection[] {
  const source = products.length > 0 ? products : storeProducts;

  return fallbackCollectionDefinitions
    .map((definition) => ({
      id: definition.id,
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      products: source.slice(definition.start, definition.start + definition.size),
    }))
    .filter((collection) => collection.products.length > 0);
}

async function fetchActiveCollections(
  products: StoreProduct[],
): Promise<StorefrontCollection[]> {
  const client = createSupabaseServerClientOptional();
  if (!client) {
    return buildFallbackCollections(products);
  }

  const { data: collectionRows, error: collectionsError } = await client
    .from('collections')
    .select('id, slug, title, description, metadata, updated_at')
    .eq('is_active', true)
    .limit(12);

  if (collectionsError || !collectionRows || collectionRows.length === 0) {
    return buildFallbackCollections(products);
  }

  const rows = (collectionRows as CollectionListRow[]).sort((left, right) => {
    const leftMeta = parseTaxonomyMetadata(left.metadata);
    const rightMeta = parseTaxonomyMetadata(right.metadata);
    if (leftMeta.isFeatured !== rightMeta.isFeatured) {
      return leftMeta.isFeatured ? -1 : 1;
    }
    if (leftMeta.displayOrder !== rightMeta.displayOrder) {
      return leftMeta.displayOrder - rightMeta.displayOrder;
    }
    return right.updated_at.localeCompare(left.updated_at);
  });
  const collectionIds = rows.map((row) => row.id);

  const { data: itemRows, error: itemsError } = await client
    .from('collection_items')
    .select('collection_id, product_id, sort_order, created_at')
    .in('collection_id', collectionIds)
    .order('sort_order', { ascending: true });

  if (itemsError || !itemRows || itemRows.length === 0) {
    return buildFallbackCollections(products);
  }

  const items = (itemRows ?? []) as CollectionItemListRow[];
  const itemsByCollection = new Map<string, CollectionItemListRow[]>();

  items.forEach((item) => {
    const bucket = itemsByCollection.get(item.collection_id);
    if (bucket) {
      bucket.push(item);
      return;
    }

    itemsByCollection.set(item.collection_id, [item]);
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const missingProductIds = Array.from(
    new Set(
      items
        .map((item) => item.product_id)
        .filter((productId) => !productMap.has(productId)),
    ),
  );

  if (missingProductIds.length > 0) {
    const missingProducts = await fetchActiveProductsByIds(missingProductIds);
    missingProducts.forEach((product) => {
      productMap.set(product.id, product);
    });
  }

  const mapped = rows
    .map((collection) => {
      const collectionItems = [...(itemsByCollection.get(collection.id) ?? [])].sort(
        (left, right) => {
          if (left.sort_order !== right.sort_order) {
            return left.sort_order - right.sort_order;
          }

          return left.created_at.localeCompare(right.created_at);
        },
      );

      const collectionProducts = collectionItems
        .map((item) => productMap.get(item.product_id))
        .filter((product): product is StoreProduct => Boolean(product))
        .slice(0, 8);

      return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        description: parseTaxonomyMetadata(collection.metadata).shortText ?? collection.description,
        isFeatured: parseTaxonomyMetadata(collection.metadata).isFeatured,
        products: collectionProducts,
      };
    })
    .filter((collection) => collection.products.length > 0)
    .slice(0, 8);

  if (mapped.length === 0) {
    return buildFallbackCollections(products);
  }

  return mapped;
}

async function fetchActiveCategories(): Promise<StorefrontCategory[]> {
  const client = createSupabaseServerClientOptional();
  if (!client) {
    return catalogPresentationCategories;
  }

  const { data, error } = await client
    .from('categories')
    .select('id, slug, title, description, metadata')
    .eq('is_active', true);

  if (error || !data || data.length === 0) {
    return catalogPresentationCategories;
  }

  return withPresentationCategories([
    { id: 'all', slug: 'all', title: 'Все' },
    ...(data as Array<Pick<CategoryRow, 'id' | 'slug' | 'title' | 'description' | 'metadata'>>)
      .sort((left, right) => {
        const leftMeta = parseTaxonomyMetadata(left.metadata);
        const rightMeta = parseTaxonomyMetadata(right.metadata);
        if (leftMeta.displayOrder !== rightMeta.displayOrder) {
          return leftMeta.displayOrder - rightMeta.displayOrder;
        }
        return left.title.localeCompare(right.title);
      })
      .map((row) => {
        const metadata = parseTaxonomyMetadata(row.metadata);

        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          description: metadata.shortText ?? row.description,
          sortOrder: metadata.displayOrder,
          catalogGroupSlug: metadata.catalogGroupSlug,
          catalogGroupTitle: metadata.catalogGroupTitle,
          catalogGroupDescription: metadata.catalogGroupDescription,
          catalogGroupOrder: metadata.catalogGroupOrder,
          catalogVisible: metadata.catalogVisible,
          catalogVisual: metadata.catalogVisual,
          catalogGroupArtworkUrl: metadata.catalogGroupArtworkUrl,
        };
      }),
  ]);
}

export interface StorefrontCategory {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  isPresentationOnly?: boolean;
  sortOrder?: number;
  catalogGroupSlug?: string | null;
  catalogGroupTitle?: string | null;
  catalogGroupDescription?: string | null;
  catalogGroupOrder?: number;
  catalogVisible?: boolean;
  catalogVisual?: string | null;
  catalogGroupArtworkUrl?: string | null;
}

export interface StorefrontCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isFeatured?: boolean;
  products: StoreProduct[];
}

export interface HomeStorefrontDataResult {
  status: 'live' | 'empty' | 'fallback_env' | 'fallback_error';
  featuredProducts: StoreProduct[];
  latestProducts: StoreProduct[];
  popularProducts: StoreProduct[];
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  promoBanners: StorefrontPromoBanner[];
  miniShelves: StorefrontMiniShelf[];
  message?: string;
}

export interface CatalogStorefrontDataResult {
  status: 'live' | 'empty' | 'fallback_env' | 'fallback_error';
  products: StoreProduct[];
  categories: StorefrontCategory[];
  collections: StorefrontCollection[];
  promoBanners: StorefrontPromoBanner[];
  message?: string;
}

export interface ProductStorefrontDataResult {
  status:
    | 'live'
    | 'not_found'
    | 'fallback_env'
    | 'fallback_error'
    | 'error';
  product: StoreProduct | null;
  relatedProducts: StoreProduct[];
  message?: string;
}

export async function getHomeStorefrontData(): Promise<HomeStorefrontDataResult> {
  const [activeProductsResult, categories] = await Promise.all([
    fetchActiveProducts(24),
    fetchActiveCategories(),
  ]);

  if (activeProductsResult.kind === 'no_env') {
    const fallbackProducts = storeProducts;
    const collections = buildFallbackCollections(fallbackProducts);

    return {
      status: 'fallback_env',
      featuredProducts: fallbackProducts.slice(0, 4),
      latestProducts: fallbackProducts.slice(4, 8),
      popularProducts: fallbackProducts.slice(1, 5),
      categories,
      collections,
      promoBanners: buildStorefrontPromoBanners(fallbackProducts, categories),
      miniShelves: buildStorefrontMiniShelves({
        featuredProducts: fallbackProducts.slice(0, 4),
        latestProducts: fallbackProducts.slice(4, 8),
        popularProducts: fallbackProducts.slice(1, 5),
        discountProducts: fallbackProducts.filter((product) => Boolean(product.appliedDiscount)),
        collections,
      }),
      message:
        'Источник данных магазина пока не настроен. Показываем безопасный локальный превью-режим витрины.',
    };
  }

  if (activeProductsResult.kind === 'error') {
    const fallbackProducts = storeProducts;
    const collections = buildFallbackCollections(fallbackProducts);

    return {
      status: 'fallback_error',
      featuredProducts: fallbackProducts.slice(0, 4),
      latestProducts: fallbackProducts.slice(4, 8),
      popularProducts: fallbackProducts.slice(1, 5),
      categories,
      collections,
      promoBanners: buildStorefrontPromoBanners(fallbackProducts, categories),
      miniShelves: buildStorefrontMiniShelves({
        featuredProducts: fallbackProducts.slice(0, 4),
        latestProducts: fallbackProducts.slice(4, 8),
        popularProducts: fallbackProducts.slice(1, 5),
        discountProducts: fallbackProducts.filter((product) => Boolean(product.appliedDiscount)),
        collections,
      }),
      message: withDevDetails(
        'Данные магазина временно недоступны. Показываем безопасный локальный превью-режим витрины.',
        activeProductsResult.message,
      ),
    };
  }

  const products = activeProductsResult.products;
  const promoBanners = buildStorefrontPromoBanners(products, categories);

  if (products.length === 0) {
    return {
      status: 'empty',
      featuredProducts: [],
      latestProducts: [],
      popularProducts: [],
      categories,
      collections: [],
      promoBanners,
      miniShelves: [],
      message: 'Пока нет активных товаров. Опубликуйте товары в админке, чтобы заполнить витрину.',
    };
  }

  const collections = await fetchActiveCollections(products);

  const featuredCandidates = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredProducts = featuredCandidates.length > 0 ? featuredCandidates : products.slice(0, 4);
  const featuredIds = new Set(featuredProducts.map((product) => product.id));
  const latestProducts = products.filter((product) => !featuredIds.has(product.id)).slice(0, 4);
  const latestResolved = latestProducts.length > 0 ? latestProducts : products.slice(0, 4);
  const latestIds = new Set(latestResolved.map((product) => product.id));
  const popularCandidates = [...products]
    .filter((product) => !featuredIds.has(product.id) && !latestIds.has(product.id))
    .sort((left, right) => {
      const popularityDelta = (right.popularityScore ?? 0) - (left.popularityScore ?? 0);
      if (popularityDelta !== 0) {
        return popularityDelta;
      }
      return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
    });
  const popularResolved =
    popularCandidates.length > 0
      ? popularCandidates.slice(0, 4)
      : [...products]
          .filter((product) => !featuredIds.has(product.id))
          .sort((left, right) => {
            const popularityDelta = (right.popularityScore ?? 0) - (left.popularityScore ?? 0);
            if (popularityDelta !== 0) {
              return popularityDelta;
            }
            return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
          })
          .slice(0, 4);
  const discountProducts = products.filter((product) => Boolean(product.appliedDiscount));
  const miniShelves = buildStorefrontMiniShelves({
    featuredProducts,
    latestProducts: latestResolved,
    popularProducts: popularResolved,
    discountProducts,
    collections,
  });

  return {
    status: 'live',
    featuredProducts,
    latestProducts: latestResolved,
    popularProducts: popularResolved,
    categories,
    collections,
    promoBanners,
    miniShelves,
  };
}

export async function getCatalogStorefrontData(): Promise<CatalogStorefrontDataResult> {
  const [activeProductsResult, categories] = await Promise.all([
    fetchActiveProducts(),
    fetchActiveCategories(),
  ]);

  if (activeProductsResult.kind === 'no_env') {
    const fallbackProducts = storeProducts;

    return {
      status: 'fallback_env',
      products: fallbackProducts,
      categories,
      collections: buildFallbackCollections(fallbackProducts),
      promoBanners: buildStorefrontPromoBanners(fallbackProducts, categories),
      message:
        'Источник данных магазина пока не настроен. Показываем безопасный локальный превью-режим каталога.',
    };
  }

  if (activeProductsResult.kind === 'error') {
    const fallbackProducts = storeProducts;

    return {
      status: 'fallback_error',
      products: fallbackProducts,
      categories,
      collections: buildFallbackCollections(fallbackProducts),
      promoBanners: buildStorefrontPromoBanners(fallbackProducts, categories),
      message: withDevDetails(
        'Данные каталога временно недоступны. Показываем безопасный локальный превью-режим.',
        activeProductsResult.message,
      ),
    };
  }

  const products = activeProductsResult.products;
  const promoBanners = buildStorefrontPromoBanners(products, categories);

  if (activeProductsResult.products.length === 0) {
    return {
      status: 'empty',
      products: [],
      categories,
      collections: [],
      promoBanners,
      message: 'Активных товаров пока нет.',
    };
  }

  const collections = await fetchActiveCollections(products);

  return {
    status: 'live',
    products,
    categories,
    collections,
    promoBanners,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

const getProductStorefrontDataUncached = async (
  productParam: string,
): Promise<ProductStorefrontDataResult> => {
  const client = createSupabaseServerClientOptional();

  if (!client) {
    const fallbackProduct = findStoreProduct(productParam);
    if (!fallbackProduct) {
      return {
        status: 'not_found',
        product: null,
        relatedProducts: [],
        message: 'Товар сейчас недоступен.',
      };
    }

    return {
      status: 'fallback_env',
      product: fallbackProduct,
      relatedProducts: storeProducts
        .filter((item) => item.id !== fallbackProduct.id)
        .slice(0, 3),
      message:
        'Источник данных товара пока не настроен. Показываем безопасный локальный превью-режим этой позиции.',
    };
  }

  try {
    const productQuery = client
      .from('products')
      .select(
        'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
      )
      .eq('status', 'active')
      .eq('slug', productParam)
      .maybeSingle();

    const { data: productBySlug, error: productError } = await productQuery;
    if (productError) {
      throw new Error(productError.message);
    }

    let productRow = (productBySlug as ProductListRow | null) ?? null;

    if (!productRow && isUuid(productParam)) {
      const byId = await client
        .from('products')
        .select(
          'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
        )
        .eq('status', 'active')
        .eq('id', productParam)
        .maybeSingle();

      if (byId.error) {
        throw new Error(byId.error.message);
      }
      productRow = (byId.data as ProductListRow | null) ?? null;
    }

    if (!productRow) {
      return {
        status: 'not_found',
        product: null,
        relatedProducts: [],
        message: 'Товар недоступен или больше не активен.',
      };
    }

    const productImagesResult = await client
      .from('product_images')
      .select('id, product_id, url, alt, sort_order, is_primary, created_at')
      .eq('product_id', productRow.id)
      .order('sort_order', { ascending: true });

    if (productImagesResult.error) {
      throw new Error(productImagesResult.error.message);
    }

    let relatedQuery = client
      .from('products')
      .select(
        'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
      )
      .eq('status', 'active')
      .neq('id', productRow.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (productRow.category_id) {
      relatedQuery = relatedQuery.eq('category_id', productRow.category_id);
    }

    let relatedResult = await relatedQuery;
    if (relatedResult.error) {
      throw new Error(relatedResult.error.message);
    }

    if ((relatedResult.data ?? []).length === 0 && productRow.category_id) {
      relatedResult = await client
        .from('products')
        .select(
          'id, category_id, slug, title, short_description, description, price, compare_at_price, currency, is_featured, stock_quantity, created_at',
        )
        .eq('status', 'active')
        .neq('id', productRow.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (relatedResult.error) {
        throw new Error(relatedResult.error.message);
      }
    }

    const relatedRows = (relatedResult.data ?? []) as ProductListRow[];
    let relatedImages: ProductImageListRow[] = [];

    if (relatedRows.length > 0) {
      const relatedImagesResult = await client
        .from('product_images')
        .select('id, product_id, url, alt, sort_order, is_primary, created_at')
        .in(
          'product_id',
          relatedRows.map((row) => row.id),
        )
        .order('sort_order', { ascending: true });

      if (relatedImagesResult.error) {
        throw new Error(relatedImagesResult.error.message);
      }

      relatedImages = (relatedImagesResult.data ?? []) as ProductImageListRow[];
    }

    const product = (await mapProductRows(
      client,
      [productRow as ProductListRow],
      (productImagesResult.data ?? []) as ProductImageListRow[],
    ))[0];

    const relatedProducts = await mapProductRows(client, relatedRows, relatedImages);

    return {
      status: 'live',
      product,
      relatedProducts,
    };
  } catch (error) {
    const fallbackProduct = findStoreProduct(productParam);
    if (!fallbackProduct) {
      return {
        status: 'error',
        product: null,
        relatedProducts: [],
        message:
          error instanceof Error
            ? error.message
            : 'Unknown storefront product query error.',
      };
    }

    return {
      status: 'fallback_error',
      product: fallbackProduct,
      relatedProducts: storeProducts
        .filter((item) => item.id !== fallbackProduct.id)
        .slice(0, 3),
      message:
        error instanceof Error
          ? withDevDetails(
              'Детали товара временно недоступны. Показываем безопасный локальный превью-режим.',
              error.message,
            )
          : 'Детали товара временно недоступны. Показываем безопасный локальный превью-режим.',
    };
  }
};

export const getProductStorefrontData = cache(getProductStorefrontDataUncached);
