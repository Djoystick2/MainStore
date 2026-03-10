import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, DiscountScope, DiscountType } from '@/types/db';

type ProductRow = Database['public']['Tables']['products']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];
type CollectionItemRow = Database['public']['Tables']['collection_items']['Row'];
type DiscountRow = Database['public']['Tables']['discounts']['Row'];

export interface DiscountCandidate {
  id: string;
  scope: DiscountScope;
  targetId: string;
  targetTitle: string;
  title: string;
  type: DiscountType;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AppliedDiscountSummary {
  id: string;
  scope: DiscountScope;
  targetId: string;
  targetTitle: string;
  title: string;
  type: DiscountType;
  value: number;
  savingsAmount: number;
  savingsPercent: number;
  badgeText: string;
}

export interface ResolvedPriceSummary {
  basePrice: number;
  effectivePrice: number;
  compareAtPrice: number | null;
  discountAmount: number;
  appliedDiscount: AppliedDiscountSummary | null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getScopePriority(scope: DiscountScope): number {
  switch (scope) {
    case 'product':
      return 3;
    case 'category':
      return 2;
    case 'collection':
      return 1;
    default:
      return 0;
  }
}

function isDiscountActive(discount: Pick<DiscountCandidate, 'isActive' | 'startsAt' | 'endsAt'>, now: Date): boolean {
  if (!discount.isActive) {
    return false;
  }

  if (discount.startsAt && new Date(discount.startsAt).getTime() > now.getTime()) {
    return false;
  }

  if (discount.endsAt && new Date(discount.endsAt).getTime() < now.getTime()) {
    return false;
  }

  return true;
}

function computeDiscountAmount(basePrice: number, type: DiscountType, value: number): number {
  if (basePrice <= 0 || value <= 0) {
    return 0;
  }

  if (type === 'percentage') {
    return roundMoney(Math.min(basePrice, (basePrice * value) / 100));
  }

  return roundMoney(Math.min(basePrice, value));
}

function buildDiscountBadge(
  candidate: DiscountCandidate,
  savingsAmount: number,
  savingsPercent: number,
  currency: string,
): string {
  if (candidate.type === 'percentage') {
    return `${Math.round(candidate.value)}% off`;
  }

  if (savingsPercent >= 1) {
    return `${Math.round(savingsPercent)}% off`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(savingsAmount) + ' off';
}

export function resolvePriceSummary(
  product: Pick<ProductRow, 'price' | 'compare_at_price' | 'currency'>,
  candidates: DiscountCandidate[],
  now = new Date(),
): ResolvedPriceSummary {
  const basePrice = roundMoney(Number(product.price) || 0);
  const explicitCompareAt = product.compare_at_price ? roundMoney(Number(product.compare_at_price)) : null;
  const activeCandidates = candidates.filter((candidate) => isDiscountActive(candidate, now));

  const appliedDiscount = activeCandidates
    .map((candidate) => {
      const savingsAmount = computeDiscountAmount(basePrice, candidate.type, Number(candidate.value) || 0);
      const effectivePrice = roundMoney(Math.max(0, basePrice - savingsAmount));
      const savingsPercent = basePrice > 0 ? (savingsAmount / basePrice) * 100 : 0;

      return {
        candidate,
        savingsAmount,
        savingsPercent,
        effectivePrice,
      };
    })
    .filter((entry) => entry.savingsAmount > 0)
    .sort((left, right) => {
      if (left.effectivePrice !== right.effectivePrice) {
        return left.effectivePrice - right.effectivePrice;
      }

      if (left.savingsAmount !== right.savingsAmount) {
        return right.savingsAmount - left.savingsAmount;
      }

      return getScopePriority(right.candidate.scope) - getScopePriority(left.candidate.scope);
    })[0];

  if (!appliedDiscount) {
    return {
      basePrice,
      effectivePrice: basePrice,
      compareAtPrice:
        explicitCompareAt !== null && explicitCompareAt > basePrice ? explicitCompareAt : null,
      discountAmount: 0,
      appliedDiscount: null,
    };
  }

  const compareAtPrice = explicitCompareAt
    ? Math.max(explicitCompareAt, basePrice)
    : basePrice;

  return {
    basePrice,
    effectivePrice: appliedDiscount.effectivePrice,
    compareAtPrice: compareAtPrice > appliedDiscount.effectivePrice ? compareAtPrice : null,
    discountAmount: appliedDiscount.savingsAmount,
    appliedDiscount: {
      id: appliedDiscount.candidate.id,
      scope: appliedDiscount.candidate.scope,
      targetId: appliedDiscount.candidate.targetId,
      targetTitle: appliedDiscount.candidate.targetTitle,
      title: appliedDiscount.candidate.title,
      type: appliedDiscount.candidate.type,
      value: Number(appliedDiscount.candidate.value),
      savingsAmount: appliedDiscount.savingsAmount,
      savingsPercent: Math.round(appliedDiscount.savingsPercent),
      badgeText: buildDiscountBadge(
        appliedDiscount.candidate,
        appliedDiscount.savingsAmount,
        appliedDiscount.savingsPercent,
        product.currency,
      ),
    },
  };
}

function mapDiscountRows(
  rows: DiscountRow[],
  titlesByTargetId: Map<string, string>,
): DiscountCandidate[] {
  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    targetId: row.target_id,
    targetTitle: titlesByTargetId.get(row.target_id) ?? 'Unknown target',
    title: row.title,
    type: row.type,
    value: Number(row.value) || 0,
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
  }));
}

export async function resolvePricingForProducts(
  client: SupabaseClient<Database>,
  products: Array<Pick<ProductRow, 'id' | 'title' | 'category_id' | 'price' | 'compare_at_price' | 'currency'>>,
): Promise<Map<string, ResolvedPriceSummary>> {
  const result = new Map<string, ResolvedPriceSummary>();
  if (products.length === 0) {
    return result;
  }

  const productIds = products.map((product) => product.id);
  const categoryIds = Array.from(
    new Set(products.map((product) => product.category_id).filter((value): value is string => Boolean(value))),
  );

  const [collectionItemsResult, productDiscountsResult, categoryDiscountsResult, categoriesResult] =
    await Promise.all([
      client
        .from('collection_items')
        .select('collection_id, product_id, sort_order, created_at')
        .in('product_id', productIds),
      client.from('discounts').select('*').eq('scope', 'product').in('target_id', productIds),
      categoryIds.length > 0
        ? client.from('discounts').select('*').eq('scope', 'category').in('target_id', categoryIds)
        : Promise.resolve({ data: [], error: null }),
      categoryIds.length > 0
        ? client.from('categories').select('id, title').in('id', categoryIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (collectionItemsResult.error) {
    throw new Error(collectionItemsResult.error.message);
  }
  if (productDiscountsResult.error) {
    throw new Error(productDiscountsResult.error.message);
  }
  if (categoryDiscountsResult.error) {
    throw new Error(categoryDiscountsResult.error.message);
  }
  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  const collectionItemRows = (collectionItemsResult.data ?? []) as CollectionItemRow[];
  const collectionIds = Array.from(
    new Set(collectionItemRows.map((row) => row.collection_id)),
  );

  const [collectionDiscountsResult, collectionsResult] = await Promise.all([
    collectionIds.length > 0
      ? client.from('discounts').select('*').eq('scope', 'collection').in('target_id', collectionIds)
      : Promise.resolve({ data: [], error: null }),
    collectionIds.length > 0
      ? client.from('collections').select('id, title').in('id', collectionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (collectionDiscountsResult.error) {
    throw new Error(collectionDiscountsResult.error.message);
  }
  if (collectionsResult.error) {
    throw new Error(collectionsResult.error.message);
  }

  const productTitlesById = new Map(products.map((product) => [product.id, product.title]));
  const categoryTitlesById = new Map(
    ((categoriesResult.data ?? []) as Array<Pick<CategoryRow, 'id' | 'title'>>).map((row) => [row.id, row.title]),
  );
  const collectionTitlesById = new Map(
    ((collectionsResult.data ?? []) as Array<Pick<CollectionRow, 'id' | 'title'>>).map((row) => [row.id, row.title]),
  );

  const productDiscounts = mapDiscountRows(
    (productDiscountsResult.data ?? []) as DiscountRow[],
    productTitlesById,
  );
  const categoryDiscounts = mapDiscountRows(
    (categoryDiscountsResult.data ?? []) as DiscountRow[],
    categoryTitlesById,
  );
  const collectionDiscounts = mapDiscountRows(
    (collectionDiscountsResult.data ?? []) as DiscountRow[],
    collectionTitlesById,
  );

  const productDiscountsByTargetId = new Map(productDiscounts.map((discount) => [discount.targetId, discount]));
  const categoryDiscountsByTargetId = new Map(categoryDiscounts.map((discount) => [discount.targetId, discount]));
  const collectionDiscountsByTargetId = new Map(collectionDiscounts.map((discount) => [discount.targetId, discount]));

  const collectionIdsByProductId = new Map<string, string[]>();
  collectionItemRows.forEach((row) => {
    const bucket = collectionIdsByProductId.get(row.product_id);
    if (bucket) {
      bucket.push(row.collection_id);
      return;
    }
    collectionIdsByProductId.set(row.product_id, [row.collection_id]);
  });

  products.forEach((product) => {
    const candidates: DiscountCandidate[] = [];
    const productDiscount = productDiscountsByTargetId.get(product.id);
    if (productDiscount) {
      candidates.push(productDiscount);
    }

    if (product.category_id) {
      const categoryDiscount = categoryDiscountsByTargetId.get(product.category_id);
      if (categoryDiscount) {
        candidates.push(categoryDiscount);
      }
    }

    (collectionIdsByProductId.get(product.id) ?? []).forEach((collectionId) => {
      const collectionDiscount = collectionDiscountsByTargetId.get(collectionId);
      if (collectionDiscount) {
        candidates.push(collectionDiscount);
      }
    });

    result.set(product.id, resolvePriceSummary(product, candidates));
  });

  return result;
}
