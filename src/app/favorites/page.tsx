import Link from 'next/link';

import { TelegramSessionRequiredState } from '@/components/auth/TelegramSessionRequiredState';
import { ProductCard } from '@/components/store/ProductCard';
import { FavoriteToggleButton } from '@/components/store/FavoriteToggleButton';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getFavoriteProductsForProfile, getUserStoreSummaryForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

export default async function FavoritesPage() {
  const { profile } = await getCurrentUserContext();
  const [favoritesData, summary] = await Promise.all([
    getFavoriteProductsForProfile(profile?.id ?? null),
    getUserStoreSummaryForProfile(profile?.id ?? null),
  ]);
  const isSessionMissing = favoritesData.status === 'unauthorized';
  const hasProducts = favoritesData.products.length > 0;

  return (
    <StoreScreen title="Избранное" subtitle="Сохранённые товары и быстрый путь обратно к покупке">
      {favoritesData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            favoritesData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Состояние избранного</p>
          <p className={styles.dataNoticeText}>{favoritesData.message}</p>
          {(favoritesData.status === 'error' || favoritesData.status === 'not_configured') ? (
            <div className={styles.dataNoticeActions}>
              <Link href="/favorites" className={styles.dataNoticeRetry} aria-label="Повторить загрузку избранного">
                Повторить
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {isSessionMissing ? (
        <TelegramSessionRequiredState
          fallbackTitle="Нужна сессия Telegram"
          fallbackDescription="Откройте MainStore в Telegram, чтобы загрузить личное избранное."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/favorites"
        />
      ) : (
        <>
          <StoreSection title="Сводка">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Сохранено</p>
                <p className={styles.infoValue}>{favoritesData.products.length}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>В корзине</p>
                <p className={styles.infoValue}>{summary.cartQuantityTotal}</p>
              </div>
            </div>
          </StoreSection>

          {hasProducts ? (
            <>
              <StoreSection title="Сохранённые товары">
                <div className={styles.catalogGrid}>
                  {favoritesData.products.map((product) => (
                    <div key={product.id} className={styles.productCardStack}>
                      <ProductCard product={product} href={`/products/${product.slug}`} />
                      <FavoriteToggleButton productId={product.id} initialFavorited={true} compact />
                    </div>
                  ))}
                </div>
              </StoreSection>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Что дальше</h2>
                <p className={styles.panelText}>
                  Откройте карточку товара, чтобы проверить детали, или вернитесь в корзину, если уже готовы к оформлению.
                </p>
                <div className={styles.panelActions}>
                  <Link href="/cart" className={styles.secondaryButton}>
                    Открыть корзину
                  </Link>
                  <Link href="/catalog" className={styles.secondaryButton}>
                    Продолжить покупки
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <>
              <StoreEmptyState
                title="Избранное пока пусто"
                description="Сохраняйте товары со страницы товара, и они появятся здесь."
                actionLabel="Открыть каталог"
                actionHref="/catalog"
              />

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Как использовать избранное</h2>
                <p className={styles.panelText}>
                  Это ваш быстрый список для позиций, к которым хочется вернуться позже без повторного поиска.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </StoreScreen>
  );
}
