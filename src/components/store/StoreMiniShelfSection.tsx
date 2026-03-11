import Link from 'next/link';

import { classNames } from '@/css/classnames';
import type { StorefrontMiniShelf } from '@/features/storefront/marketing';

import { formatStorePrice } from './formatPrice';
import styles from './store.module.css';

interface StoreMiniShelfSectionProps {
  shelf: StorefrontMiniShelf;
}

const toneClassName: Record<StorefrontMiniShelf['tone'], string> = {
  sun: styles.miniShelfSun,
  mint: styles.miniShelfMint,
  sky: styles.miniShelfSky,
};

export function StoreMiniShelfSection({ shelf }: StoreMiniShelfSectionProps) {
  return (
    <section className={classNames(styles.miniShelf, toneClassName[shelf.tone])}>
      <div className={styles.miniShelfHead}>
        <div className={styles.miniShelfCopy}>
          <p className={styles.miniShelfEyebrow}>{shelf.eyebrow}</p>
          <h2 className={styles.miniShelfTitle}>{shelf.title}</h2>
          <p className={styles.miniShelfDescription}>{shelf.description}</p>
        </div>
        <Link href={shelf.ctaHref} className={styles.miniShelfAction} aria-label={shelf.ctaLabel}>
          {shelf.ctaLabel}
        </Link>
      </div>

      <div className={styles.miniShelfRow}>
        {shelf.products.map((product) => {
          const imageStyle = product.imageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.12), rgba(12, 18, 31, 0.12)), url(${product.imageUrl})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : { background: product.imageGradient };

          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className={styles.miniProductLink}
              aria-label={`Открыть товар ${product.title}`}
            >
              <article className={styles.miniProductCard}>
                <div className={styles.miniProductMedia} style={imageStyle}>
                  <span className={styles.miniProductMediaLabel}>{product.imageLabel}</span>
                </div>
                <div className={styles.miniProductBody}>
                  <div className={styles.miniProductTitleRow}>
                    <p className={styles.miniProductTitle}>{product.title}</p>
                    {product.appliedDiscount ? (
                      <span className={styles.miniProductBadge}>{product.appliedDiscount.badgeText}</span>
                    ) : shelf.isPlaceholder ? (
                      <span className={classNames(styles.miniProductBadge, styles.miniProductBadgeMuted)}>Скоро</span>
                    ) : null}
                  </div>
                  <p className={styles.miniProductDescription}>{product.shortDescription || product.description}</p>
                  <div className={styles.miniProductPriceRow}>
                    <p className={styles.miniProductPrice}>{formatStorePrice(product.priceCents, product.currency)}</p>
                    {product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents ? (
                      <p className={styles.miniProductCompare}>
                        {formatStorePrice(product.compareAtPriceCents, product.currency)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
