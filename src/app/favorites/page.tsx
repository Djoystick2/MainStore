import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { FavoriteToggleButton } from '@/components/store/FavoriteToggleButton';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getFavoriteProductsForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

export default async function FavoritesPage() {
  const { profile } = await getCurrentUserContext();
  const favoritesData = await getFavoriteProductsForProfile(profile?.id ?? null);
  const isSessionMissing = favoritesData.status === 'unauthorized';
  const hasProducts = favoritesData.products.length > 0;

  return (
    <StoreScreen title="Избранное" subtitle="Сохраняйте товары на потом">
      {favoritesData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            favoritesData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление избранного</p>
          <p className={styles.dataNoticeText}>{favoritesData.message}</p>
          {(favoritesData.status === 'error' || favoritesData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/favorites"
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку избранного"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы загрузить личное избранное."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : (
        <StoreSection title="Сохраненные товары">
          {hasProducts ? (
            <div className={styles.catalogGrid}>
              {favoritesData.products.map((product) => (
                <div key={product.id} className={styles.productCardStack}>
                  <ProductCard product={product} href={`/products/${product.slug}`} />
                  <FavoriteToggleButton
                    productId={product.id}
                    initialFavorited={true}
                    compact
                  />
                </div>
              ))}
            </div>
          ) : (
            <StoreEmptyState
              title="Избранное пусто"
              description="Сохраняйте товары со страницы товара, и они появятся здесь."
              actionLabel="Открыть каталог"
              actionHref="/catalog"
            />
          )}
        </StoreSection>
      )}
    </StoreScreen>
  );
}
