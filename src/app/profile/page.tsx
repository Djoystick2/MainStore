import Link from 'next/link';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getOrdersForProfile } from '@/features/orders/data';
import { getUserStoreSummaryForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

function formatOrderStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function ProfilePage() {
  const { profile } = await getCurrentUserContext();
  const [summary, ordersData] = await Promise.all([
    getUserStoreSummaryForProfile(profile?.id ?? null),
    getOrdersForProfile(profile?.id ?? null),
  ]);
  const latestOrder = ordersData.orders[0] ?? null;
  const displayName = profile?.displayName || profile?.username || 'Telegram user';
  const username = profile?.username ? `@${profile.username}` : 'No username';

  return (
    <StoreScreen title="Profile" subtitle="Account, history, and quick actions">
      {profile ? (
        <>
          {ordersData.message && (
            <section
              className={classNames(
                styles.dataNotice,
                ordersData.status === 'error' && styles.dataNoticeError,
              )}
            >
              <p className={styles.dataNoticeTitle}>Profile update</p>
              <p className={styles.dataNoticeText}>{ordersData.message}</p>
              {(ordersData.status === 'error' ||
                ordersData.status === 'not_configured') && (
                <div className={styles.dataNoticeActions}>
                  <Link
                    href="/profile"
                    className={styles.dataNoticeRetry}
                    aria-label="Retry loading profile"
                  >
                    Retry
                  </Link>
                </div>
              )}
            </section>
          )}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{displayName}</h2>
            <p className={styles.panelText}>
              {username}
              <br />
              Role: {profile.role}
            </p>
          </section>

          <StoreSection title="Activity">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Favorites</p>
                <p className={styles.infoValue}>{summary.favoritesCount}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Cart qty</p>
                <p className={styles.infoValue}>{summary.cartQuantityTotal}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Orders</p>
                <p className={styles.infoValue}>{ordersData.totalOrders}</p>
              </div>
            </div>
          </StoreSection>

          {latestOrder && (
            <StoreSection title="Latest order">
              <Link
                href={`/orders/${latestOrder.id}`}
                className={styles.orderCard}
                aria-label="Open latest order"
              >
                <div className={styles.orderCardHeader}>
                  <p className={styles.orderCardId}>
                    Order #{latestOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span className={styles.orderStatusBadge}>
                    {formatOrderStatus(latestOrder.status)}
                  </span>
                </div>
                <p className={styles.orderMetaItem}>
                  {formatStorePrice(latestOrder.totalCents, latestOrder.currency)}
                </p>
              </Link>
            </StoreSection>
          )}
        </>
      ) : (
        <StoreEmptyState
          title="No active session"
          description="Open MainStore in Telegram to load your profile, favorites, and cart."
          actionLabel="Browse catalog"
          actionHref="/catalog"
        />
      )}

      <StoreSection title="Your shortcuts">
        <div className={styles.actionList}>
          <Link href="/orders" className={styles.actionItem} aria-label="Open my orders">
            <div>
              <p className={styles.actionItemTitle}>My orders</p>
              <p className={styles.actionItemSub}>Track status and history</p>
            </div>
            <span className={styles.actionItemIcon}>GO</span>
          </Link>

          <Link href="/favorites" className={styles.actionItem} aria-label="Open favorites">
            <div>
              <p className={styles.actionItemTitle}>Favorites</p>
              <p className={styles.actionItemSub}>Saved products in one place</p>
            </div>
            <span className={styles.actionItemIcon}>GO</span>
          </Link>

          <Link href="/cart" className={styles.actionItem} aria-label="Open cart">
            <div>
              <p className={styles.actionItemTitle}>Cart</p>
              <p className={styles.actionItemSub}>Review products before checkout</p>
            </div>
            <span className={styles.actionItemIcon}>GO</span>
          </Link>
        </div>
      </StoreSection>
    </StoreScreen>
  );
}
