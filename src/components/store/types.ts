import type { AppliedDiscountSummary } from '@/features/pricing';

export type StoreStockState = 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';

export interface StoreProductMedia {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface StoreCollectionLink {
  id: string;
  slug: string;
  title: string;
}

export interface StoreProductOptionValue {
  id: string;
  label: string;
  swatch?: string;
  hint?: string;
}

export interface StoreProductOptionGroup {
  id: string;
  title: string;
  type: 'size' | 'color' | 'variant';
  values: StoreProductOptionValue[];
  helperText?: string;
}

export interface StoreProductSizeGuideRow {
  size: string;
  chest: string;
  waist: string;
  fit: string;
}

export interface StoreProductSpecItem {
  label: string;
  value: string;
}

export interface StoreProductSpecGroup {
  id: string;
  title: string;
  items: StoreProductSpecItem[];
}

export interface StoreProductReviewPreview {
  id: string;
  author: string;
  rating: number;
  title: string;
  text: string;
  meta: string;
}

export interface StoreProductPresentation {
  optionGroups: StoreProductOptionGroup[];
  sizeGuide?: StoreProductSizeGuideRow[];
  specificationGroups: StoreProductSpecGroup[];
  reviews: StoreProductReviewPreview[];
  reviewsLabel: string;
  reviewNote?: string;
}

export interface StoreProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription?: string | null;
  description: string;
  basePriceCents: number;
  priceCents: number;
  compareAtPriceCents?: number | null;
  discountAmountCents?: number;
  appliedDiscount?: AppliedDiscountSummary | null;
  currency: string;
  imageLabel: string;
  imageGradient: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
  isFeatured?: boolean;
  createdAt?: string;
  categoryId?: string | null;
  categoryTitle?: string | null;
  stockQuantity?: number;
  stockState?: StoreStockState;
  popularityScore?: number;
  media?: StoreProductMedia[];
  collections?: StoreCollectionLink[];
  presentation?: StoreProductPresentation;
}
