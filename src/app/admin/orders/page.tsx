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
    <AdminScreen title="Заказы" subtitle="Управление статусами и деталями заказов">
      {ordersResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            ordersResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление заказов</p>
          <p className={storeStyles.dataNoticeText}>{ordersResult.message}</p>
          {(ordersResult.status === 'error' || ordersResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/orders"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку заказов"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {ordersResult.orders.length === 0 ? (
        <StoreEmptyState
          title="Заказов пока нет"
          description="Заказы появятся здесь после оформления клиентами."
        />
      ) : (
        <section className={storeStyles.section}>
          <h2 className={storeStyles.sectionTitle}>Все заказы</h2>
          <div className={adminStyles.adminCardList}>
            {ordersResult.orders.map((order) => (
              <article key={order.id} className={adminStyles.adminCard}>
                <div className={adminStyles.adminCardHead}>
                  <h3 className={adminStyles.adminCardTitle}>
                    Заказ #{order.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <span className={storeStyles.orderStatusBadge}>{order.status}</span>
                </div>
                <p className={adminStyles.adminCardSub}>
                  {order.customerDisplayName || order.customerUsername || order.userId}
                </p>
                <div className={adminStyles.adminMetaGrid}>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Итого</p>
                    <p className={adminStyles.adminMetaValue}>
                      {formatPrice(order.totalAmount, order.currency)}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Товаров</p>
                    <p className={adminStyles.adminMetaValue}>{order.itemsCount}</p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Дата</p>
                    <p className={adminStyles.adminMetaValue}>
                      {new Date(order.createdAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Пользователь</p>
                    <p className={adminStyles.adminMetaValue}>
                      {order.customerUsername || 'н/д'}
                    </p>
                  </div>
                </div>
                <div className={adminStyles.adminActions}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className={adminStyles.adminActionLink}
                  >
                    Открыть
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
