import Link from 'next/link';

import { TelegramSessionRequiredState } from '@/components/auth/TelegramSessionRequiredState';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { formatPaymentStatus } from '@/features/payments';
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
      return 'Подтверждён';
    case 'processing':
      return 'В обработке';
    case 'shipped':
      return 'Отправлен';
    case 'delivered':
      return 'Доставлен';
    case 'cancelled':
      return 'Отменён';
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

function getPaymentStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return styles.paymentStatusPending;
    case 'requires_action':
      return styles.paymentStatusAction;
    case 'paid':
      return styles.paymentStatusPaid;
    case 'failed':
      return styles.paymentStatusFailed;
    case 'cancelled':
      return styles.paymentStatusCancelled;
    case 'expired':
      return styles.paymentStatusExpired;
    default:
      return '';
  }
}

function getOrderListHint(input: { canRetryPayment: boolean; status: string; paymentStatus: string }): string {
  if (input.canRetryPayment) {
    return 'Нужно завершить оплату';
  }
  if (input.status === 'processing') {
    return 'Заказ собирается';
  }
  if (input.status === 'shipped') {
    return 'Заказ уже в пути';
  }
  if (input.status === 'delivered') {
    return 'Заказ завершён';
  }
  if (input.status === 'cancelled') {
    return 'Заказ отменён';
  }
  if (input.paymentStatus === 'paid') {
    return 'Оплата подтверждена';
  }

  return 'Следите за обновлениями статуса';
}

export default async function OrdersPage() {
  const { profile } = await getCurrentUserContext();
  const ordersData = await getOrdersForProfile(profile?.id ?? null);
  const isSessionMissing = ordersData.status === 'unauthorized';

  if (isSessionMissing) {
    return (
      <StoreScreen title="Мои заказы" subtitle="История покупок, оплата и текущие статусы в одном месте">
        <TelegramSessionRequiredState
          fallbackTitle="Нужна сессия Telegram"
          fallbackDescription="Откройте MainStore в Telegram, чтобы увидеть историю заказов."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/orders"
        />
      </StoreScreen>
    );
  }

  return (
    <StoreScreen title="Мои заказы" subtitle="История покупок, оплата и текущие статусы в одном месте">
      {ordersData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            ordersData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление заказов</p>
          <p className={styles.dataNoticeText}>{ordersData.message}</p>
          {(ordersData.status === 'error' || ordersData.status === 'not_configured') ? (
            <div className={styles.dataNoticeActions}>
              <Link href="/orders" className={styles.dataNoticeRetry} aria-label="Повторить загрузку заказов">
                Повторить
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {isSessionMissing ? (
        <TelegramSessionRequiredState
          fallbackTitle="Нужна сессия Telegram"
          fallbackDescription="Откройте MainStore в Telegram, чтобы увидеть историю заказов."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/orders"
        />
      ) : null}

      <StoreSection title="Статистика">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Всего заказов</p>
            <p className={styles.infoValue}>{ordersData.totalOrders}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>В работе</p>
            <p className={styles.infoValue}>{ordersData.inProgressOrders}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Ждут действия</p>
            <p className={styles.infoValue}>{ordersData.actionRequiredOrders}</p>
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

      {ordersData.orders.length > 0 ? (
        <StoreSection title="История заказов">
          <div className={styles.orderList}>
            {ordersData.orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={styles.orderCard}
                aria-label={`Открыть заказ ${order.id}`}
              >
                <div className={styles.orderCardHeader}>
                  <p className={styles.orderCardId}>Заказ #{order.id.slice(0, 8).toUpperCase()}</p>
                  <p className={styles.orderMetaItem}>{formatOrderDate(order.createdAt)}</p>
                </div>

                <div className={styles.paymentBadgeRow}>
                  <span className={classNames(styles.orderStatusBadge, getOrderStatusClass(order.status))}>
                    {formatOrderStatus(order.status)}
                  </span>
                  <span className={classNames(styles.paymentStatusBadge, getPaymentStatusClass(order.paymentStatus))}>
                    {formatPaymentStatus(order.paymentStatus)}
                  </span>
                </div>

                <p className={styles.orderCardHint}>{getOrderListHint(order)}</p>
                {order.previewTitle ? (
                  <p className={styles.orderCardPreview}>
                    {order.previewTitle}
                    {order.itemsCount > 1 ? ` и ещё ${order.itemsCount - 1}` : ''}
                  </p>
                ) : null}

                <div className={styles.orderMetaGrid}>
                  <p className={styles.orderMetaItem}>{formatStorePrice(order.totalCents, order.currency)}</p>
                  <p className={styles.orderMetaItem}>{order.itemsCount} шт.</p>
                  <p className={styles.orderMetaItem}>
                    {order.canRetryPayment ? 'Открыть и оплатить' : 'Открыть детали'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </StoreSection>
      ) : null}
    </StoreScreen>
  );
}
