import type { StoreProduct } from '@/components/store/types';

interface PromoCategory {
  id: string;
  slug: string;
  title: string;
}

interface PromoCollection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  products: StoreProduct[];
}

export interface StorefrontPromoBanner {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface StorefrontMiniShelf {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  tone: 'sun' | 'mint' | 'sky';
  products: StoreProduct[];
  isPlaceholder?: boolean;
}

function pickProducts(primary: StoreProduct[], fallback: StoreProduct[], limit = 4): StoreProduct[] {
  if (primary.length >= 2) {
    return primary.slice(0, limit);
  }

  const merged = [...primary];
  for (const product of fallback) {
    if (merged.some((item) => item.id === product.id)) {
      continue;
    }

    merged.push(product);
    if (merged.length >= limit) {
      break;
    }
  }

  return merged.slice(0, limit);
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
      eyebrow: 'Выбор недели',
      title: heroProduct ? heroProduct.title : 'Подборка MainStore',
      description: heroProduct
        ? `Короткий путь к заметной покупке. Откройте ${heroProduct.title.toLowerCase()} прямо сейчас.`
        : 'Лаконичная витрина с товарами, которые удобно выбирать в пару касаний.',
      ctaLabel: heroProduct ? 'Открыть товар' : 'Открыть каталог',
      ctaHref: heroProduct ? `/products/${heroProduct.slug}` : '/catalog',
    },
    {
      id: 'category-entry',
      eyebrow: 'Быстрый старт',
      title: firstCategory ? firstCategory.title : 'Каталог по категориям',
      description: firstCategory
        ? 'Начните с готовой категории и сократите путь до нужного товара.'
        : 'Откройте каталог и перейдите к понятной навигации по товарам.',
      ctaLabel: firstCategory ? 'К категории' : 'Смотреть каталог',
      ctaHref: firstCategory ? `/catalog?category=${firstCategory.slug}` : '/catalog',
    },
  ];
}

export function buildStorefrontMiniShelves(input: {
  featuredProducts: StoreProduct[];
  latestProducts: StoreProduct[];
  popularProducts: StoreProduct[];
  discountProducts: StoreProduct[];
  collections: PromoCollection[];
}): StorefrontMiniShelf[] {
  const baseFallback = pickProducts(
    [...input.featuredProducts, ...input.popularProducts],
    input.latestProducts,
  );
  const firstCollection = input.collections[0] ?? null;
  const collectionProducts = firstCollection
    ? pickProducts(firstCollection.products, baseFallback)
    : baseFallback;
  const discountProducts = pickProducts(input.discountProducts, baseFallback);
  const hasRealDiscountProducts = input.discountProducts.length > 0;

  const shelves: StorefrontMiniShelf[] = [
    {
      id: 'quick-picks',
      eyebrow: 'Быстрый выбор',
      title: 'На виду сейчас',
      description: 'Небольшая полка с товарами, с которых удобно начать просмотр.',
      ctaLabel: 'В каталог',
      ctaHref: '/catalog',
      tone: 'sun',
      products: pickProducts(input.featuredProducts, baseFallback),
    },
    {
      id: 'promo-ready',
      eyebrow: hasRealDiscountProducts ? 'Со скидкой' : 'Промо-слот',
      title: hasRealDiscountProducts ? 'Выгодно сегодня' : 'Место для акций',
      description: hasRealDiscountProducts
        ? 'Здесь уже собраны товары с активными скидками.'
        : 'Горизонтальная полка готова для будущих промо-товаров и скидочных сценариев.',
      ctaLabel: 'Смотреть',
      ctaHref: '/catalog',
      tone: 'mint',
      products: discountProducts,
      isPlaceholder: !hasRealDiscountProducts,
    },
    {
      id: 'collection-spot',
      eyebrow: firstCollection ? 'Подборка' : 'На каждый день',
      title: firstCollection ? firstCollection.title : 'Спокойный выбор',
      description:
        firstCollection?.description ||
        'Компактная полка для товаров, которые удобно просматривать на мобильном экране.',
      ctaLabel: firstCollection ? 'Открыть' : 'Каталог',
      ctaHref: firstCollection ? `/catalog?collection=${firstCollection.slug}` : '/catalog',
      tone: 'sky',
      products: collectionProducts,
    },
  ];

  return shelves.filter((shelf) => shelf.products.length > 0);
}
