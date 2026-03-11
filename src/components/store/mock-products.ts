import type { AppliedDiscountSummary } from '@/features/pricing';
import { buildProductPresentation } from '@/features/storefront/product-presentation';

import type { StoreProduct } from './types';

function createDiscount(input: {
  id: string;
  title: string;
  scope?: 'product' | 'category' | 'collection';
  targetId: string;
  targetTitle: string;
  value: number;
  savingsAmount: number;
  savingsPercent: number;
  badgeText: string;
}): AppliedDiscountSummary {
  return {
    id: input.id,
    scope: input.scope ?? 'product',
    targetId: input.targetId,
    targetTitle: input.targetTitle,
    title: input.title,
    type: 'percentage',
    value: input.value,
    savingsAmount: input.savingsAmount,
    savingsPercent: input.savingsPercent,
    badgeText: input.badgeText,
  };
}

const baseProducts: StoreProduct[] = [
  {
    id: 'demo-product',
    slug: 'daily-comfort-hoodie',
    title: 'Худи Daily Comfort',
    shortDescription: 'Мягкое хлопковое худи для повседневного слоя.',
    description:
      'Мягкое хлопковое худи для спокойного повседневного образа. Свободная посадка, аккуратный объём и базовый оттенок, который легко встроить в повседневный гардероб.',
    basePriceCents: 6290,
    priceCents: 4990,
    compareAtPriceCents: 6290,
    discountAmountCents: 1300,
    appliedDiscount: createDiscount({
      id: 'discount-hoodie',
      title: 'Мягкая цена',
      targetId: 'demo-product',
      targetTitle: 'Худи Daily Comfort',
      value: 21,
      savingsAmount: 13,
      savingsPercent: 21,
      badgeText: '-21%',
    }),
    currency: 'USD',
    imageLabel: 'Худи',
    imageGradient: 'linear-gradient(135deg, #7d6ec7 0%, #34314e 100%)',
    categoryId: 'hoodies',
    categoryTitle: 'Худи',
    isFeatured: true,
    stockQuantity: 12,
  },
  {
    id: 'urban-sneakers',
    slug: 'urban-motion-sneakers',
    title: 'Кроссовки Urban Motion',
    shortDescription: 'Лёгкие кроссовки с гибкой подошвой и мягкой колодкой.',
    description:
      'Лёгкие кроссовки для города и поездок. Хорошо выглядят с базовым гардеробом, быстро считываются по форме и удобно работают как пара на каждый день.',
    basePriceCents: 8990,
    priceCents: 7390,
    compareAtPriceCents: 8990,
    discountAmountCents: 1600,
    appliedDiscount: createDiscount({
      id: 'discount-sneakers',
      title: 'Городская пара',
      targetId: 'urban-sneakers',
      targetTitle: 'Кроссовки Urban Motion',
      value: 18,
      savingsAmount: 16,
      savingsPercent: 18,
      badgeText: '-18%',
    }),
    currency: 'USD',
    imageLabel: 'Кроссовки',
    imageGradient: 'linear-gradient(135deg, #a7b1c6 0%, #515c72 100%)',
    categoryId: 'sneakers',
    categoryTitle: 'Кроссовки',
    stockQuantity: 9,
  },
  {
    id: 'canvas-bag',
    slug: 'canvas-weekend-bag',
    title: 'Сумка Canvas Weekend',
    shortDescription: 'Компактная сумка для города и коротких выездов.',
    description:
      'Компактная сумка с двумя внутренними карманами и спокойной визуальной подачей. Подходит для города, офиса и коротких поездок.',
    basePriceCents: 4190,
    priceCents: 3590,
    compareAtPriceCents: 4190,
    discountAmountCents: 600,
    appliedDiscount: createDiscount({
      id: 'discount-bag',
      title: 'Выбор на выходные',
      targetId: 'canvas-bag',
      targetTitle: 'Сумка Canvas Weekend',
      value: 14,
      savingsAmount: 6,
      savingsPercent: 14,
      badgeText: '-14%',
    }),
    currency: 'USD',
    imageLabel: 'Сумка',
    imageGradient: 'linear-gradient(135deg, #8f7d67 0%, #41372f 100%)',
    categoryId: 'bags',
    categoryTitle: 'Сумки',
    stockQuantity: 7,
  },
  {
    id: 'smart-bottle',
    slug: 'smart-steel-bottle',
    title: 'Термобутылка Smart Steel',
    shortDescription: 'Термобутылка 500 мл с мягким матовым покрытием.',
    description:
      'Вакуумная термобутылка объёмом 500 мл с лаконичной геометрией и спокойным матовым финишем. Подходит для офиса, поездок и спортивного ритма.',
    basePriceCents: 2990,
    priceCents: 2490,
    compareAtPriceCents: 2990,
    discountAmountCents: 500,
    appliedDiscount: createDiscount({
      id: 'discount-bottle',
      title: 'Ритм дня',
      targetId: 'smart-bottle',
      targetTitle: 'Термобутылка Smart Steel',
      value: 17,
      savingsAmount: 5,
      savingsPercent: 17,
      badgeText: '-17%',
    }),
    currency: 'USD',
    imageLabel: 'Бутылка',
    imageGradient: 'linear-gradient(135deg, #8cb8d8 0%, #345167 100%)',
    categoryId: 'wellness',
    categoryTitle: 'Уход',
    stockQuantity: 18,
  },
  {
    id: 'desk-lamp',
    slug: 'focus-desk-lamp',
    title: 'Лампа Focus Desk',
    shortDescription: 'Настольная лампа с мягким тёплым светом.',
    description:
      'Настольная лампа для рабочего стола и вечернего ритуала. Умеренный свет, лаконичная форма и спокойный силуэт без лишнего визуального шума.',
    basePriceCents: 4890,
    priceCents: 4190,
    compareAtPriceCents: 4890,
    discountAmountCents: 700,
    appliedDiscount: createDiscount({
      id: 'discount-lamp',
      title: 'Настроение рабочего стола',
      targetId: 'desk-lamp',
      targetTitle: 'Лампа Focus Desk',
      value: 14,
      savingsAmount: 7,
      savingsPercent: 14,
      badgeText: '-14%',
    }),
    currency: 'USD',
    imageLabel: 'Лампа',
    imageGradient: 'linear-gradient(135deg, #b49773 0%, #5d4939 100%)',
    categoryId: 'lighting',
    categoryTitle: 'Свет',
    stockQuantity: 6,
  },
  {
    id: 'wireless-speaker',
    slug: 'mini-bluetooth-speaker',
    title: 'Колонка Mini Bluetooth',
    shortDescription: 'Портативная колонка для дома и коротких поездок.',
    description:
      'Карманная колонка с насыщенным низом и спокойным дизайном. Быстро встраивается в домашний ритм и поездки без лишней технической сложности.',
    basePriceCents: 6890,
    priceCents: 5890,
    compareAtPriceCents: 6890,
    discountAmountCents: 1000,
    appliedDiscount: createDiscount({
      id: 'discount-speaker',
      title: 'Слой звука',
      targetId: 'wireless-speaker',
      targetTitle: 'Колонка Mini Bluetooth',
      value: 15,
      savingsAmount: 10,
      savingsPercent: 15,
      badgeText: '-15%',
    }),
    currency: 'USD',
    imageLabel: 'Колонка',
    imageGradient: 'linear-gradient(135deg, #7f86bc 0%, #373c61 100%)',
    categoryId: 'audio',
    categoryTitle: 'Аудио',
    stockQuantity: 11,
  },
  {
    id: 'notebook-set',
    slug: 'notebook-set',
    title: 'Набор блокнотов Quiet Notes',
    shortDescription: 'Три блокнота с плотной бумагой и мягкой обложкой.',
    description:
      'Набор из трёх лаконичных блокнотов для заметок, фокусных списков и рабочего стола без визуального шума. Спокойная палитра и приятная бумага.',
    basePriceCents: 1790,
    priceCents: 1390,
    compareAtPriceCents: 1790,
    discountAmountCents: 400,
    appliedDiscount: createDiscount({
      id: 'discount-notebook',
      title: 'Набор для стола',
      targetId: 'notebook-set',
      targetTitle: 'Набор блокнотов Quiet Notes',
      value: 22,
      savingsAmount: 4,
      savingsPercent: 22,
      badgeText: '-22%',
    }),
    currency: 'USD',
    imageLabel: 'Блокноты',
    imageGradient: 'linear-gradient(135deg, #d6b2be 0%, #7d5564 100%)',
    categoryId: 'stationery',
    categoryTitle: 'Канцелярия',
    stockQuantity: 22,
  },
  {
    id: 'charger-kit',
    slug: 'travel-charger-kit',
    title: 'Набор Travel Charger',
    shortDescription: 'Компактный зарядный комплект для поездок и рабочего рюкзака.',
    description:
      'Быстрый зарядный комплект с компактным дорожным адаптером. Удобно держать в рюкзаке или ручной клади без лишнего объёма.',
    basePriceCents: 7990,
    priceCents: 6790,
    compareAtPriceCents: 7990,
    discountAmountCents: 1200,
    appliedDiscount: createDiscount({
      id: 'discount-charger',
      title: 'Готово к поездке',
      targetId: 'charger-kit',
      targetTitle: 'Набор Travel Charger',
      value: 15,
      savingsAmount: 12,
      savingsPercent: 15,
      badgeText: '-15%',
    }),
    currency: 'USD',
    imageLabel: 'Зарядка',
    imageGradient: 'linear-gradient(135deg, #8dc7bc 0%, #32554f 100%)',
    categoryId: 'chargers',
    categoryTitle: 'Зарядка',
    stockQuantity: 10,
  },
];

export const storeProducts: StoreProduct[] = baseProducts.map((product) => ({
  ...product,
  presentation: buildProductPresentation(product),
}));

export function findStoreProduct(productId: string): StoreProduct | undefined {
  return storeProducts.find((product) => product.id === productId || product.slug === productId);
}
