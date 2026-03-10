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
      title="Главная"
      subtitle="Подборка для быстрых покупок в Telegram"
      back={false}
    >
      <section className={styles.hero}>
        <p className={styles.heroEyebrow}>Выбор MainStore</p>
        <h2 className={styles.heroTitle}>Покупки в пару касаний</h2>
        <p className={styles.heroText}>
          Собрали заметные товары, новинки и готовые подборки для короткого и понятного сценария внутри Mini App.
        </p>
        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}>{uniqueShownProducts} товаров на витрине</span>
          <span className={styles.heroMetaItem}>
            {homeData.collections.length} готовых подборок
          </span>
        </div>
        <div className={styles.heroActions}>
          <Link
            href="/catalog"
            className={styles.heroButton}
            aria-label="Открыть каталог с главного экрана"
          >
            Открыть каталог
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
          <p className={styles.dataNoticeTitle}>Обновление витрины</p>
          <p className={styles.dataNoticeText}>{homeData.message}</p>
          {(homeData.status === 'fallback_error' || homeData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link href="/" className={styles.dataNoticeRetry} aria-label="Повторить загрузку главной">
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {homeData.promoBanners.length > 0 && (
        <section className={styles.marketingGrid} aria-label="Промо-блоки магазина">
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
        <StoreSection title="Покупки по категориям" actionLabel="Все категории" actionHref="/catalog">
          <div className={styles.categoryShortcutGrid}>
            {categoryShortcuts.map((category) => (
              <Link
                key={category.id}
                href={`/catalog?category=${category.slug}`}
                className={styles.categoryShortcut}
                aria-label={`Открыть категорию ${category.title}`}
              >
                <p className={styles.categoryShortcutTitle}>{category.title}</p>
                <p className={styles.categoryShortcutSub}>
                  {category.description || 'Посмотреть товары'}
                </p>
              </Link>
            ))}
          </div>
        </StoreSection>
      )}

      {homeData.status === 'empty' ? (
          <StoreEmptyState
            title="Товаров пока нет"
            description="На витрине еще нет активных товаров. Опубликуйте их в админке."
            actionLabel="Открыть каталог"
            actionHref="/catalog"
          />
        ) : (
        <>
          <StoreSection title="Рекомендуем сейчас" actionLabel="Смотреть все" actionHref="/catalog">
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

          <StoreSection title="Новинки" actionLabel="Каталог" actionHref="/catalog">
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
            <StoreSection title="Подборки" actionLabel="Открыть каталог" actionHref="/catalog">
              <div className={styles.collectionRail}>
                {homeData.collections.slice(0, 4).map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/catalog?collection=${collection.slug}`}
                    className={styles.collectionCard}
                    aria-label={`Открыть подборку ${collection.title}`}
                  >
                    <p className={styles.collectionTitle}>{collection.title}</p>
                    <p className={styles.collectionDescription}>
                      {collection.description || 'Товары, собранные для этой подборки.'}
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
