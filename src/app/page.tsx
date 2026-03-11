import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreMiniShelfSection } from '@/components/store/StoreMiniShelfSection';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getHomeStorefrontData } from '@/features/storefront/data';
import styles from '@/components/store/store.module.css';

export default async function HomePage() {
  const homeData = await getHomeStorefrontData();
  const categoryShortcuts = homeData.categories.filter((category) => category.id !== 'all').slice(0, 4);
  const quickLinks = [
    { id: 'catalog', title: 'Каталог', subtitle: 'Все товары в одном месте', href: '/catalog' },
    ...categoryShortcuts.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.description || 'Открыть раздел',
      href: `/catalog?category=${category.slug}`,
    })),
  ].slice(0, 4);
  const collectionCards = homeData.collections.slice(0, 3);
  const popularProducts = homeData.popularProducts.length > 0 ? homeData.popularProducts : homeData.featuredProducts;
  const uniqueShownProducts = new Set(
    [...homeData.featuredProducts, ...homeData.latestProducts, ...popularProducts].map((product) => product.id),
  ).size;

  return (
    <StoreScreen
      title="Главная"
      subtitle="Спокойная витрина для быстрых покупок в Telegram"
      back={false}
    >
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>MainStore</p>
          <h2 className={styles.heroTitle}>Покупать проще, чем искать</h2>
          <p className={styles.heroText}>
            На главном экране только короткий путь к разделам, подборкам и товарам, которые удобно смотреть с телефона.
          </p>
        </div>

        <div className={styles.heroMeta}>
          <span className={styles.heroMetaItem}>{uniqueShownProducts} товаров на витрине</span>
          <span className={styles.heroMetaItem}>{homeData.collections.length} подборок</span>
          <span className={styles.heroMetaItem}>{Math.max(homeData.categories.length - 1, 0)} категорий</span>
        </div>

        <div className={styles.heroActions}>
          <Link href="/catalog" className={styles.heroButton} aria-label="Открыть каталог с главного экрана">
            Открыть каталог
          </Link>
        </div>
      </section>

      {homeData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            homeData.status === 'fallback_error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Состояние витрины</p>
          <p className={styles.dataNoticeText}>{homeData.message}</p>
          {(homeData.status === 'fallback_error' || homeData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link href="/" className={styles.dataNoticeRetry} aria-label="Повторить загрузку главной">
                Повторить
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {quickLinks.length > 0 ? (
        <section className={styles.quickLinkRow} aria-label="Быстрые переходы по витрине">
          {quickLinks.map((link) => (
            <Link key={link.id} href={link.href} className={styles.quickLinkCard} aria-label={`Открыть раздел ${link.title}`}>
              <p className={styles.quickLinkTitle}>{link.title}</p>
              <p className={styles.quickLinkSubtitle}>{link.subtitle}</p>
            </Link>
          ))}
        </section>
      ) : null}

      {homeData.promoBanners.length > 0 ? (
        <section className={styles.bannerRail} aria-label="Подсказки и акценты витрины">
          {homeData.promoBanners.map((banner) => (
            <article key={banner.id} className={styles.bannerCard}>
              <p className={styles.bannerEyebrow}>{banner.eyebrow}</p>
              <h2 className={styles.bannerTitle}>{banner.title}</h2>
              <p className={styles.bannerText}>{banner.description}</p>
              <Link href={banner.ctaHref} className={styles.bannerAction} aria-label={banner.ctaLabel}>
                {banner.ctaLabel}
              </Link>
            </article>
          ))}
        </section>
      ) : null}

      {homeData.status === 'empty' ? (
        <StoreEmptyState
          title="Витрина пока пустая"
          description="Активные товары ещё не опубликованы. Когда каталог заполнится, они появятся здесь."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : (
        <>
          {homeData.miniShelves.map((shelf) => (
            <StoreMiniShelfSection key={shelf.id} shelf={shelf} />
          ))}

          <StoreSection title="Популярное сейчас" actionLabel="В каталог" actionHref="/catalog">
            <div className={styles.scrollRow}>
              {popularProducts.map((product) => (
                <ProductCard key={product.id} product={product} href={`/products/${product.slug}`} compact />
              ))}
            </div>
          </StoreSection>

          <StoreSection title="Новые поступления" actionLabel="Все товары" actionHref="/catalog">
            <div className={styles.scrollRow}>
              {homeData.latestProducts.map((product) => (
                <ProductCard key={product.id} product={product} href={`/products/${product.slug}`} compact />
              ))}
            </div>
          </StoreSection>

          {collectionCards.length > 0 ? (
            <StoreSection title="Готовые подборки" actionLabel="Каталог" actionHref="/catalog">
              <div className={styles.collectionRail}>
                {collectionCards.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/catalog?collection=${collection.slug}`}
                    className={styles.collectionCard}
                    aria-label={`Открыть подборку ${collection.title}`}
                  >
                    <p className={styles.collectionTitle}>{collection.title}</p>
                    <p className={styles.collectionDescription}>
                      {collection.description || 'Короткая подборка товаров, которую удобно просмотреть за пару минут.'}
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
          ) : null}
        </>
      )}
    </StoreScreen>
  );
}
