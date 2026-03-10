import Link from 'next/link';
import type { CSSProperties } from 'react';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getOrderDetailForProfile } from '@/features/orders/data';
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

function buildImageStyle(imageUrl: string | null): CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.15), rgba(12, 18, 31, 0.15)), url(${imageUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }

  return {
    background: 'linear-gradient(135deg, #9fb8ff 0%, #5f7de8 100%)',
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const { profile } = await getCurrentUserContext();
  const orderData = await getOrderDetailForProfile(profile?.id ?? null, orderId);
  const order = orderData.order;

  return (
    <StoreScreen title="Order" subtitle="Order details and delivery info" back={true}>
      {orderData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            orderData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Order update</p>
          <p className={styles.dataNoticeText}>{orderData.message}</p>
        </section>
      )}

      {orderData.status === 'unauthorized' ? (
        <StoreEmptyState
          title="Order details need Telegram session"
          description="Open MainStore in Telegram to view your orders."
          actionLabel="Open catalog"
          actionHref="/catalog"
        />
      ) : null}

      {orderData.status === 'not_found' ? (
        <StoreEmptyState
          title="Order not found"
          description="This order does not exist or does not belong to your account."
          actionLabel="Back to orders"
          actionHref="/orders"
        />
      ) : null}

      {order ? (
        <>
          <section className={styles.panel}>
            <div className={styles.orderCardHeader}>
              <h2 className={styles.panelTitle}>
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <span
                className={classNames(
                  styles.orderStatusBadge,
                  getOrderStatusClass(order.status),
                )}
              >
                {formatOrderStatus(order.status)}
              </span>
            </div>
            <p className={styles.panelText}>{formatOrderDate(order.createdAt)}</p>
          </section>

          <StoreSection title="Summary">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Subtotal</p>
                <p className={styles.infoValue}>
                  {formatStorePrice(order.subtotalCents, order.currency)}
                </p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Total</p>
                <p className={styles.infoValue}>
                  {formatStorePrice(order.totalCents, order.currency)}
                </p>
              </div>
            </div>
          </StoreSection>

          <StoreSection title="Shipping">
            <div className={styles.orderDetailsGrid}>
              <p className={styles.orderDetailsValue}>
                {order.customerDisplayName || 'Customer'}
              </p>
              <p className={styles.orderDetailsValue}>
                {order.customerPhone || 'Phone not specified'}
              </p>
              <p className={styles.orderDetailsMuted}>
                {order.shippingAddress.city || 'City not specified'}
              </p>
              <p className={styles.orderDetailsMuted}>
                {order.shippingAddress.addressLine || 'Address not specified'}
              </p>
              {order.shippingAddress.postalCode && (
                <p className={styles.orderDetailsMuted}>
                  Postal: {order.shippingAddress.postalCode}
                </p>
              )}
            </div>
          </StoreSection>

          <StoreSection title="Items">
            <div className={styles.orderItemsList}>
              {order.items.map((item) => {
                const preview = (
                  <>
                    <div
                      className={styles.orderItemImage}
                      style={buildImageStyle(item.productImageUrl)}
                    />
                    <div className={styles.orderItemMeta}>
                      <p className={styles.orderItemTitle}>{item.productTitle}</p>
                      <p className={styles.orderItemSub}>
                        {item.quantity} x{' '}
                        {formatStorePrice(item.unitPriceCents, item.currency)}
                      </p>
                      <p className={styles.orderItemTotal}>
                        {formatStorePrice(item.lineTotalCents, item.currency)}
                      </p>
                    </div>
                  </>
                );

                if (item.productSlug) {
                  return (
                    <Link
                      key={item.id}
                      href={`/products/${item.productSlug}`}
                      className={styles.orderItemRow}
                      aria-label={`Open ${item.productTitle}`}
                    >
                      {preview}
                    </Link>
                  );
                }

                return (
                  <article key={item.id} className={styles.orderItemRow}>
                    {preview}
                  </article>
                );
              })}
            </div>
          </StoreSection>

          {order.notes && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Customer comment</h2>
              <p className={styles.panelText}>{order.notes}</p>
            </section>
          )}
        </>
      ) : null}
    </StoreScreen>
  );
}
