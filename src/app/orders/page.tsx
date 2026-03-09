import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import styles from '@/components/store/store.module.css';

export default function OrdersPage() {
  return (
    <StoreScreen title="My Orders" subtitle="Track every purchase from profile">
      <StoreSection title="Order stats">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Total orders</p>
            <p className={styles.infoValue}>0</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>In progress</p>
            <p className={styles.infoValue}>0</p>
          </div>
        </div>
      </StoreSection>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Status flow</h2>
        <p className={styles.panelText}>
          Ordered, packed, shipped, and delivered states are prepared as UI
          placeholders for future live data.
        </p>
      </section>

      <StoreEmptyState
        title="No orders yet"
        description="Order list, statuses, and tracking timeline will be connected after backend integration."
        actionLabel="Browse catalog"
        actionHref="/catalog"
      />
    </StoreScreen>
  );
}
