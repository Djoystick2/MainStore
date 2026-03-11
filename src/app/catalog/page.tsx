import Link from 'next/link';
import type { CSSProperties } from 'react';

import { AddToCartButton } from '@/components/store/AddToCartButton';
import { FavoriteToggleButton } from '@/components/store/FavoriteToggleButton';
import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import type { StoreProduct } from '@/components/store/types';
import styles from '@/components/store/store.module.css';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import {
  buildCatalogCategoryGroups,
  inferCatalogGroupSlug,
} from '@/features/storefront/catalog-hierarchy';
import { getCatalogStorefrontData } from '@/features/storefront/data';
import { getFavoriteProductIdsForProfile } from '@/features/user-store/data';

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
  group,
  category,
  collection,
  sort,
  availability,
  discounted,
  featured,
}: {
  query?: string;
  group?: string;
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
  if (group) {
    params.set('group', group);
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

function pluralizeProducts(count: number): string {
  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return 'товар';
  }
  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return 'товара';
  }
  return 'товаров';
}

function buildCategoryTileStyle(artworkUrl: string | null): CSSProperties | undefined {
  if (!artworkUrl) {
    return undefined;
  }

  try {
    const parsed = new URL(artworkUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return {
    backgroundImage: [
      'linear-gradient(180deg, rgba(5, 6, 8, 0.14) 0%, rgba(5, 6, 8, 0.54) 72%, rgba(5, 6, 8, 0.82) 100%)',
      `url(${artworkUrl})`,
    ].join(', '),
    backgroundPosition: 'center',
    backgroundSize: 'cover',
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { profile } = await getCurrentUserContext();
  const [catalogData, favoriteIds] = await Promise.all([
    getCatalogStorefrontData(),
    getFavoriteProductIdsForProfile(profile?.id ?? null),
  ]);

  const searchQueryRaw = normalizeQueryValue(params.q);
  const searchQuery = searchQueryRaw.toLowerCase();
  const selectedGroupSlug = normalizeQueryValue(params.group);
  const selectedCategorySlug = normalizeQueryValue(params.category);
  const selectedCollectionSlug = normalizeQueryValue(params.collection);
  const selectedSort = normalizeSort(params.sort);
  const selectedAvailability = normalizeQueryValue(params.availability);
  const discountedOnly = normalizeBooleanFlag(params.discounted);
  const featuredOnly = normalizeBooleanFlag(params.featured);

  const categoryGroups = buildCatalogCategoryGroups(catalogData.categories);
  const selectedCategory =
    catalogData.categories.find((category) => category.slug === selectedCategorySlug) ?? null;
  const inferredGroupSlug =
    selectedCategory?.catalogGroupSlug ?? inferCatalogGroupSlug(selectedCategory?.slug ?? null);
  const selectedGroup =
    categoryGroups.find((group) => group.slug === selectedGroupSlug) ??
    categoryGroups.find((group) => group.slug === inferredGroupSlug) ??
    null;
  const selectedCollection =
    catalogData.collections.find((collection) => collection.slug === selectedCollectionSlug) ?? null;
  const collectionProductIdSet = new Set(selectedCollection?.products.map((product) => product.id) ?? []);
  const favoriteIdSet = new Set(favoriteIds);

  const hasListingFilters = Boolean(
    searchQuery ||
      selectedCollection ||
      selectedAvailability ||
      discountedOnly ||
      featuredOnly ||
      selectedSort !== 'popular',
  );
  const isListingScreen = Boolean(selectedCategory || hasListingFilters);
  const isSubcategoryScreen = Boolean(selectedGroup) && !isListingScreen;
  const isTopLevelScreen = !selectedGroup && !isListingScreen;

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
  const resultsTitle = selectedCollection
    ? `Подборка «${selectedCollection.title}»`
    : selectedCategory
      ? selectedCategory.title
      : searchQueryRaw
        ? `Поиск: «${searchQueryRaw}»`
        : selectedGroup
          ? selectedGroup.title
          : 'Каталог';
  const resultSummary = `${sortedProducts.length} ${pluralizeProducts(sortedProducts.length)}`;
  const subtitle = isTopLevelScreen
    ? 'Выберите раздел каталога'
    : isSubcategoryScreen && selectedGroup
      ? `${selectedGroup.title}: выберите подкатегорию`
      : selectedCategory
        ? `Фильтры и товары в разделе «${selectedCategory.title}»`
        : 'Фильтры, поиск и товарный листинг';

  const resetFiltersHref = buildCatalogHref({
    group: selectedGroup?.slug,
    category: selectedCategory?.slug,
  });
  const backToSubcategoriesHref = selectedGroup
    ? buildCatalogHref({ group: selectedGroup.slug })
    : '/catalog';

  return (
    <StoreScreen title="Каталог" subtitle={subtitle} back={!isTopLevelScreen}>
      {isTopLevelScreen ? (
        <section className={styles.categoryShortcutGrid} aria-label="Разделы каталога">
          {categoryGroups.map((group) => (
            <Link
              key={group.slug}
              href={buildCatalogHref({ group: group.slug })}
              className={styles.categoryShortcut}
              aria-label={`Открыть раздел ${group.title}`}
            >
              <span
                className={styles.categoryShortcutBackdrop}
                style={buildCategoryTileStyle(group.artworkUrl)}
                aria-hidden="true"
              />
              <span className={styles.categoryShortcutScrim} aria-hidden="true" />
              <span className={styles.categoryShortcutHighlight} aria-hidden="true" />
              <span className={styles.categoryShortcutContent}>
                {group.visual ? <span className={styles.categoryShortcutVisual}>{group.visual}</span> : null}
                <span className={styles.categoryShortcutCopy}>
                  <span className={styles.categoryShortcutTitle}>{group.title}</span>
                  <span className={styles.categoryShortcutSub}>{group.description}</span>
                </span>
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {isSubcategoryScreen && selectedGroup ? (
        <section className={styles.categoryList} aria-label={`Подкатегории раздела ${selectedGroup.title}`}>
          {selectedGroup.subcategories.map((category) => (
            <Link
              key={category.id}
              href={buildCatalogHref({
                group: selectedGroup.slug,
                category: category.slug,
              })}
              className={styles.categoryListItem}
              aria-label={`Открыть подкатегорию ${category.title}`}
            >
              <span className={styles.categoryListIcon}>
                {category.catalogVisual || category.title.slice(0, 1)}
              </span>
              <span className={styles.categoryListCopy}>
                <span className={styles.categoryListTitle}>{category.title}</span>
                <span className={styles.categoryListText}>
                  {category.description || 'Откройте раздел и перейдите к товарам.'}
                </span>
              </span>
              <span className={styles.categoryListArrow}>›</span>
            </Link>
          ))}
        </section>
      ) : null}

      {isListingScreen ? (
        <>
          {catalogData.message ? (
            <section
              className={classNames(
                styles.dataNotice,
                catalogData.status === 'fallback_error' && styles.dataNoticeError,
              )}
            >
              <p className={styles.dataNoticeTitle}>Состояние каталога</p>
              <p className={styles.dataNoticeText}>{catalogData.message}</p>
            </section>
          ) : null}

          <form action="/catalog" method="get" className={styles.catalogToolbar}>
            {selectedGroup ? <input type="hidden" name="group" value={selectedGroup.slug} /> : null}
            {selectedCategory ? <input type="hidden" name="category" value={selectedCategory.slug} /> : null}
            {selectedCollection ? <input type="hidden" name="collection" value={selectedCollection.slug} /> : null}
            {discountedOnly ? <input type="hidden" name="discounted" value="1" /> : null}
            {featuredOnly ? <input type="hidden" name="featured" value="1" /> : null}
            {selectedAvailability ? <input type="hidden" name="availability" value={selectedAvailability} /> : null}

            <div className={styles.searchRow}>
              <input
                className={styles.searchInput}
                name="q"
                type="text"
                placeholder="Найти товар в этом разделе"
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
                group: selectedGroup?.slug,
                category: selectedCategory?.slug,
                sort: selectedSort,
              })}
              className={classNames(
                styles.chip,
                !selectedAvailability && !discountedOnly && !featuredOnly && styles.chipActive,
              )}
            >
              Все
            </Link>
            <Link
              href={buildCatalogHref({
                query: searchQueryRaw || undefined,
                group: selectedGroup?.slug,
                category: selectedCategory?.slug,
                sort: selectedSort,
                availability: selectedAvailability === 'in_stock' ? undefined : 'in_stock',
                discounted: discountedOnly,
                featured: featuredOnly,
              })}
              className={classNames(styles.chip, selectedAvailability === 'in_stock' && styles.chipActive)}
            >
              В наличии
            </Link>
            <Link
              href={buildCatalogHref({
                query: searchQueryRaw || undefined,
                group: selectedGroup?.slug,
                category: selectedCategory?.slug,
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
                group: selectedGroup?.slug,
                category: selectedCategory?.slug,
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

          <div className={styles.catalogResultMeta}>
            <p className={styles.catalogResultCount}>{resultSummary}</p>
            {hasListingFilters ? (
              <Link
                href={resetFiltersHref}
                className={styles.secondaryInlineLink}
                aria-label="Сбросить фильтры каталога"
              >
                Сбросить фильтры
              </Link>
            ) : selectedGroup ? (
              <Link
                href={backToSubcategoriesHref}
                className={styles.secondaryInlineLink}
                aria-label="Вернуться к списку подкатегорий"
              >
                К подкатегориям
              </Link>
            ) : null}
          </div>

          <StoreSection title={resultsTitle}>
            {catalogData.status === 'empty' ? (
              <StoreEmptyState
                title="Каталог пока пуст"
                description="Активные товары ещё не опубликованы. Когда витрина заполнится, позиции появятся здесь."
              />
            ) : sortedProducts.length === 0 ? (
              <StoreEmptyState
                title={
                  searchQueryRaw
                    ? `По запросу «${searchQueryRaw}» ничего не найдено`
                    : selectedCategory
                      ? `В разделе «${selectedCategory.title}» пока ничего нет`
                      : 'Ничего не найдено'
                }
                description={
                  selectedGroup
                    ? 'Попробуйте открыть другую подкатегорию или снять часть фильтров.'
                    : 'Попробуйте снять часть фильтров или вернуться ко всем разделам каталога.'
                }
                actionLabel={selectedGroup ? 'К подкатегориям' : 'К разделам каталога'}
                actionHref={selectedGroup ? backToSubcategoriesHref : '/catalog'}
              />
            ) : (
              <div className={styles.catalogGrid}>
                {sortedProducts.map((product) => (
                  <div key={product.id} className={styles.productCardShell}>
                    <div className={styles.productCardFavorite}>
                      <FavoriteToggleButton
                        productId={product.id}
                        initialFavorited={favoriteIdSet.has(product.id)}
                        compact
                      />
                    </div>
                    <ProductCard product={product} href={`/products/${product.slug}`} layout="grid" />
                    <AddToCartButton productId={product.id} className={styles.productCardAction} />
                  </div>
                ))}
              </div>
            )}
          </StoreSection>
        </>
      ) : null}
    </StoreScreen>
  );
}
