import Link from 'next/link';

import { classNames } from '@/css/classnames';

import { formatStorePrice } from './formatPrice';
import styles from './store.module.css';
import type { StoreProduct } from './types';

interface ProductCardProps {
  product: StoreProduct;
  href?: string;
  compact?: boolean;
  layout?: 'grid' | 'list';
}

function getStockBadge(product: StoreProduct): { label: string; className: string } | null {
  if (product.stockState === 'out_of_stock') {
    return { label: 'Нет в наличии', className: styles.productStatusDanger };
  }

  if (product.stockState === 'low_stock') {
    return { label: 'Осталось мало', className: styles.productStatusWarn };
  }

  return null;
}

export function ProductCard({ product, href, compact = false, layout = 'grid' }: ProductCardProps) {
  const imageStyle = product.imageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.14), rgba(12, 18, 31, 0.14)), url(${product.imageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : { background: product.imageGradient };
  const stockBadge = getStockBadge(product);

  const card = (
    <article
      className={classNames(
        styles.productCard,
        compact && styles.productCardCompact,
        layout === 'list' && styles.productCardList,
      )}
    >
      <div className={styles.productImage} style={imageStyle}>
        <span className={styles.productImageLabel}>{product.imageLabel}</span>
      </div>

      <div className={styles.productBody}>
        <div className={styles.productHeading}>
          <p className={styles.productName}>{product.title}</p>
          {product.appliedDiscount ? (
            <p className={styles.productDiscountBadge}>{product.appliedDiscount.badgeText}</p>
          ) : null}
        </div>

        {product.categoryTitle || stockBadge ? (
          <div className={styles.productMetaRow}>
            {product.categoryTitle ? <span className={styles.productMetaBadge}>{product.categoryTitle}</span> : null}
            {stockBadge ? (
              <span className={classNames(styles.productMetaBadge, stockBadge.className)}>{stockBadge.label}</span>
            ) : null}
          </div>
        ) : null}

        <p className={styles.productDescription}>{product.shortDescription || product.description}</p>

        <div className={styles.productPriceRow}>
          <p className={styles.productPrice}>{formatStorePrice(product.priceCents, product.currency)}</p>
          {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? (
            <p className={styles.productPriceCompare}>
              {formatStorePrice(product.compareAtPriceCents, product.currency)}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className={styles.productLink} aria-label={`Открыть товар ${product.title}`}>
      {card}
    </Link>
  );
}
