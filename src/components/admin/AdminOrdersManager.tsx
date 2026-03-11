'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { classNames } from '@/css/classnames';
import type { AdminOrderListItem, OrderStatus, PaymentStatus } from '@/features/admin';
import { formatPaymentStatus } from '@/features/payments/presentation';
import storeStyles from '@/components/store/store.module.css';

import styles from './admin.module.css';

interface AdminOrdersManagerProps {
  orders: AdminOrderListItem[];
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatOrderStatus(status: OrderStatus): string {
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

function getOrderStatusClass(status: OrderStatus): string {
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

function getPaymentStatusClass(status: PaymentStatus): string {
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

function getOrderOperationalHint(order: AdminOrderListItem): string {
  if (order.paymentStatus === 'requires_action') {
    return 'Покупатель еще не завершил оплату. Не переводите заказ в исполнение.';
  }
  if (['failed', 'cancelled', 'expired'].includes(order.paymentStatus)) {
    return 'Оплата не завершена. Заказ можно ждать повторной оплаты или завершить отменой.';
  }
  if (order.paymentStatus !== 'paid') {
    return 'Оплата пока не подтверждена. Доступны только безопасные статусы.';
  }

  switch (order.status) {
    case 'pending':
      return 'Оплата подтверждена. Следующий шаг — подтвердить заказ и передать его в работу.';
    case 'confirmed':
      return 'Заказ подтвержден. Можно переводить в обработку.';
    case 'processing':
      return 'Заказ в работе. Следующий шаг — отправка.';
    case 'shipped':
      return 'Заказ уже отправлен. Осталось дождаться доставки.';
    case 'delivered':
      return 'Заказ завершен и не требует действий.';
    case 'cancelled':
      return 'Заказ отменен. Дополнительные действия обычно не требуются.';
    default:
      return 'Проверьте детали заказа перед следующим действием.';
  }
}

export function AdminOrdersManager({ orders }: AdminOrdersManagerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');
  const [attentionFilter, setAttentionFilter] = useState<'all' | 'attention' | 'completed'>('all');
  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    paymentFilter !== 'all' ||
    attentionFilter !== 'all';

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) {
        return false;
      }

      const requiresAttention =
        order.paymentStatus !== 'paid' ||
        ['pending', 'confirmed', 'processing'].includes(order.status);
      if (attentionFilter === 'attention' && !requiresAttention) {
        return false;
      }
      if (attentionFilter === 'completed' && requiresAttention) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        order.id,
        order.customerDisplayName ?? '',
        order.customerUsername ?? '',
        order.userId,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [attentionFilter, orders, paymentFilter, search, statusFilter]);

  const awaitingPaymentCount = orders.filter((order) => order.paymentStatus !== 'paid').length;
  const inWorkCount = orders.filter((order) =>
    ['pending', 'confirmed', 'processing'].includes(order.status),
  ).length;
  const completedCount = orders.filter((order) =>
    ['delivered', 'cancelled'].includes(order.status),
  ).length;

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Операционный обзор заказов</h2>
            <p className={styles.adminCardSub}>
              Отслеживайте оплату, текущие этапы исполнения и заказы, которые требуют внимания.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{orders.length} всего</span>
            <span className={styles.adminFeatureBadge}>{awaitingPaymentCount} без оплаты</span>
          </div>
        </div>

        <div className={styles.adminSummaryGrid}>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Требуют оплаты</p>
            <p className={styles.adminSummaryValue}>{awaitingPaymentCount}</p>
            <p className={styles.adminSummaryText}>Нельзя продвигать в исполнение до подтверждения платежа.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>В работе</p>
            <p className={styles.adminSummaryValue}>{inWorkCount}</p>
            <p className={styles.adminSummaryText}>Ожидают подтверждения, сборки или отправки.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Завершенные</p>
            <p className={styles.adminSummaryValue}>{completedCount}</p>
            <p className={styles.adminSummaryText}>Доставлены или отменены и не требуют постоянного контроля.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>После фильтрации</p>
            <p className={styles.adminSummaryValue}>{filteredOrders.length}</p>
            <p className={styles.adminSummaryText}>Текущий рабочий список по выбранным условиям.</p>
          </div>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Поиск</span>
            <input
              className={styles.adminInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Номер, покупатель или @username"
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Статус заказа</span>
            <select
              className={styles.adminSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)}
            >
              <option value="all">Все статусы</option>
              <option value="pending">Ожидает</option>
              <option value="confirmed">Подтвержден</option>
              <option value="processing">В обработке</option>
              <option value="shipped">Отправлен</option>
              <option value="delivered">Доставлен</option>
              <option value="cancelled">Отменен</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Статус оплаты</span>
            <select
              className={styles.adminSelect}
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as 'all' | PaymentStatus)}
            >
              <option value="all">Все платежи</option>
              <option value="pending">Ожидает</option>
              <option value="requires_action">Требует действия</option>
              <option value="paid">Оплачен</option>
              <option value="failed">Ошибка</option>
              <option value="cancelled">Отменен</option>
              <option value="expired">Истек</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Фокус</span>
            <select
              className={styles.adminSelect}
              value={attentionFilter}
              onChange={(event) =>
                setAttentionFilter(event.target.value as 'all' | 'attention' | 'completed')
              }
            >
              <option value="all">Все заказы</option>
              <option value="attention">Требуют внимания</option>
              <option value="completed">Только завершенные</option>
            </select>
          </label>
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <section className={styles.adminCard}>
          <p className={styles.adminCardTitle}>
            {orders.length === 0 ? 'Заказов пока нет' : 'Совпадений не найдено'}
          </p>
          <p className={styles.adminCardSub}>
            {orders.length === 0
              ? 'Новые заказы появятся здесь после оформления покупок на витрине.'
              : 'Измените фильтры или поисковый запрос, чтобы увидеть нужные заказы.'}
          </p>
          {hasActiveFilters ? (
            <div className={styles.adminActions}>
              <button
                type="button"
                className={styles.adminSecondaryButton}
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setPaymentFilter('all');
                  setAttentionFilter('all');
                }}
              >
                Сбросить фильтры
              </button>
            </div>
          ) : null}
        </section>
      ) : (
        <div className={styles.adminCardList}>
          {filteredOrders.map((order) => (
            <article key={order.id} className={styles.adminCard}>
              <div className={styles.adminCardHead}>
                <div>
                  <h3 className={styles.adminCardTitle}>
                    Заказ #{order.id.slice(0, 8).toUpperCase()}
                  </h3>
                  <p className={styles.adminCardSub}>
                    {order.customerDisplayName || order.customerUsername || order.userId}
                  </p>
                </div>
                <div className={styles.adminBadgeRow}>
                  <span
                    className={classNames(
                      storeStyles.orderStatusBadge,
                      styles.adminCompactBadge,
                      getOrderStatusClass(order.status),
                    )}
                  >
                    {formatOrderStatus(order.status)}
                  </span>
                  <span
                    className={classNames(
                      storeStyles.paymentStatusBadge,
                      styles.adminCompactBadge,
                      getPaymentStatusClass(order.paymentStatus),
                    )}
                  >
                    {formatPaymentStatus(order.paymentStatus)}
                  </span>
                </div>
              </div>

              <div className={styles.adminMetaGrid}>
                <div className={styles.adminMetaCell}>
                  <p className={styles.adminMetaLabel}>Итого</p>
                  <p className={styles.adminMetaValue}>
                    {formatPrice(order.totalAmount, order.currency)}
                  </p>
                </div>
                <div className={styles.adminMetaCell}>
                  <p className={styles.adminMetaLabel}>Товаров</p>
                  <p className={styles.adminMetaValue}>{order.itemsCount}</p>
                </div>
                <div className={styles.adminMetaCell}>
                  <p className={styles.adminMetaLabel}>Дата</p>
                  <p className={styles.adminMetaValue}>
                    {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <div className={styles.adminMetaCell}>
                  <p className={styles.adminMetaLabel}>Последняя попытка</p>
                  <p className={styles.adminMetaValue}>
                    {order.latestPaymentAttemptId
                      ? order.latestPaymentAttemptId.slice(0, 8).toUpperCase()
                      : 'Нет'}
                  </p>
                </div>
              </div>

              <p className={styles.adminCardSub}>{getOrderOperationalHint(order)}</p>

              <div className={styles.adminActions}>
                <Link href={`/admin/orders/${order.id}`} className={styles.adminActionLink}>
                  Открыть заказ
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
