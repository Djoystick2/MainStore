import type { AppliedDiscountSummary } from '@/features/pricing';

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
}
