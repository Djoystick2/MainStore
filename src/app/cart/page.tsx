import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import styles from '@/components/store/store.module.css';

export default function CartPage() {
  return (
    <StoreScreen title="Cart" subtitle="Your selected products will appear here">
      <StoreSection title="Summary">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Items</p>
            <p className={styles.infoValue}>0</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Estimated total</p>
            <p className={styles.infoValue}>$0</p>
          </div>
        </div>
      </StoreSection>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Checkout readiness</h2>
        <p className={styles.panelText}>
          Delivery methods, promo codes, and payment confirmation will be added
          with backend integration.
        </p>
      </section>

      <StoreEmptyState
        title="Your cart is empty"
        description="Add products from catalog. Quantity updates and checkout actions will be wired in the next stage."
        actionLabel="Go to catalog"
        actionHref="/catalog"
      />
    </StoreScreen>
  );
}
