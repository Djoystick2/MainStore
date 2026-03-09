import Link from 'next/link';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';
import type { StoreProduct } from './types';

interface ProductCardProps {
  product: StoreProduct;
  href?: string;
  compact?: boolean;
}

function formatPrice(priceCents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function ProductCard({ product, href, compact = false }: ProductCardProps) {
  const card = (
    <article
      className={classNames(styles.productCard, compact && styles.productCardCompact)}
    >
      <div
        className={styles.productImage}
        style={{ background: product.imageGradient }}
      >
        <span className={styles.productImageLabel}>{product.imageLabel}</span>
      </div>
      <div className={styles.productBody}>
        <p className={styles.productName}>{product.title}</p>
        <p className={styles.productDescription}>{product.description}</p>
        <p className={styles.productPrice}>{formatPrice(product.priceCents)}</p>
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
      aria-label={`Open product ${product.title}`}
    >
      {card}
    </Link>
  );
}
