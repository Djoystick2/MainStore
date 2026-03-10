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
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatOrderStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ожидает';
    case 'confirmed':
      return 'Подтвержден';
    case 'processing':
      return 'В обработке';
    case 'shipped':
      return 'Отправлен';
    case 'delivered':
      return 'Доставлен';
    case 'cancelled':
      return 'Отменен';
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
    <StoreScreen title="Мои заказы" subtitle="Отслеживайте все покупки в одном месте">
      {ordersData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            ordersData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление заказов</p>
          <p className={styles.dataNoticeText}>{ordersData.message}</p>
          {(ordersData.status === 'error' || ordersData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/orders"
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку заказов"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы увидеть историю заказов."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : null}

      <StoreSection title="Статистика заказов">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Всего заказов</p>
            <p className={styles.infoValue}>{ordersData.totalOrders}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>В работе</p>
            <p className={styles.infoValue}>{ordersData.inProgressOrders}</p>
          </div>
        </div>
      </StoreSection>

      {ordersData.status === 'ok' && ordersData.orders.length === 0 ? (
        <StoreEmptyState
          title="Заказов пока нет"
          description="Оформите первый заказ, и он появится здесь."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : null}

      {ordersData.orders.length > 0 && (
        <StoreSection title="Последние заказы">
          <div className={styles.orderList}>
            {ordersData.orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={styles.orderCard}
                aria-label={`Открыть заказ ${order.id}`}
              >
                <div className={styles.orderCardHeader}>
                  <p className={styles.orderCardId}>
                    Заказ #{order.id.slice(0, 8).toUpperCase()}
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
                  <p className={styles.orderMetaItem}>{order.itemsCount} шт.</p>
                </div>
              </Link>
            ))}
          </div>
        </StoreSection>
      )}
    </StoreScreen>
  );
}
