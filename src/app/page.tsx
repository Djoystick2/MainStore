import Link from 'next/link';

import { ProductCard } from '@/components/store/ProductCard';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { storeProducts } from '@/components/store/mock-products';
import styles from '@/components/store/store.module.css';

const featuredProducts = storeProducts.slice(0, 4);
const freshDrops = storeProducts.slice(4, 8);

export default function HomePage() {
  return (
    <StoreScreen
      title="Home"
      subtitle="Discover products in a clean customer-first storefront"
      back={false}
    >
      <section className={styles.hero}>
        <h2 className={styles.heroTitle}>Everyday picks, curated fast</h2>
        <p className={styles.heroText}>
          Premium baseline UI for a Telegram store. Browse the catalog and add
          items in a few taps.
        </p>
        <div className={styles.heroActions}>
          <Link
            href="/catalog"
            className={styles.heroButton}
            aria-label="Open catalog from home hero section"
          >
            Open catalog
          </Link>
        </div>
      </section>

      <StoreSection title="Featured now" actionLabel="See all" actionHref="/catalog">
        <div className={styles.scrollRow}>
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/products/${product.id}`}
              compact
            />
          ))}
        </div>
      </StoreSection>

      <StoreSection title="Fresh drops" actionLabel="Catalog" actionHref="/catalog">
        <div className={styles.scrollRow}>
          {freshDrops.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/products/${product.id}`}
              compact
            />
          ))}
        </div>
      </StoreSection>
    </StoreScreen>
  );
}
