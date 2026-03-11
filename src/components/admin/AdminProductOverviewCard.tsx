import type { AdminProductDetail } from '@/features/admin';

import styles from './admin.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatProductStatus(status: AdminProductDetail['status']): string {
  switch (status) {
    case 'draft':
      return 'Черновик';
    case 'active':
      return 'Активен';
    case 'archived':
      return 'Архив';
    default:
      return status;
  }
}

function formatDiscountScope(scope: string): string {
  switch (scope) {
    case 'product':
      return 'товар';
    case 'category':
      return 'категория';
    case 'collection':
      return 'подборка';
    default:
      return scope;
  }
}

interface AdminProductOverviewCardProps {
  product: AdminProductDetail;
}

export function AdminProductOverviewCard({ product }: AdminProductOverviewCardProps) {
  const stockLabel = product.stockQuantity > 0 ? 'В наличии' : 'Нет в наличии';

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
            <div className={styles.adminProductOverviewPlaceholder}>Нет главного изображения</div>
          )}
        </div>

        <div className={styles.adminProductOverviewBody}>
          <div className={styles.adminProductOverviewHead}>
            <div>
              <h2 className={styles.adminCardTitle}>{product.title}</h2>
              <p className={styles.adminCardSub}>{product.slug}</p>
            </div>
            <div className={styles.adminBadgeRow}>
              <span className={styles.adminStatusBadge}>{formatProductStatus(product.status)}</span>
              {product.isFeatured && <span className={styles.adminFeatureBadge}>Рекомендуемый</span>}
              <span className={styles.adminAvailabilityBadge}>{stockLabel}</span>
            </div>
          </div>

          <div className={styles.adminMetaGrid}>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Цена</p>
              <p className={styles.adminMetaValue}>{formatPrice(product.price, product.currency)}</p>
              {product.displayCompareAtPrice && product.displayCompareAtPrice > product.price ? (
                <p className={styles.adminCardSub}>
                  Было {formatPrice(product.displayCompareAtPrice, product.currency)}
                </p>
              ) : null}
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Остаток</p>
              <p className={styles.adminMetaValue}>{product.stockQuantity}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Категория</p>
              <p className={styles.adminMetaValue}>{product.categoryTitle ?? 'Без категории'}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Скидка</p>
              <p className={styles.adminMetaValue}>
                {product.appliedDiscount
                  ? `${product.appliedDiscount.badgeText} · ${formatDiscountScope(product.appliedDiscount.scope)}`
                  : 'Нет активной скидки'}
              </p>
            </div>
          </div>

          <div className={styles.adminMetaGrid}>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Подборки</p>
              <p className={styles.adminMetaValue}>
                {product.collectionTitles.length > 0
                  ? product.collectionTitles.join(', ')
                  : 'Нет подборок'}
              </p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Изображения</p>
              <p className={styles.adminMetaValue}>{product.imagesCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Избранное</p>
              <p className={styles.adminMetaValue}>{product.favoritesCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>В корзинах</p>
              <p className={styles.adminMetaValue}>{product.cartItemsCount}</p>
            </div>
            <div className={styles.adminMetaCell}>
              <p className={styles.adminMetaLabel}>Связи с заказами</p>
              <p className={styles.adminMetaValue}>{product.orderItemsCount}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
