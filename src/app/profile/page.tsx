import Link from 'next/link';

import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import styles from '@/components/store/store.module.css';

export default function ProfilePage() {
  return (
    <StoreScreen title="Profile" subtitle="Your account and purchase flow">
      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Guest account</h2>
        <p className={styles.panelText}>
          Sign in, address book, and payment data will be connected later. The
          screen is focused on key customer actions.
        </p>
      </section>

      <StoreSection title="Your shortcuts">
        <div className={styles.actionList}>
          <Link href="/orders" className={styles.actionItem} aria-label="Open my orders">
            <div>
              <p className={styles.actionItemTitle}>My orders</p>
              <p className={styles.actionItemSub}>Track status and history</p>
            </div>
            <span className={styles.actionItemIcon}>GO</span>
          </Link>

          <Link
            href="/favorites"
            className={styles.actionItem}
            aria-label="Open favorites"
          >
            <div>
              <p className={styles.actionItemTitle}>Favorites</p>
              <p className={styles.actionItemSub}>Saved products in one place</p>
            </div>
            <span className={styles.actionItemIcon}>GO</span>
          </Link>

        </div>
      </StoreSection>
    </StoreScreen>
  );
}
