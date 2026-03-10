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
    <AdminScreen title="Заказ" subtitle="Снимок заказа и управление статусом" back={true}>
      {detailResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            detailResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление заказа</p>
          <p className={storeStyles.dataNoticeText}>{detailResult.message}</p>
          {(detailResult.status === 'error' || detailResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href={`/admin/orders/${orderId}`}
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку заказа"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      <Link href="/admin/orders" className={adminStyles.adminActionLink}>
        К заказам
      </Link>

      {!order ? (
        <StoreEmptyState
          title="Заказ не найден"
          description="Запрошенный заказ не существует."
          actionLabel="К заказам"
          actionHref="/admin/orders"
        />
      ) : (
        <>
          <section className={adminStyles.adminCard}>
            <div className={adminStyles.adminCardHead}>
              <h2 className={adminStyles.adminCardTitle}>
                Заказ #{order.id.slice(0, 8).toUpperCase()}
              </h2>
              <span className={storeStyles.orderStatusBadge}>{order.status}</span>
            </div>
            <p className={adminStyles.adminCardSub}>
              {new Date(order.createdAt).toLocaleString('en-US')}
            </p>
            <div className={adminStyles.adminMetaGrid}>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Итого</p>
                <p className={adminStyles.adminMetaValue}>
                  {formatPrice(order.totalAmount, order.currency)}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Подытог</p>
                <p className={adminStyles.adminMetaValue}>
                  {formatPrice(order.subtotalAmount, order.currency)}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Скидка</p>
                <p className={adminStyles.adminMetaValue}>
                  {formatPrice(order.discountAmount, order.currency)}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Покупатель</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.customerDisplayName || order.customerUsername || order.userId}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Телефон</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.customerPhone || 'н/д'}
                </p>
              </div>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Снимок доставки</h2>
            <p className={adminStyles.adminCardSub}>
              {order.shippingAddress.city || 'Город не указан'}
            </p>
            <p className={adminStyles.adminCardSub}>
              {order.shippingAddress.addressLine || 'Адрес не указан'}
            </p>
            {order.shippingAddress.postalCode && (
              <p className={adminStyles.adminCardSub}>
                Индекс: {order.shippingAddress.postalCode}
              </p>
            )}
            {order.notes && <p className={adminStyles.adminCardSub}>Комментарий: {order.notes}</p>}
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Товары</h2>
            <div className={adminStyles.adminCardList}>
              {order.items.map((item) => (
                <article key={item.id} className={adminStyles.adminImageCard}>
                  <p className={adminStyles.adminCardTitle}>{item.productTitle}</p>
                  <p className={adminStyles.adminCardSub}>
                    {item.quantity} x {formatPrice(item.unitPrice, item.currency)}
                  </p>
                  <p className={adminStyles.adminCardSub}>
                    Сумма: {formatPrice(item.lineTotal, item.currency)}
                  </p>
                  {item.productSlug && (
                    <Link
                      href={`/products/${item.productSlug}`}
                      className={adminStyles.adminActionLink}
                    >
                      Открыть в витрине
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Обновить статус</h2>
            <AdminOrderStatusControl orderId={order.id} initialStatus={order.status} />
          </section>
        </>
      )}
    </AdminScreen>
  );
}
