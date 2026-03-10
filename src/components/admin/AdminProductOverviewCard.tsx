import type { AdminProductDetail } from '@/features/admin';

import styles from './admin.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

interface AdminProductOverviewCardProps {
  product: AdminProductDetail;
}

export function AdminProductOverviewCard({ product }: AdminProductOverviewCardProps) {
  const stockLabel = product.stockQuantity > 0 ? 'In stock' : 'Out of stock';

  return (
    <section className={styles.adminCard}>
      <div className={styles.adminProductOverview}>
        <div className={styles.adminProductOverviewMedia}>
          {product.primaryImageUrl ? (
            <div
              className={styles.adminProductOverviewImage}
              style={{
                backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.12), rgba(12, 18, 31, 0.12)), url(${product.primaryImageUrl})`,
              }}
            />
          ) : (
            <div className={styles.adminProductOverviewPlaceholder}>No primary image</div>
          )}
        </div>

        <div className={styles.adminProductOverviewBody}>
          <div className={styles.adminProductOverviewHead}>
            <div>
              <h2 className={styles.adminCardTitle}>{product.title}</h2>
              <p className={styles.adminCardSub}>{product.slug}</p>
            </div>
            <div className={styles.adminBadgeRow}>
              <span className={styles.adminStatusBadge}>{product.status}</span>
              {product.isFeatured && <span className={styles.adminFeatureBadge}>Featured</span>}
              <span className={styles.adminAvailabilityBadge}>{stockLabel}</span>
            </div>
          </div>

          <div className={styles.adminMetaGrid}>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Price</p>
              <p className={styles.adminMetaValue}>{formatPrice(product.price, product.currency)}</p>
              {product.displayCompareAtPrice && product.displayCompareAtPrice > product.price && (
                <p className={styles.adminCardSub}>
                  Was {formatPrice(product.displayCompareAtPrice, product.currency)}
                </p>
              )}
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Stock</p>
              <p className={styles.adminMetaValue}>{product.stockQuantity}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Category</p>
              <p className={styles.adminMetaValue}>{product.categoryTitle ?? 'No category'}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Discount</p>
              <p className={styles.adminMetaValue}>
                {product.appliedDiscount
                  ? `${product.appliedDiscount.badgeText} · ${product.appliedDiscount.scope}`
                  : 'No active discount'}
              </p>
            </div>
          </div>

          <div className={styles.adminMetaGrid}>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Collections</p>
              <p className={styles.adminMetaValue}>
                {product.collectionTitles.length > 0
                  ? product.collectionTitles.join(', ')
                  : 'No collections'}
              </p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Images</p>
              <p className={styles.adminMetaValue}>{product.imagesCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Favorites</p>
              <p className={styles.adminMetaValue}>{product.favoritesCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>In carts</p>
              <p className={styles.adminMetaValue}>{product.cartItemsCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Order history links</p>
              <p className={styles.adminMetaValue}>{product.orderItemsCount}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
