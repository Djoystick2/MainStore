import Link from 'next/link';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getOrdersForProfile } from '@/features/orders/data';
import styles from '@/components/store/store.module.css';

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatOrderStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'processing':
      return 'Processing';
    case 'shipped':
      return 'Shipped';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function getOrderStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return styles.orderStatusPending;
    case 'confirmed':
      return styles.orderStatusConfirmed;
    case 'processing':
      return styles.orderStatusProcessing;
    case 'shipped':
      return styles.orderStatusShipped;
    case 'delivered':
      return styles.orderStatusDelivered;
    case 'cancelled':
      return styles.orderStatusCancelled;
    default:
      return '';
  }
}

export default async function OrdersPage() {
  const { profile } = await getCurrentUserContext();
  const ordersData = await getOrdersForProfile(profile?.id ?? null);
  const isSessionMissing = ordersData.status === 'unauthorized';

  return (
    <StoreScreen title="My Orders" subtitle="Track each purchase in one place">
      {ordersData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            ordersData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Orders update</p>
          <p className={styles.dataNoticeText}>{ordersData.message}</p>
        </section>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Orders need Telegram session"
          description="Open MainStore in Telegram to access your order history."
          actionLabel="Open catalog"
          actionHref="/catalog"
        />
      ) : null}

      <StoreSection title="Order stats">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Total orders</p>
            <p className={styles.infoValue}>{ordersData.totalOrders}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>In progress</p>
            <p className={styles.infoValue}>{ordersData.inProgressOrders}</p>
          </div>
        </div>
      </StoreSection>

      {ordersData.status === 'ok' && ordersData.orders.length === 0 ? (
        <StoreEmptyState
          title="No orders yet"
          description="Place your first order from checkout and it will appear here."
          actionLabel="Browse catalog"
          actionHref="/catalog"
        />
      ) : null}

      {ordersData.orders.length > 0 && (
        <StoreSection title="Recent orders">
          <div className={styles.orderList}>
            {ordersData.orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={styles.orderCard}
                aria-label={`Open order ${order.id}`}
              >
                <div className={styles.orderCardHeader}>
                  <p className={styles.orderCardId}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span
                    className={classNames(
                      styles.orderStatusBadge,
                      getOrderStatusClass(order.status),
                    )}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                </div>
                <div className={styles.orderMetaGrid}>
                  <p className={styles.orderMetaItem}>{formatOrderDate(order.createdAt)}</p>
                  <p className={styles.orderMetaItem}>
                    {formatStorePrice(order.totalCents, order.currency)}
                  </p>
                  <p className={styles.orderMetaItem}>{order.itemsCount} items</p>
                </div>
              </Link>
            ))}
          </div>
        </StoreSection>
      )}
    </StoreScreen>
  );
}
