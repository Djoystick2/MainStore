import { ProductCard } from '@/components/store/ProductCard';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { storeProducts } from '@/components/store/mock-products';
import styles from '@/components/store/store.module.css';

const favoriteSamples = storeProducts.slice(1, 4);

export default function FavoritesPage() {
  return (
    <StoreScreen title="Favorites" subtitle="Save products for later">
      <StoreSection title="Saved picks">
        <div className={styles.catalogGrid}>
          {favoriteSamples.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              href={`/products/${product.id}`}
            />
          ))}
        </div>
      </StoreSection>

      <StoreEmptyState
        title="Favorites are placeholder-only"
        description="Real save/remove behavior will be added with user data integration."
        actionLabel="Explore catalog"
        actionHref="/catalog"
      />
    </StoreScreen>
  );
}
