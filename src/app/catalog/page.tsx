import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getCatalogStorefrontData } from '@/features/storefront/data';
import styles from '@/components/store/store.module.css';

function normalizeQueryValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return (value[0] ?? '').trim();
  }
  return (value ?? '').trim();
}

function buildCatalogHref({
  query,
  category,
  collection,
}: {
  query?: string;
  category?: string;
  collection?: string;
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

  const search = params.toString();
  return search ? `/catalog?${search}` : '/catalog';
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
  const selectedCategory = catalogData.categories.find(
    (category) => category.slug === selectedCategorySlug,
  );
  const selectedCollection = catalogData.collections.find(
    (collection) => collection.slug === selectedCollectionSlug,
  );
  const collectionProductIdSet = new Set(
    selectedCollection?.products.map((product) => product.id) ?? [],
  );

  const filteredProducts = catalogData.products.filter((product) => {
    if (selectedCategory && selectedCategory.id !== 'all') {
      if (product.categoryId !== selectedCategory.id) {
        return false;
      }
    }

    if (selectedCollection && !collectionProductIdSet.has(product.id)) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const searchableText = [
      product.title,
      product.shortDescription ?? '',
      product.description,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(searchQuery);
  });

  const hasActiveFilters = Boolean(
    searchQuery || (selectedCategory && selectedCategory.id !== 'all') || selectedCollection,
  );
  const resultsTitle = selectedCollection
    ? `Подборка «${selectedCollection.title}»`
    : selectedCategory && selectedCategory.id !== 'all'
      ? selectedCategory.title
      : 'Все товары';

  return (
    <StoreScreen title="Каталог" subtitle="Ищите товары по категории, подборке или названию">
      <form action="/catalog" method="get" className={styles.searchRow}>
        <input
          className={styles.searchInput}
          name="q"
          type="text"
          placeholder="Поиск товаров"
          defaultValue={searchQueryRaw}
          aria-label="Поиск товаров"
        />
        {selectedCategory && selectedCategory.id !== 'all' && (
          <input type="hidden" name="category" value={selectedCategory.slug} />
        )}
        {selectedCollection && (
          <input type="hidden" name="collection" value={selectedCollection.slug} />
        )}
        <button
          type="submit"
          className={styles.filterButton}
          aria-label="Применить поиск по каталогу"
        >
          Найти
        </button>
      </form>

      <div className={styles.chipRow}>
        {catalogData.categories.map((category, index) => (
          <Link
            key={category.id}
            href={buildCatalogHref({
              query: searchQueryRaw || undefined,
              category: category.id === 'all' ? undefined : category.slug,
              collection: selectedCollection?.slug,
            })}
            className={classNames(
              styles.chip,
              (selectedCategory?.id
                ? selectedCategory.id === category.id
                : index === 0) && styles.chipActive,
            )}
            aria-label={`Фильтр по категории ${category.title}`}
          >
            {category.title}
          </Link>
        ))}
      </div>

      {catalogData.collections.length > 0 && (
        <StoreSection title="Подборки">
          <div className={styles.collectionRail}>
            {catalogData.collections.slice(0, 6).map((collection) => (
              <Link
                key={collection.id}
                href={buildCatalogHref({
                  query: searchQueryRaw || undefined,
                  category:
                    selectedCategory && selectedCategory.id !== 'all'
                      ? selectedCategory.slug
                      : undefined,
                  collection:
                    selectedCollection?.slug === collection.slug ? undefined : collection.slug,
                })}
                className={classNames(
                  styles.collectionCard,
                  selectedCollection?.slug === collection.slug && styles.collectionCardActive,
                )}
                aria-label={`Открыть подборку ${collection.title}`}
              >
                <p className={styles.collectionTitle}>{collection.title}</p>
                <p className={styles.collectionDescription}>
                  {collection.description || 'Подборка товаров'}
                </p>
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
      )}

      {catalogData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            catalogData.status === 'fallback_error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление каталога</p>
          <p className={styles.dataNoticeText}>{catalogData.message}</p>
          {(catalogData.status === 'fallback_error' ||
            catalogData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/catalog"
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку каталога"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {hasActiveFilters && (
        <Link href="/catalog" className={styles.secondaryInlineLink} aria-label="Сбросить все фильтры">
          Сбросить фильтры
        </Link>
      )}

      {catalogData.promoBanners[0] && (
        <section className={styles.marketingCard}>
          <p className={styles.marketingEyebrow}>{catalogData.promoBanners[0].eyebrow}</p>
          <h2 className={styles.marketingTitle}>{catalogData.promoBanners[0].title}</h2>
          <p className={styles.marketingText}>{catalogData.promoBanners[0].description}</p>
          <Link
            href={catalogData.promoBanners[0].ctaHref}
            className={styles.marketingAction}
            aria-label={catalogData.promoBanners[0].ctaLabel}
          >
            {catalogData.promoBanners[0].ctaLabel}
          </Link>
        </section>
      )}

      <StoreSection title={resultsTitle}>
        {catalogData.status === 'empty' ? (
          <StoreEmptyState
            title="Каталог пуст"
            description="Активных товаров пока нет. Опубликуйте их в админке и вернитесь сюда."
          />
        ) : filteredProducts.length === 0 ? (
          <StoreEmptyState
            title="Ничего не найдено"
            description="Попробуйте другую категорию или сбросьте фильтры."
            actionLabel="Сбросить фильтры"
            actionHref="/catalog"
          />
        ) : (
          <div className={styles.catalogGrid}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                href={`/products/${product.slug}`}
              />
            ))}
          </div>
        )}
      </StoreSection>
    </StoreScreen>
  );
}
