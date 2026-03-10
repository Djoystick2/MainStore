'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import styles from './store.module.css';

function mapRetryPaymentError(error: string | undefined): string {
  switch (error) {
    case 'unauthorized':
      return 'Откройте MainStore в Telegram, чтобы продолжить оплату.';
    case 'order_not_found':
      return 'Заказ не найден.';
    case 'order_cancelled':
      return 'Оплата недоступна для отменённого заказа.';
    case 'already_paid':
      return 'Этот заказ уже оплачен.';
    case 'not_configured':
      return 'Платёжный слой временно недоступен.';
    case 'payment_provider_not_supported':
      return 'Текущий платёжный провайдер пока не подключён.';
    default:
      return 'Не удалось продолжить оплату. Попробуйте ещё раз.';
  }
}

interface OrderPaymentActionProps {
  orderId: string;
  label: string;
}

export function OrderPaymentAction({ orderId, label }: OrderPaymentActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleClick = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/store/orders/${orderId}/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              checkoutUrl?: string | null;
              orderId: string;
            }
          | {
              ok: false;
              error?: string;
            }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          setErrorMessage(mapRetryPaymentError(payload && !payload.ok ? payload.error : undefined));
          return;
        }

        if (payload.checkoutUrl) {
          window.location.assign(payload.checkoutUrl);
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при запуске оплаты.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.inlineActionBlock}>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Переходим к оплате...' : label}
      </button>
      {errorMessage && (
        <p className={`${styles.inlineActionMessage} ${styles.inlineActionMessageError}`}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}
