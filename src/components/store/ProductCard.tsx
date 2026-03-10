import Link from 'next/link';

import { classNames } from '@/css/classnames';

import { formatStorePrice } from './formatPrice';
import styles from './store.module.css';
import type { StoreProduct } from './types';

interface ProductCardProps {
  product: StoreProduct;
  href?: string;
  compact?: boolean;
}

export function ProductCard({ product, href, compact = false }: ProductCardProps) {
  const imageStyle = product.imageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.16), rgba(12, 18, 31, 0.16)), url(${product.imageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : { background: product.imageGradient };

  const card = (
    <article
      className={classNames(styles.productCard, compact && styles.productCardCompact)}
    >
      <div className={styles.productImage} style={imageStyle}>
        <span className={styles.productImageLabel}>{product.imageLabel}</span>
      </div>
      <div className={styles.productBody}>
        <p className={styles.productName}>{product.title}</p>
        <p className={styles.productDescription}>
          {product.shortDescription || product.description}
        </p>
        <div className={styles.productPriceRow}>
          <p className={styles.productPrice}>
            {formatStorePrice(product.priceCents, product.currency)}
          </p>
          {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents && (
            <p className={styles.productPriceCompare}>
              {formatStorePrice(product.compareAtPriceCents, product.currency)}
            </p>
          )}
        </div>
        {product.appliedDiscount && (
          <p className={styles.productDiscountBadge}>{product.appliedDiscount.badgeText}</p>
        )}
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link
      href={href}
      className={styles.productLink}
      aria-label={`Открыть товар ${product.title}`}
    >
      {card}
    </Link>
  );
}
