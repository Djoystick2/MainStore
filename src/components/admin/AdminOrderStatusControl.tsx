'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { OrderStatus, PaymentStatus } from '@/features/admin';

import styles from './admin.module.css';

const statusOptions: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

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

function mapAdminOrderStatusError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить статус заказа.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'invalid_order_status':
      return 'Выбран некорректный статус заказа.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    case 'payment_not_completed':
      return 'Нельзя перевести заказ в исполнение до подтвержденной оплаты.';
    default:
      return 'Не удалось обновить статус заказа. Попробуйте еще раз.';
  }
}

function isStatusAllowed(status: OrderStatus, paymentStatus: PaymentStatus): boolean {
  if (paymentStatus === 'paid') {
    return true;
  }

  return status === 'pending' || status === 'cancelled';
}

function getAllowedStatuses(paymentStatus: PaymentStatus): string {
  return statusOptions
    .filter((status) => isStatusAllowed(status, paymentStatus))
    .map((status) => formatOrderStatus(status))
    .join(', ');
}

interface AdminOrderStatusControlProps {
  orderId: string;
  initialStatus: OrderStatus;
  paymentStatus: PaymentStatus;
}

export function AdminOrderStatusControl({
  orderId,
  initialStatus,
  paymentStatus,
}: AdminOrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [savedStatus, setSavedStatus] = useState<OrderStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSave = () => {
    if (
      status === savedStatus ||
      isPending ||
      isSubmittingRef.current ||
      !isStatusAllowed(status, paymentStatus)
    ) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminOrderStatusError(errorCode));
          return;
        }

        setSavedStatus(status);
        setSuccessMessage('Статус заказа обновлен.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при обновлении статуса.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.adminForm}>
      <label className={styles.adminField}>
        <span className={styles.adminLabel}>Статус заказа</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className={styles.adminSelect}
          aria-label="Статус заказа"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option} disabled={!isStatusAllowed(option, paymentStatus)}>
              {formatOrderStatus(option)}
            </option>
          ))}
        </select>
      </label>

      {paymentStatus !== 'paid' && (
        <div className={styles.adminCalloutWarn}>
          <p className={styles.adminCalloutTitle}>Защита от неверного продвижения</p>
          <p className={styles.adminCalloutText}>
            Пока оплата не подтверждена, доступны только статусы: {getAllowedStatuses(paymentStatus)}.
          </p>
        </div>
      )}

      <button
        type="button"
        className={styles.adminPrimaryLink}
        onClick={handleSave}
        disabled={isPending || status === savedStatus || !isStatusAllowed(status, paymentStatus)}
        aria-label="Обновить статус заказа"
      >
        {isPending ? 'Обновляем...' : 'Обновить статус'}
      </button>

      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </div>
  );
}
