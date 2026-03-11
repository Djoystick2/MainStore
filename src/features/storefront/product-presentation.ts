import type {
  StoreProduct,
  StoreProductOptionGroup,
  StoreProductPresentation,
  StoreProductReviewPreview,
  StoreProductSizeGuideRow,
  StoreProductSpecGroup,
} from '@/components/store/types';

const clothingSizes: StoreProductSizeGuideRow[] = [
  { size: 'XS', chest: '84-88 см', waist: '66-70 см', fit: 'Очень аккуратная посадка' },
  { size: 'S', chest: '88-94 см', waist: '70-76 см', fit: 'Базовая посадка' },
  { size: 'M', chest: '94-100 см', waist: '76-82 см', fit: 'Свободнее в плечах' },
  { size: 'L', chest: '100-108 см', waist: '82-90 см', fit: 'Комфортный свободный крой' },
  { size: 'XL', chest: '108-116 см', waist: '90-98 см', fit: 'Больше объёма и длины' },
];

function buildReviewPreview(product: StoreProduct, mode: 'comfort' | 'tech' | 'daily'): StoreProductReviewPreview[] {
  const common = [
    {
      id: `${product.id}-review-1`,
      author: 'Марина',
      rating: 5,
      title: mode === 'tech' ? 'Понравилась сборка' : 'Удачная покупка',
      text:
        mode === 'comfort'
          ? 'Материал приятный, посадка понятная, визуально выглядит дороже своей цены.'
          : mode === 'tech'
            ? 'Хорошо вписался в ежедневный сценарий, ничего лишнего, удобен в использовании.'
            : 'Понравилось, что товар выглядит аккуратно и сразу понятно, с чем его сочетать.',
      meta: 'Превью формата отзывов',
    },
    {
      id: `${product.id}-review-2`,
      author: 'Илья',
      rating: 4,
      title: mode === 'comfort' ? 'Размер понятный' : 'Для повседневного использования удобно',
      text:
        mode === 'daily'
          ? 'Хороший вариант на каждый день. Особенно понравилась аккуратная детализация.'
          : 'Витрина уже хорошо показывает, чего ждать: размер, материал и основные особенности считываются быстро.',
      meta: 'Демо-блок до подключения отзывов',
    },
  ];

  return common;
}

function buildSpecs(product: StoreProduct, extra: StoreProductSpecGroup[]): StoreProductSpecGroup[] {
  return [
    {
      id: 'overview',
      title: 'Основное',
      items: [
        { label: 'Артикул', value: product.slug },
        { label: 'Категория', value: product.categoryTitle || 'Без категории' },
        { label: 'Цена', value: `${(product.priceCents / 100).toFixed(0)} ${product.currency}` },
        { label: 'Наличие', value: product.stockState === 'out_of_stock' ? 'Нет в наличии' : 'Доступно к заказу' },
      ],
    },
    ...extra,
  ];
}

function buildOptionGroups(input: {
  sizes?: string[];
  colors?: Array<{ id: string; label: string; swatch: string }>;
  variants?: string[];
  helperText?: string;
}): StoreProductOptionGroup[] {
  const groups: StoreProductOptionGroup[] = [];

  if (input.colors && input.colors.length > 0) {
    groups.push({
      id: 'color',
      title: 'Цвет',
      type: 'color',
      values: input.colors,
    });
  }

  if (input.sizes && input.sizes.length > 0) {
    groups.push({
      id: 'size',
      title: 'Размер',
      type: 'size',
      values: input.sizes.map((size) => ({ id: size.toLowerCase(), label: size })),
      helperText: input.helperText ?? 'Подберите размер по таблице ниже.',
    });
  }

  if (input.variants && input.variants.length > 0) {
    groups.push({
      id: 'variant',
      title: 'Модификация',
      type: 'variant',
      values: input.variants.map((variant) => ({ id: variant.toLowerCase(), label: variant })),
    });
  }

  return groups;
}

function hasWords(product: StoreProduct, words: string[]): boolean {
  const haystack = `${product.slug} ${product.title} ${product.categoryTitle ?? ''}`.toLowerCase();
  return words.some((word) => haystack.includes(word));
}

export function buildProductPresentation(product: StoreProduct): StoreProductPresentation {
  if (hasWords(product, ['hoodie', 'худи', 'hoodies'])) {
    return {
      optionGroups: buildOptionGroups({
        colors: [
          { id: 'graphite', label: 'Графит', swatch: '#2b2a35' },
          { id: 'lavender', label: 'Лаванда', swatch: '#b8a6ff' },
          { id: 'milk', label: 'Молочный', swatch: '#f2eee7' },
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        variants: ['Стандарт', 'Свободный крой'],
      }),
      sizeGuide: clothingSizes,
      specificationGroups: buildSpecs(product, [
        {
          id: 'materials',
          title: 'Материалы и посадка',
          items: [
            { label: 'Состав', value: 'Хлопок с мягкой внутренней петлёй' },
            { label: 'Посадка', value: 'Свободная, на каждый день' },
            { label: 'Сезон', value: 'Демисезон / круглый год' },
          ],
        },
      ]),
      reviews: buildReviewPreview(product, 'comfort'),
      reviewsLabel: 'Покупатели отмечают комфорт и посадку',
      reviewNote: 'Пока это безопасная витрина отзывов. Реальные отзывы можно подключить без переработки интерфейса.',
    };
  }

  if (hasWords(product, ['sneaker', 'кроссов', 'shoe'])) {
    return {
      optionGroups: buildOptionGroups({
        colors: [
          { id: 'white', label: 'Белый', swatch: '#e8e9ef' },
          { id: 'shadow', label: 'Теневой', swatch: '#54586d' },
          { id: 'sand', label: 'Песочный', swatch: '#ccbba0' },
        ],
        sizes: ['39', '40', '41', '42', '43', '44'],
        variants: ['Город', 'Дорога'],
        helperText: 'Если носите промежуточный размер, лучше взять на половину размера больше.',
      }),
      sizeGuide: [
        { size: '39', chest: '25,5 см', waist: 'EU 39', fit: 'Узкая стопа' },
        { size: '41', chest: '26,5 см', waist: 'EU 41', fit: 'Базовая посадка' },
        { size: '43', chest: '27,5 см', waist: 'EU 43', fit: 'Свободнее по полноте' },
      ],
      specificationGroups: buildSpecs(product, [
        {
          id: 'comfort',
          title: 'Комфорт',
          items: [
            { label: 'Материал верха', value: 'Дышащий текстиль с мягкими вставками' },
            { label: 'Подошва', value: 'Лёгкая, гибкая, городская амортизация' },
            { label: 'Сценарий', value: 'Каждый день, прогулки, поездки' },
          ],
        },
      ]),
      reviews: buildReviewPreview(product, 'comfort'),
      reviewsLabel: 'Чаще всего хвалят лёгкость и удобную колодку',
      reviewNote: 'Формат отзывов подготовлен под будущие реальные оценки и фото-отзывы.',
    };
  }

  if (hasWords(product, ['bag', 'сумк', 'рюкзак'])) {
    return {
      optionGroups: buildOptionGroups({
        colors: [
          { id: 'black', label: 'Тёмный', swatch: '#2a2833' },
          { id: 'olive', label: 'Олива', swatch: '#6e7660' },
          { id: 'stone', label: 'Стоун', swatch: '#bfb6ab' },
        ],
        variants: ['Компактная', 'Расширенная'],
      }),
      specificationGroups: buildSpecs(product, [
        {
          id: 'storage',
          title: 'Вместимость',
          items: [
            { label: 'Основное отделение', value: 'На каждый день, документы и гаджеты' },
            { label: 'Внутренние карманы', value: 'Для мелочей и быстрого доступа' },
            { label: 'Формат', value: 'Городской и дорожный сценарий' },
          ],
        },
      ]),
      reviews: buildReviewPreview(product, 'daily'),
      reviewsLabel: 'Показываем, как будет выглядеть блок отзывов на карточке товара',
      reviewNote: 'Пока без реального бэкенда: это демо-представление, а не живые отзывы.',
    };
  }

  if (hasWords(product, ['lamp', 'speaker', 'charger', 'tech', 'колонк', 'ламп', 'заряд'])) {
    return {
      optionGroups: buildOptionGroups({
        colors: [
          { id: 'graphite', label: 'Графит', swatch: '#2d2f3a' },
          { id: 'silver', label: 'Серебристый', swatch: '#c7ccd7' },
        ],
        variants: ['Базовая', 'Расширенная'],
      }),
      specificationGroups: buildSpecs(product, [
        {
          id: 'tech',
          title: 'Характеристики',
          items: [
            { label: 'Питание', value: 'Подходит для ежедневного домашнего сценария' },
            { label: 'Форм-фактор', value: 'Компактный, для рабочего стола или поездок' },
            { label: 'Комплект', value: 'Товар, базовый набор и краткая инструкция' },
          ],
        },
      ]),
      reviews: buildReviewPreview(product, 'tech'),
      reviewsLabel: 'Блок отзывов подготовлен под будущие отзывы покупателей',
      reviewNote: 'Сейчас это демо-представление без подключения пользовательского бэкенда.',
    };
  }

  return {
    optionGroups: buildOptionGroups({
      colors: [
        { id: 'core', label: 'Основной', swatch: '#6f6486' },
        { id: 'soft', label: 'Светлый', swatch: '#cfc4de' },
      ],
      variants: ['Стандарт', 'Подарочный набор'],
    }),
    specificationGroups: buildSpecs(product, [
      {
        id: 'details',
        title: 'Детали',
        items: [
          { label: 'Сценарий', value: 'Повседневное использование' },
          { label: 'Стиль', value: 'Спокойный, современный, практичный' },
          { label: 'Уход', value: 'Смотрите рекомендации на ярлыке и упаковке' },
        ],
      },
    ]),
    reviews: buildReviewPreview(product, 'daily'),
    reviewsLabel: 'Подготовили мягкий блок отзывов для витрины товара',
    reviewNote: 'Отзывы пока не подключены как реальная серверная функция, поэтому показываем только безопасную основу интерфейса.',
  };
}
