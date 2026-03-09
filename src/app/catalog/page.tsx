import { ProductCard } from '@/components/store/ProductCard';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { storeProducts } from '@/components/store/mock-products';
import styles from '@/components/store/store.module.css';

const catalogChips = ['All', 'Clothes', 'Accessories', 'Home', 'Tech'];

export default function CatalogPage() {
  return (
    <StoreScreen title="Catalog" subtitle="Find products by category or keyword">
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search products"
          aria-label="Search products"
          readOnly
        />
        <button
          type="button"
          className={styles.filterButton}
          aria-label="Open filters"
        >
          Filters
        </button>
      </div>

      <div className={styles.chipRow}>
        {catalogChips.map((chip, index) => (
          <span
            key={chip}
            className={`${styles.chip} ${index === 0 ? styles.chipActive : ''}`}
          >
            {chip}
          </span>
        ))}
      </div>

      <StoreSection title="All products">
        <div className={styles.catalogGrid}>
          {storeProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/products/${product.id}`}
            />
          ))}
        </div>
      </StoreSection>
    </StoreScreen>
  );
}
