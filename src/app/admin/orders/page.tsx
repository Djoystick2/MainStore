import Link from 'next/link';

import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminOrders } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminOrdersPage() {
  const ordersResult = await getAdminOrders();

  return (
    <AdminScreen title="Admin Orders" subtitle="Manage order status and details">
      {ordersResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            ordersResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Orders update</p>
          <p className={storeStyles.dataNoticeText}>{ordersResult.message}</p>
          {(ordersResult.status === 'error' || ordersResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/orders"
                className={storeStyles.dataNoticeRetry}
                aria-label="Retry loading admin orders"
              >
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      {ordersResult.orders.length === 0 ? (
        <StoreEmptyState
          title="No orders yet"
          description="Orders will appear here after customer checkout."
        />
      ) : (
        <section className={storeStyles.section}>
          <h2 className={storeStyles.sectionTitle}>All orders</h2>
          <div className={adminStyles.adminCardList}>
            {ordersResult.orders.map((order) => (
              <article key={order.id} className={adminStyles.adminCard}>
                <div className={adminStyles.adminCardHead}>
                  <h3 className={adminStyles.adminCardTitle}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <span className={storeStyles.orderStatusBadge}>{order.status}</span>
                </div>
                <p className={adminStyles.adminCardSub}>
                  {order.customerDisplayName || order.customerUsername || order.userId}
                </p>
                <div className={adminStyles.adminMetaGrid}>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Total</p>
                    <p className={adminStyles.adminMetaValue}>
                      {formatPrice(order.totalAmount, order.currency)}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Items</p>
                    <p className={adminStyles.adminMetaValue}>{order.itemsCount}</p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Date</p>
                    <p className={adminStyles.adminMetaValue}>
                      {new Date(order.createdAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>User</p>
                    <p className={adminStyles.adminMetaValue}>
                      {order.customerUsername || 'n/a'}
                    </p>
                  </div>
                </div>
                <div className={adminStyles.adminActions}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className={adminStyles.adminActionLink}
                  >
                    Open details
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </AdminScreen>
  );
}
