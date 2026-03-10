'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

function mapReorderError(error: string | undefined): string {
  switch (error) {
    case 'unauthorized':
      return 'Откройте MainStore в Telegram, чтобы повторить заказ.';
    case 'order_not_found':
      return 'Заказ не найден.';
    case 'no_reorderable_items':
      return 'В этом заказе не осталось доступных товаров для повторного добавления.';
    case 'not_configured':
      return 'Корзина временно недоступна.';
    default:
      return 'Не удалось повторить заказ. Попробуйте ещё раз.';
  }
}

interface OrderRepeatActionProps {
  orderId: string;
}

export function OrderRepeatAction({ orderId }: OrderRepeatActionProps) {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleClick = () => {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      setSuccessMessage(null);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/store/orders/${orderId}/reorder`, {
          method: 'POST',
          credentials: 'include',
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              addedItemsCount: number;
              unavailableItemsCount: number;
            }
          | {
              ok: false;
              error?: string;
            }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          setErrorMessage(mapReorderError(payload && !payload.ok ? payload.error : undefined));
          return;
        }

        const unavailableNote =
          payload.unavailableItemsCount > 0
            ? ` Недоступных позиций: ${payload.unavailableItemsCount}.`
            : '';
        setSuccessMessage(
          `В корзину добавлено позиций: ${payload.addedItemsCount}.${unavailableNote}`,
        );
      } catch {
        setErrorMessage('Сетевая ошибка при повторе заказа.');
      }
    });
  };

  return (
    <div className={styles.inlineActionBlock}>
      <button
        type="button"
        className={classNames(styles.secondaryButton, styles.actionButtonReset)}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Добавляем в корзину...' : 'Повторить заказ'}
      </button>
      {successMessage ? (
        <div className={styles.inlineActionStack}>
          <p className={classNames(styles.inlineActionMessage, styles.inlineActionMessageSuccess)}>{successMessage}</p>
          <Link href="/cart" className={styles.secondaryInlineLink}>
            Открыть корзину
          </Link>
        </div>
      ) : null}
      {errorMessage ? (
        <p className={classNames(styles.inlineActionMessage, styles.inlineActionMessageError)}>{errorMessage}</p>
      ) : null}
    </div>
  );
}
