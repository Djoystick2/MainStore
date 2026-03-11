import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getCatalogStorefrontData } from '@/features/storefront/data';
import type { StoreProduct } from '@/components/store/types';
import styles from '@/components/store/store.module.css';

type CatalogSort = 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'discount';

function normalizeQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return (value[0] ?? '').trim();
  }

  return (value ?? '').trim();
}

function normalizeBooleanFlag(value: string | string[] | undefined): boolean {
  const normalized = normalizeQueryValue(value);
  return normalized === '1' || normalized === 'true';
}

function normalizeSort(value: string | string[] | undefined): CatalogSort {
  const normalized = normalizeQueryValue(value);

  if (
    normalized === 'newest' ||
    normalized === 'price_asc' ||
    normalized === 'price_desc' ||
    normalized === 'discount'
  ) {
    return normalized;
  }

  return 'popular';
}

function buildCatalogHref({
  query,
  category,
  collection,
  sort,
  availability,
  discounted,
  featured,
}: {
  query?: string;
  category?: string;
  collection?: string;
  sort?: CatalogSort;
  availability?: string;
  discounted?: boolean;
  featured?: boolean;
}): string {
  const params = new URLSearchParams();

  if (query) {
    params.set('q', query);
  }
  if (category) {
    params.set('category', category);
  }
  if (collection) {
    params.set('collection', collection);
  }
  if (sort && sort !== 'popular') {
    params.set('sort', sort);
  }
  if (availability) {
    params.set('availability', availability);
  }
  if (discounted) {
    params.set('discounted', '1');
  }
  if (featured) {
    params.set('featured', '1');
  }

  const search = params.toString();
  return search ? `/catalog?${search}` : '/catalog';
}

function sortProducts(products: StoreProduct[], sort: CatalogSort): StoreProduct[] {
  const sorted = [...products];

  sorted.sort((left, right) => {
    switch (sort) {
      case 'newest':
        return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
      case 'price_asc':
        return left.priceCents - right.priceCents;
      case 'price_desc':
        return right.priceCents - left.priceCents;
      case 'discount': {
        const discountDelta = (right.discountAmountCents ?? 0) - (left.discountAmountCents ?? 0);
        if (discountDelta !== 0) {
          return discountDelta;
        }
        return (right.popularityScore ?? 0) - (left.popularityScore ?? 0);
      }
      case 'popular':
      default: {
        const popularityDelta = (right.popularityScore ?? 0) - (left.popularityScore ?? 0);
        if (popularityDelta !== 0) {
          return popularityDelta;
        }
        if (right.isFeatured !== left.isFeatured) {
          return right.isFeatured ? 1 : -1;
        }
        return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
      }
    }
  });

  return sorted;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const catalogData = await getCatalogStorefrontData();
  const searchQueryRaw = normalizeQueryValue(params.q);
  const searchQuery = searchQueryRaw.toLowerCase();
  const selectedCategorySlug = normalizeQueryValue(params.category);
  const selectedCollectionSlug = normalizeQueryValue(params.collection);
  const selectedSort = normalizeSort(params.sort);
  const selectedAvailability = normalizeQueryValue(params.availability);
  const discountedOnly = normalizeBooleanFlag(params.discounted);
  const featuredOnly = normalizeBooleanFlag(params.featured);

  const selectedCategory = catalogData.categories.find((category) => category.slug === selectedCategorySlug);
  const selectedCollection = catalogData.collections.find((collection) => collection.slug === selectedCollectionSlug);
  const collectionProductIdSet = new Set(selectedCollection?.products.map((product) => product.id) ?? []);

  const filteredProducts = catalogData.products.filter((product) => {
    if (selectedCategory && selectedCategory.id !== 'all' && product.categoryId !== selectedCategory.id) {
      return false;
    }

    if (selectedCollection && !collectionProductIdSet.has(product.id)) {
      return false;
    }

    if (selectedAvailability === 'in_stock' && product.stockState === 'out_of_stock') {
      return false;
    }

    if (discountedOnly && !product.appliedDiscount) {
      return false;
    }

    if (featuredOnly && !product.isFeatured) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const searchableText = [
      product.title,
      product.shortDescription ?? '',
      product.description,
      product.categoryTitle ?? '',
      ...(product.collections ?? []).map((collection) => collection.title),
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchQuery);
  });

  const sortedProducts = sortProducts(filteredProducts, selectedSort);
  const hasActiveFilters = Boolean(
    searchQuery ||
      (selectedCategory && selectedCategory.id !== 'all') ||
      selectedCollection ||
      selectedAvailability ||
      discountedOnly ||
      featuredOnly ||
      selectedSort !== 'popular',
  );

  const resultsTitle = selectedCollection
    ? `Подборка «${selectedCollection.title}»`
    : selectedCategory && selectedCategory.id !== 'all'
      ? selectedCategory.title
      : searchQueryRaw
        ? `Поиск: «${searchQueryRaw}»`
        : 'Все товары';

  const resultSummary = `${sortedProducts.length} ${
    sortedProducts.length === 1 ? 'товар' : sortedProducts.length >= 2 && sortedProducts.length <= 4 ? 'товара' : 'товаров'
  }`;

  const categoryTiles = catalogData.categories.filter((category) => category.id !== 'all').slice(0, 6);
  const useListLayout = hasActiveFilters || Boolean(selectedCategory && selectedCategory.id !== 'all');

  return (
    <StoreScreen title="Каталог" subtitle="Категории, подборки и понятный путь к нужному товару">
      <section className={styles.catalogLead}>
        <p className={styles.catalogLeadEyebrow}>Навигация по витрине</p>
        <h2 className={styles.catalogLeadTitle}>{resultsTitle}</h2>
        <p className={styles.catalogLeadText}>
          {hasActiveFilters
            ? `Сейчас на экране ${resultSummary.toLowerCase()} по выбранным условиям.`
            : 'Сначала выберите раздел плиткой, а внутри переходите к более точному списку через поиск и фильтры.'}
        </p>
      </section>

      {categoryTiles.length > 0 ? (
        <section className={styles.categoryShortcutGrid} aria-label="Основные категории каталога">
          {categoryTiles.map((category) => {
            const isActive = selectedCategory?.id === category.id;

            return (
              <Link
                key={category.id}
                href={buildCatalogHref({
                  query: searchQueryRaw || undefined,
                  category: category.slug,
                  collection: undefined,
                  sort: selectedSort,
                  availability: selectedAvailability || undefined,
                  discounted: discountedOnly,
                  featured: featuredOnly,
                })}
                className={classNames(styles.categoryShortcut, isActive && styles.categoryShortcutActive)}
                aria-label={`Открыть категорию ${category.title}`}
              >
                <p className={styles.categoryShortcutTitle}>{category.title}</p>
                <p className={styles.categoryShortcutSub}>{category.description || 'Перейти в раздел'}</p>
              </Link>
            );
          })}
        </section>
      ) : null}

      <form action="/catalog" method="get" className={styles.catalogToolbar}>
        {selectedCategory && selectedCategory.id !== 'all' ? (
          <input type="hidden" name="category" value={selectedCategory.slug} />
        ) : null}
        {selectedCollection ? <input type="hidden" name="collection" value={selectedCollection.slug} /> : null}
        {discountedOnly ? <input type="hidden" name="discounted" value="1" /> : null}
        {featuredOnly ? <input type="hidden" name="featured" value="1" /> : null}
        {selectedAvailability ? <input type="hidden" name="availability" value={selectedAvailability} /> : null}

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            name="q"
            type="text"
            placeholder="Найти товар, категорию или подборку"
            defaultValue={searchQueryRaw}
            aria-label="Поиск по каталогу"
          />
          <button type="submit" className={styles.filterButton} aria-label="Применить поиск по каталогу">
            Найти
          </button>
        </div>

        <div className={styles.catalogToolbarRow}>
          <label className={styles.catalogSelectLabel}>
            <span className={styles.catalogSelectCaption}>Сортировка</span>
            <select name="sort" defaultValue={selectedSort} className={styles.catalogSelect}>
              <option value="popular">Сначала популярные</option>
              <option value="newest">Сначала новые</option>
              <option value="discount">Сначала выгодные</option>
              <option value="price_asc">Цена по возрастанию</option>
              <option value="price_desc">Цена по убыванию</option>
            </select>
          </label>
        </div>
      </form>

      <div className={styles.chipRow}>
        <Link
          href={buildCatalogHref({
            query: searchQueryRaw || undefined,
            sort: selectedSort,
          })}
          className={classNames(
            styles.chip,
            !selectedCategory &&
              !selectedCollection &&
              !selectedAvailability &&
              !discountedOnly &&
              !featuredOnly &&
              selectedSort === 'popular' &&
              styles.chipActive,
          )}
        >
          Все
        </Link>
        <Link
          href={buildCatalogHref({
            query: searchQueryRaw || undefined,
            category: selectedCategory && selectedCategory.id !== 'all' ? selectedCategory.slug : undefined,
            collection: selectedCollection?.slug,
            sort: selectedSort,
            availability: selectedAvailability === 'in_stock' ? undefined : 'in_stock',
            discounted: discountedOnly,
            featured: featuredOnly,
          })}
          className={classNames(styles.chip, selectedAvailability === 'in_stock' && styles.chipActive)}
        >
          Можно заказать
        </Link>
        <Link
          href={buildCatalogHref({
            query: searchQueryRaw || undefined,
            category: selectedCategory && selectedCategory.id !== 'all' ? selectedCategory.slug : undefined,
            collection: selectedCollection?.slug,
            sort: selectedSort,
            availability: selectedAvailability || undefined,
            discounted: !discountedOnly,
            featured: featuredOnly,
          })}
          className={classNames(styles.chip, discountedOnly && styles.chipActive)}
        >
          Со скидкой
        </Link>
        <Link
          href={buildCatalogHref({
            query: searchQueryRaw || undefined,
            category: selectedCategory && selectedCategory.id !== 'all' ? selectedCategory.slug : undefined,
            collection: selectedCollection?.slug,
            sort: selectedSort,
            availability: selectedAvailability || undefined,
            discounted: discountedOnly,
            featured: !featuredOnly,
          })}
          className={classNames(styles.chip, featuredOnly && styles.chipActive)}
        >
          Рекомендуемые
        </Link>
      </div>

      {catalogData.collections.length > 0 ? (
        <StoreSection title="Подборки">
          <div className={styles.collectionRail}>
            {catalogData.collections.slice(0, 8).map((collection) => (
              <Link
                key={collection.id}
                href={buildCatalogHref({
                  query: searchQueryRaw || undefined,
                  category: selectedCategory && selectedCategory.id !== 'all' ? selectedCategory.slug : undefined,
                  collection: selectedCollection?.slug === collection.slug ? undefined : collection.slug,
                  sort: selectedSort,
                  availability: selectedAvailability || undefined,
                  discounted: discountedOnly,
                  featured: featuredOnly,
                })}
                className={classNames(
                  styles.collectionCard,
                  selectedCollection?.slug === collection.slug && styles.collectionCardActive,
                )}
                aria-label={`Открыть подборку ${collection.title}`}
              >
                <p className={styles.collectionTitle}>{collection.title}</p>
                <p className={styles.collectionDescription}>{collection.description || 'Готовый сценарий покупок без лишнего поиска.'}</p>
                <div className={styles.collectionItems}>
                  {collection.products.slice(0, 2).map((product) => (
                    <span key={product.id} className={styles.collectionItemPill}>
                      {product.title}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </StoreSection>
      ) : null}

      {catalogData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            catalogData.status === 'fallback_error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Состояние каталога</p>
          <p className={styles.dataNoticeText}>{catalogData.message}</p>
          {(catalogData.status === 'fallback_error' || catalogData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link href="/catalog" className={styles.dataNoticeRetry} aria-label="Повторить загрузку каталога">
                Повторить
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <div className={styles.catalogResultMeta}>
        <p className={styles.catalogResultCount}>{resultSummary}</p>
        {hasActiveFilters ? (
          <Link href="/catalog" className={styles.secondaryInlineLink} aria-label="Сбросить все фильтры каталога">
            Сбросить фильтры
          </Link>
        ) : null}
      </div>

      {catalogData.promoBanners[0] && !selectedCollection ? (
        <section className={styles.bannerCard}>
          <p className={styles.bannerEyebrow}>{catalogData.promoBanners[0].eyebrow}</p>
          <h2 className={styles.bannerTitle}>{catalogData.promoBanners[0].title}</h2>
          <p className={styles.bannerText}>{catalogData.promoBanners[0].description}</p>
          <Link
            href={catalogData.promoBanners[0].ctaHref}
            className={styles.bannerAction}
            aria-label={catalogData.promoBanners[0].ctaLabel}
          >
            {catalogData.promoBanners[0].ctaLabel}
          </Link>
        </section>
      ) : null}

      <StoreSection title={resultsTitle}>
        {catalogData.status === 'empty' ? (
          <StoreEmptyState
            title="Каталог пока пуст"
            description="Активные товары ещё не опубликованы. Когда витрина заполнится, позиции появятся здесь."
          />
        ) : sortedProducts.length === 0 ? (
          <StoreEmptyState
            title={searchQueryRaw ? `По запросу «${searchQueryRaw}» ничего не найдено` : 'Ничего не найдено'}
            description="Попробуйте убрать часть условий, открыть другую категорию или вернуться ко всем товарам."
            actionLabel="Показать все товары"
            actionHref="/catalog"
          />
        ) : (
          <div className={classNames(styles.catalogGrid, useListLayout && styles.catalogList)}>
            {sortedProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                href={`/products/${product.slug}`}
                layout={useListLayout ? 'list' : 'grid'}
              />
            ))}
          </div>
        )}
      </StoreSection>
    </StoreScreen>
  );
}
