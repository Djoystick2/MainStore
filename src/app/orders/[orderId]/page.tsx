import Link from 'next/link';
import type { CSSProperties } from 'react';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { OrderPaymentAction } from '@/components/store/OrderPaymentAction';
import { OrderRepeatAction } from '@/components/store/OrderRepeatAction';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { formatPaymentProvider, formatPaymentStatus } from '@/features/payments';
import { getOrderDetailForProfile } from '@/features/orders/data';
import styles from '@/components/store/store.module.css';

function formatOrderDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

function mapPaymentQueryNotice(value: string | undefined): { title: string; text: string; isError?: boolean } | null {
  switch (value) {
    case 'success':
      return {
        title: 'Оплата подтверждена',
        text: 'Платёж завершён, заказ переведён в подтверждённое состояние.',
      };
    case 'cancel':
      return {
        title: 'Оплата отменена',
        text: 'Вы можете вернуться к заказу и запустить оплату повторно.',
        isError: true,
      };
    case 'failed':
      return {
        title: 'Оплата не прошла',
        text: 'Проверьте заказ и попробуйте оплатить его ещё раз.',
        isError: true,
      };
    default:
      return null;
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

function getNextActionSummary(input: {
  status: string;
  paymentStatus: string;
  canRetryPayment: boolean;
}): { title: string; text: string } {
  if (input.canRetryPayment) {
    return {
      title: 'Нужно завершить оплату',
      text: 'Заказ уже создан. Продолжите оплату, чтобы магазин начал его обработку.',
    };
  }

  if (input.status === 'processing') {
    return {
      title: 'Заказ в работе',
      text: 'Мы уже обрабатываем заказ. Следующее заметное обновление появится, когда он будет отправлен.',
    };
  }

  if (input.status === 'shipped') {
    return {
      title: 'Заказ отправлен',
      text: 'Дальше остаётся дождаться доставки. Все позиции и адрес сохранены в деталях ниже.',
    };
  }

  if (input.status === 'delivered') {
    return {
      title: 'Заказ завершён',
      text: 'Можно вернуться в каталог или повторить заказ, если хотите купить эти позиции снова.',
    };
  }

  if (input.status === 'cancelled') {
    return {
      title: 'Заказ отменён',
      text: 'Если позиции всё ещё актуальны, можно собрать новый заказ через каталог или повтор заказа.',
    };
  }

  if (input.paymentStatus === 'paid') {
    return {
      title: 'Оплата подтверждена',
      text: 'Заказ оплачен и ожидает дальнейшего обновления статуса магазина.',
    };
  }

  return {
    title: 'Следите за статусом',
    text: 'Все обновления по оплате и обработке будут появляться прямо в этой карточке.',
  };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams?: Promise<{ payment?: string }>;
}) {
  const { orderId } = await params;
  const paymentNotice = mapPaymentQueryNotice((await searchParams)?.payment);
  const { profile } = await getCurrentUserContext();
  const orderData = await getOrderDetailForProfile(profile?.id ?? null, orderId);
  const order = orderData.order;

  if (orderData.status === 'unauthorized') {
    return (
      <StoreScreen title="Заказ" subtitle="Детали заказа и доставка" back={true}>
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы посмотреть свои заказы."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      </StoreScreen>
    );
  }

  if (orderData.status === 'not_found') {
    return (
      <StoreScreen title="Заказ" subtitle="Детали заказа и доставка" back={true}>
        <StoreEmptyState
          title="Заказ не найден"
          description="Такого заказа нет или он не относится к вашему аккаунту."
          actionLabel="К заказам"
          actionHref="/orders"
        />
      </StoreScreen>
    );
  }

  const nextAction = order
    ? getNextActionSummary({
        status: order.status,
        paymentStatus: order.paymentStatus,
        canRetryPayment: order.canRetryPayment,
      })
    : null;

  return (
    <StoreScreen title="Заказ" subtitle="Детали заказа и доставка" back={true}>
      {paymentNotice ? (
        <section className={classNames(styles.dataNotice, paymentNotice.isError && styles.dataNoticeError)}>
          <p className={styles.dataNoticeTitle}>{paymentNotice.title}</p>
          <p className={styles.dataNoticeText}>{paymentNotice.text}</p>
        </section>
      ) : null}

      {orderData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            orderData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление заказа</p>
          <p className={styles.dataNoticeText}>{orderData.message}</p>
          {(orderData.status === 'error' || orderData.status === 'not_configured') ? (
            <div className={styles.dataNoticeActions}>
              <Link href={`/orders/${orderId}`} className={styles.dataNoticeRetry} aria-label="Повторить загрузку заказа">
                Повторить
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {order ? (
        <>
          <section className={styles.panel}>
            <div className={styles.orderCardHeader}>
              <h2 className={styles.panelTitle}>Заказ #{order.id.slice(0, 8).toUpperCase()}</h2>
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

            <p className={styles.checkoutHint}>Провайдер: {formatPaymentProvider(order.paymentProvider)}</p>
            {order.paymentCompletedAt ? (
              <p className={styles.checkoutHint}>Оплата подтверждена {formatOrderDate(order.paymentCompletedAt)}</p>
            ) : null}
            {order.paymentLastError ? (
              <p className={classNames(styles.inlineActionMessage, styles.inlineActionMessageError)}>{order.paymentLastError}</p>
            ) : null}
          </section>

          {nextAction ? (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>{nextAction.title}</h2>
              <p className={styles.panelText}>{nextAction.text}</p>
              <div className={styles.panelActions}>
                {order.canRetryPayment ? <OrderPaymentAction orderId={order.id} label="Продолжить оплату" /> : null}
                <OrderRepeatAction orderId={order.id} />
                <Link href="/catalog" className={styles.secondaryButton}>
                  Вернуться в каталог
                </Link>
              </div>
            </section>
          ) : null}

          <StoreSection title="Сводка">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Подытог</p>
                <p className={styles.infoValue}>{formatStorePrice(order.subtotalCents, order.currency)}</p>
              </div>
              {order.discountCents > 0 ? (
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Скидка</p>
                  <p className={styles.infoValue}>{formatStorePrice(order.discountCents, order.currency)}</p>
                </div>
              ) : null}
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Итого</p>
                <p className={styles.infoValue}>{formatStorePrice(order.totalCents, order.currency)}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Позиции</p>
                <p className={styles.infoValue}>{order.items.length}</p>
              </div>
            </div>
          </StoreSection>

          <StoreSection title="Доставка">
            <div className={styles.orderDetailsGrid}>
              <p className={styles.orderDetailsValue}>{order.customerDisplayName || 'Покупатель'}</p>
              <p className={styles.orderDetailsValue}>{order.customerPhone || 'Телефон не указан'}</p>
              <p className={styles.orderDetailsMuted}>{order.shippingAddress.city || 'Город не указан'}</p>
              <p className={styles.orderDetailsMuted}>{order.shippingAddress.addressLine || 'Адрес не указан'}</p>
              {order.shippingAddress.postalCode ? (
                <p className={styles.orderDetailsMuted}>Индекс: {order.shippingAddress.postalCode}</p>
              ) : null}
            </div>
          </StoreSection>

          <StoreSection title="Состав заказа">
            <div className={styles.orderItemsList}>
              {order.items.map((item) => {
                const preview = (
                  <>
                    <div className={styles.orderItemImage} style={buildImageStyle(item.productImageUrl)} />
                    <div className={styles.orderItemMeta}>
                      <p className={styles.orderItemTitle}>{item.productTitle}</p>
                      <p className={styles.orderItemSub}>
                        {item.quantity} x {formatStorePrice(item.unitPriceCents, item.currency)}
                      </p>
                      <p className={styles.orderItemTotal}>{formatStorePrice(item.lineTotalCents, item.currency)}</p>
                    </div>
                  </>
                );

                if (item.productSlug) {
                  return (
                    <Link
                      key={item.id}
                      href={`/products/${item.productSlug}`}
                      className={styles.orderItemRow}
                      aria-label={`Открыть товар ${item.productTitle}`}
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

          {order.notes ? (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Комментарий к заказу</h2>
              <p className={styles.panelText}>{order.notes}</p>
            </section>
          ) : null}
        </>
      ) : null}
    </StoreScreen>
  );
}
