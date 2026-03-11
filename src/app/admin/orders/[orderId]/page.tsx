import Link from 'next/link';

import { AdminOrderStatusControl } from '@/components/admin/AdminOrderStatusControl';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminOrderDetail } from '@/features/admin';
import {
  canRetryPayment,
  formatPaymentProvider,
  formatPaymentStatus,
} from '@/features/payments';
import storeStyles from '@/components/store/store.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
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
      return storeStyles.orderStatusPending;
    case 'confirmed':
      return storeStyles.orderStatusConfirmed;
    case 'processing':
      return storeStyles.orderStatusProcessing;
    case 'shipped':
      return storeStyles.orderStatusShipped;
    case 'delivered':
      return storeStyles.orderStatusDelivered;
    case 'cancelled':
      return storeStyles.orderStatusCancelled;
    default:
      return '';
  }
}

function getPaymentStatusClass(status: string): string {
  switch (status) {
    case 'pending':
      return storeStyles.paymentStatusPending;
    case 'requires_action':
      return storeStyles.paymentStatusAction;
    case 'paid':
      return storeStyles.paymentStatusPaid;
    case 'failed':
      return storeStyles.paymentStatusFailed;
    case 'cancelled':
      return storeStyles.paymentStatusCancelled;
    case 'expired':
      return storeStyles.paymentStatusExpired;
    default:
      return '';
  }
}

function getOrderActionHint(status: string, paymentStatus: string): string {
  if (paymentStatus !== 'paid') {
    return 'Платеж еще не подтвержден. Доступны только безопасные статусы, не переводите заказ в исполнение.';
  }

  switch (status) {
    case 'pending':
      return 'Оплата уже подтверждена. Следующий шаг: подтвердить заказ и передать его в работу.';
    case 'confirmed':
      return 'Заказ подтвержден. Можно переводить в обработку.';
    case 'processing':
      return 'Заказ собирается. Следующий шаг: отправка.';
    case 'shipped':
      return 'Заказ отправлен. Дальше остается дождаться доставки.';
    case 'delivered':
      return 'Заказ завершен и не требует действий.';
    case 'cancelled':
      return 'Заказ отменен. Дополнительные действия обычно не требуются.';
    default:
      return 'Проверьте заказ и выберите безопасный следующий статус.';
  }
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
    <AdminScreen title="Заказ" subtitle="Статус, оплата и содержимое заказа" back={true}>
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

      <div className={adminStyles.adminActionBar}>
        <Link href="/admin/orders" className={adminStyles.adminActionLink}>
          К заказам
        </Link>
      </div>

      {!order ? (
        <StoreEmptyState
          title="Заказ не найден"
          description="Запрошенный заказ не существует."
          actionLabel="К заказам"
          actionHref="/admin/orders"
        />
      ) : (
        <div className={adminStyles.adminSectionStack}>
          <section className={adminStyles.adminPageLead}>
            <h2 className={adminStyles.adminPageLeadTitle}>
              Заказ #{order.id.slice(0, 8).toUpperCase()}
            </h2>
            <p className={adminStyles.adminPageLeadText}>
              {new Date(order.createdAt).toLocaleString('ru-RU')} ·{' '}
              {order.customerDisplayName || order.customerUsername || order.userId}
            </p>
            <div className={adminStyles.adminBadgeRow}>
              <span className={classNames(storeStyles.orderStatusBadge, getOrderStatusClass(order.status))}>
                {formatOrderStatus(order.status)}
              </span>
              <span
                className={classNames(
                  storeStyles.paymentStatusBadge,
                  getPaymentStatusClass(order.paymentStatus),
                )}
              >
                {formatPaymentStatus(order.paymentStatus)}
              </span>
            </div>
          </section>

          <section className={adminStyles.adminSummaryGrid}>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Итого</p>
              <p className={adminStyles.adminSummaryValue}>
                {formatPrice(order.totalAmount, order.currency)}
              </p>
              <p className={adminStyles.adminSummaryText}>
                Подытог {formatPrice(order.subtotalAmount, order.currency)}, скидка{' '}
                {formatPrice(order.discountAmount, order.currency)}.
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Покупатель</p>
              <p className={adminStyles.adminSummaryValue}>
                {order.customerUsername ? `@${order.customerUsername}` : 'Профиль'}
              </p>
              <p className={adminStyles.adminSummaryText}>
                {order.customerDisplayName || 'Имя не указано'}
                {order.customerPhone ? ` · ${order.customerPhone}` : ''}
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Оплата</p>
              <p className={adminStyles.adminSummaryValue}>
                {formatPaymentStatus(order.paymentStatus)}
              </p>
              <p className={adminStyles.adminSummaryText}>
                Провайдер {formatPaymentProvider(order.paymentProvider)}
                {order.paymentCompletedAt
                  ? ` · подтверждено ${new Date(order.paymentCompletedAt).toLocaleString('ru-RU')}`
                  : ''}
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Позиции</p>
              <p className={adminStyles.adminSummaryValue}>{order.items.length}</p>
              <p className={adminStyles.adminSummaryText}>
                Снимок состава заказа уже сохранен и не зависит от будущих изменений каталога.
              </p>
            </article>
          </section>

          <section
            className={
              order.paymentStatus === 'paid'
                ? adminStyles.adminCallout
                : adminStyles.adminCalloutWarn
            }
          >
            <p className={adminStyles.adminCalloutTitle}>Следующее действие</p>
            <p className={adminStyles.adminCalloutText}>
              {getOrderActionHint(order.status, order.paymentStatus)}
            </p>
            {order.paymentLastError && (
              <p className={adminStyles.adminCalloutText}>
                Последняя ошибка оплаты: {order.paymentLastError}
              </p>
            )}
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Управление статусом</h2>
            <p className={adminStyles.adminCardSub}>
              Ограничения по неоплаченным заказам сохраняются на сервере и в интерфейсе.
            </p>
            <AdminOrderStatusControl
              orderId={order.id}
              initialStatus={order.status}
              paymentStatus={order.paymentStatus}
            />
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Доставка и комментарий</h2>
            <div className={adminStyles.adminMetaGrid}>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Город</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.shippingAddress.city || 'Не указан'}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Адрес</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.shippingAddress.addressLine || 'Не указан'}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Индекс</p>
                <p className={adminStyles.adminMetaValue}>
                  {order.shippingAddress.postalCode || 'Не указан'}
                </p>
              </div>
              <div className={adminStyles.adminMetaCell}>
                <p className={adminStyles.adminMetaLabel}>Комментарий</p>
                <p className={adminStyles.adminMetaValue}>{order.notes || 'Нет комментария'}</p>
              </div>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Товары в заказе</h2>
            <div className={adminStyles.adminCardList}>
              {order.items.map((item) => (
                <article key={item.id} className={adminStyles.adminImageCard}>
                  <div className={adminStyles.adminCardHead}>
                    <div>
                      <p className={adminStyles.adminCardTitle}>{item.productTitle}</p>
                      <p className={adminStyles.adminCardSub}>
                        {item.quantity} × {formatPrice(item.unitPrice, item.currency)}
                      </p>
                    </div>
                    <p className={adminStyles.adminMetaValue}>
                      {formatPrice(item.lineTotal, item.currency)}
                    </p>
                  </div>
                  {item.productSlug && (
                    <div className={adminStyles.adminActions}>
                      <Link href={`/products/${item.productSlug}`} className={adminStyles.adminActionLink}>
                        Открыть на витрине
                      </Link>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Платежные попытки</h2>
            <p className={adminStyles.adminCardSub}>
              История нужна для операционной проверки и безопасного сценария повторной оплаты.
            </p>
            {order.paymentAttempts.length === 0 ? (
              <p className={adminStyles.adminMutedText}>Попыток оплаты пока нет.</p>
            ) : (
              <div className={adminStyles.adminCardList}>
                {order.paymentAttempts.map((attempt) => (
                  <article key={attempt.id} className={adminStyles.adminImageCard}>
                    <div className={adminStyles.adminCardHead}>
                      <div>
                        <p className={adminStyles.adminCardTitle}>
                          Попытка #{attempt.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className={adminStyles.adminCardSub}>
                          {new Date(attempt.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div className={adminStyles.adminBadgeRow}>
                        <span
                          className={classNames(
                            storeStyles.paymentStatusBadge,
                            getPaymentStatusClass(attempt.status),
                          )}
                        >
                          {formatPaymentStatus(attempt.status)}
                        </span>
                      </div>
                    </div>

                    <div className={adminStyles.adminMetaGrid}>
                      <div className={adminStyles.adminMetaCell}>
                        <p className={adminStyles.adminMetaLabel}>Сумма</p>
                        <p className={adminStyles.adminMetaValue}>
                          {formatPrice(attempt.amount, attempt.currency)}
                        </p>
                      </div>
                      <div className={adminStyles.adminMetaCell}>
                        <p className={adminStyles.adminMetaLabel}>Провайдер</p>
                        <p className={adminStyles.adminMetaValue}>
                          {formatPaymentProvider(attempt.provider)}
                        </p>
                      </div>
                      <div className={adminStyles.adminMetaCell}>
                        <p className={adminStyles.adminMetaLabel}>Действует до</p>
                        <p className={adminStyles.adminMetaValue}>
                          {attempt.expiresAt
                            ? new Date(attempt.expiresAt).toLocaleString('ru-RU')
                            : 'Без лимита'}
                        </p>
                      </div>
                      <div className={adminStyles.adminMetaCell}>
                        <p className={adminStyles.adminMetaLabel}>Ошибка</p>
                        <p className={adminStyles.adminMetaValue}>
                          {attempt.errorMessage || 'Нет'}
                        </p>
                      </div>
                    </div>

                    {attempt.checkoutUrl && canRetryPayment(attempt.status, order.status) && (
                      <div className={adminStyles.adminActions}>
                        <a
                          href={attempt.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={adminStyles.adminExternalLink}
                        >
                          Открыть страницу оплаты
                        </a>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AdminScreen>
  );
}
