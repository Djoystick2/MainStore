import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import styles from '@/components/store/store.module.css';

export default function AdminPage() {
  return (
    <StoreScreen title="Admin" subtitle="Technical route outside customer navigation">
      <StoreSection title="Dashboard">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Products</p>
            <p className={styles.infoValue}>0</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Pending orders</p>
            <p className={styles.infoValue}>0</p>
          </div>
        </div>
      </StoreSection>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Admin workspace</h2>
        <p className={styles.panelText}>
          Product editing, moderation workflows, and role checks are intentionally
          not connected in this stage.
        </p>
      </section>

      <StoreEmptyState
        title="Backend hooks are not connected"
        description="This route remains visual-only for now and ready for role-based access in the next stage."
      />
    </StoreScreen>
  );
}
