import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getHomeStorefrontData } from '@/features/storefront/data';
import styles from '@/components/store/store.module.css';

export default async function HomePage() {
  const homeData = await getHomeStorefrontData();
  const categoryShortcuts = homeData.categories
    .filter((category) => category.id !== 'all')
    .slice(0, 4);
  const uniqueShownProducts = new Set(
    [...homeData.featuredProducts, ...homeData.latestProducts].map((product) => product.id),
  ).size;

  return (
    <StoreScreen
      title="Home"
      subtitle="Curated picks for fast Telegram shopping"
      back={false}
    >
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>MainStore selection</p>
        <h2 className={styles.heroTitle}>Shop smarter in just a few taps</h2>
        <p className={styles.heroText}>
          Discover featured essentials, fresh arrivals, and curated bundles built
          for quick decisions in Mini App flow.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}>{uniqueShownProducts} ready picks</span>
          <span className={styles.heroMetaItem}>
            {homeData.collections.length} curated collections
          </span>
        </div>
        <div className={styles.heroActions}>
          <Link
            href="/catalog"
            className={styles.heroButton}
            aria-label="Open catalog from home hero section"
          >
            Open catalog
          </Link>
        </div>
      </section>

      {homeData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            homeData.status === 'fallback_error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Store update</p>
          <p className={styles.dataNoticeText}>{homeData.message}</p>
        </section>
      )}

      {homeData.promoBanners.length > 0 && (
        <section className={styles.marketingGrid} aria-label="Store promotions">
          {homeData.promoBanners.map((banner) => (
            <article key={banner.id} className={styles.marketingCard}>
              <p className={styles.marketingEyebrow}>{banner.eyebrow}</p>
              <h2 className={styles.marketingTitle}>{banner.title}</h2>
              <p className={styles.marketingText}>{banner.description}</p>
              <Link
                href={banner.ctaHref}
                className={styles.marketingAction}
                aria-label={banner.ctaLabel}
              >
                {banner.ctaLabel}
              </Link>
            </article>
          ))}
        </section>
      )}

      {categoryShortcuts.length > 0 && (
        <StoreSection title="Shop by category" actionLabel="All categories" actionHref="/catalog">
          <div className={styles.categoryShortcutGrid}>
            {categoryShortcuts.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className={styles.categoryShortcut}
                aria-label={`Open ${category.title} category`}
              >
                <p className={styles.categoryShortcutTitle}>{category.title}</p>
                <p className={styles.categoryShortcutSub}>Explore selection</p>
              </Link>
            ))}
          </div>
        </StoreSection>
      )}

      {homeData.status === 'empty' ? (
        <StoreEmptyState
          title="No products yet"
          description="No active products are published yet. Activate products in admin to fill the storefront."
          actionLabel="Open catalog"
          actionHref="/catalog"
        />
      ) : (
        <>
          <StoreSection title="Featured now" actionLabel="See all" actionHref="/catalog">
            <div className={styles.scrollRow}>
              {homeData.featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={`/products/${product.slug}`}
                  compact
                />
              ))}
            </div>
          </StoreSection>

          <StoreSection title="New arrivals" actionLabel="Catalog" actionHref="/catalog">
            <div className={styles.scrollRow}>
              {homeData.latestProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  href={`/products/${product.slug}`}
                  compact
                />
              ))}
            </div>
          </StoreSection>

          {homeData.collections.length > 0 && (
            <StoreSection title="Curated collections" actionLabel="Open catalog" actionHref="/catalog">
              <div className={styles.collectionRail}>
                {homeData.collections.slice(0, 4).map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/catalog?collection=${collection.slug}`}
                    className={styles.collectionCard}
                    aria-label={`Open ${collection.title} collection`}
                  >
                    <p className={styles.collectionTitle}>{collection.title}</p>
                    <p className={styles.collectionDescription}>
                      {collection.description || 'Curated products picked for this section.'}
                    </p>
                    <div className={styles.collectionItems}>
                      {collection.products.slice(0, 3).map((product) => (
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

        </>
      )}
    </StoreScreen>
  );
}
