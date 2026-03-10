import type { StoreProduct } from '@/components/store/types';

interface PromoCategory {
  id: string;
  slug: string;
  title: string;
}

export interface StorefrontPromoBanner {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export function buildStorefrontPromoBanners(
  products: StoreProduct[],
  categories: PromoCategory[],
): StorefrontPromoBanner[] {
  const heroProduct = products.find((product) => product.isFeatured) ?? products[0];
  const firstCategory = categories.find((category) => category.id !== 'all');

  return [
    {
      id: 'weekly-pick',
      eyebrow: 'Weekly pick',
      title: heroProduct ? heroProduct.title : 'MainStore selection',
      description: heroProduct
        ? `Fast shipping and clean essentials. Explore ${heroProduct.title.toLowerCase()} now.`
        : 'Fast shipping and clean essentials selected by the MainStore team.',
      ctaLabel: heroProduct ? 'Open product' : 'Open catalog',
      ctaHref: heroProduct ? `/products/${heroProduct.slug}` : '/catalog',
    },
    {
      id: 'category-entry',
      eyebrow: 'Curated flow',
      title: firstCategory ? `${firstCategory.title} highlights` : 'Curated highlights',
      description:
        'Use category and collection shortcuts to find the right products in a couple of taps.',
      ctaLabel: firstCategory ? 'Shop category' : 'Browse catalog',
      ctaHref: firstCategory ? `/catalog?category=${firstCategory.slug}` : '/catalog',
    },
  ];
}
