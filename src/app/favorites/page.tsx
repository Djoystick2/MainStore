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
    <StoreScreen title="Favorites" subtitle="Save products for later">
      {favoritesData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            favoritesData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Favorites update</p>
          <p className={styles.dataNoticeText}>{favoritesData.message}</p>
        </section>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Favorites need Telegram session"
          description="Open MainStore in Telegram to load your personal favorites."
          actionLabel="Open catalog"
          actionHref="/catalog"
        />
      ) : (
        <StoreSection title="Saved picks">
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
              title="Favorites are empty"
              description="Save products from product pages and they will appear here."
              actionLabel="Explore catalog"
              actionHref="/catalog"
            />
          )}
        </StoreSection>
      )}
    </StoreScreen>
  );
}
