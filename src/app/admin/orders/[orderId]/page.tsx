import Link from 'next/link';

import { AdminOrderStatusControl } from '@/components/admin/AdminOrderStatusControl';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminOrderDetail } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const detailResult = await getAdminOrderDetail(orderId);
  const order = detailResult.order;

  return (
    <AdminScreen title="Order Detail" subtitle="Snapshot and status management" back={true}>
      {detailResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            detailResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Order details update</p>
          <p className={storeStyles.dataNoticeText}>{detailResult.message}</p>
          {(detailResult.status === 'error' || detailResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href={`/admin/orders/${orderId}`}
                className={storeStyles.dataNoticeRetry}
                aria-label="Retry loading admin order details"
              >
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      <Link href="/admin/orders" className={adminStyles.adminActionLink}>
        Back to orders
      </Link>

      {!order ? (
        <StoreEmptyState
          title="Order not found"
          description="Requested order does not exist."
          actionLabel="Back to orders"
          actionHref="/admin/orders"
        />
      ) : (
        <>
          <section className={adminStyles.adminCard}>
            <div className={adminStyles.adminCardHead}>
              <h2 className={adminStyles.adminCardTitle}>
                Order #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <span className={storeStyles.orderStatusBadge}>{order.status}</span>
            </div>
            <p className={adminStyles.adminCardSub}>
              {new Date(order.createdAt).toLocaleString('en-US')}
            </p>
            <div className={adminStyles.adminMetaGrid}>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Total</p>
                <p className={adminStyles.adminMetaValue}>
                  {formatPrice(order.totalAmount, order.currency)}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Subtotal</p>
                <p className={adminStyles.adminMetaValue}>
                  {formatPrice(order.subtotalAmount, order.currency)}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Customer</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.customerDisplayName || order.customerUsername || order.userId}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Phone</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.customerPhone || 'n/a'}
                </p>
              </div>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Shipping snapshot</h2>
            <p className={adminStyles.adminCardSub}>
              {order.shippingAddress.city || 'City not specified'}
            </p>
            <p className={adminStyles.adminCardSub}>
              {order.shippingAddress.addressLine || 'Address not specified'}
            </p>
            {order.shippingAddress.postalCode && (
              <p className={adminStyles.adminCardSub}>
                Postal code: {order.shippingAddress.postalCode}
              </p>
            )}
            {order.notes && <p className={adminStyles.adminCardSub}>Notes: {order.notes}</p>}
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Items</h2>
            <div className={adminStyles.adminCardList}>
              {order.items.map((item) => (
                <article key={item.id} className={adminStyles.adminImageCard}>
                  <p className={adminStyles.adminCardTitle}>{item.productTitle}</p>
                  <p className={adminStyles.adminCardSub}>
                    {item.quantity} x {formatPrice(item.unitPrice, item.currency)}
                  </p>
                  <p className={adminStyles.adminCardSub}>
                    Line total: {formatPrice(item.lineTotal, item.currency)}
                  </p>
                  {item.productSlug && (
                    <Link
                      href={`/products/${item.productSlug}`}
                      className={adminStyles.adminActionLink}
                    >
                      Open storefront product
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Update order status</h2>
            <AdminOrderStatusControl orderId={order.id} initialStatus={order.status} />
          </section>
        </>
      )}
    </AdminScreen>
  );
}
