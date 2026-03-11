'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { useTelegramUnauthorizedMessage } from '@/components/auth/TelegramSessionBootstrap';
import { classNames } from '@/css/classnames';

import styles from './store.module.css';

function mapReorderError(error: string | undefined, unauthorizedMessage: string): string {
  switch (error) {
    case 'unauthorized':
      return unauthorizedMessage;
    case 'order_not_found':
      return 'Заказ не найден.';
    case 'no_reorderable_items':
      return 'В этом заказе не осталось доступных товаров для повторного добавления.';
    case 'not_configured':
      return 'Корзина временно недоступна.';
    default:
      return 'Не удалось повторить заказ. Попробуйте еще раз.';
  }
}

interface OrderRepeatActionProps {
  orderId: string;
}

export function OrderRepeatAction({ orderId }: OrderRepeatActionProps) {
  const unauthorizedMessage = useTelegramUnauthorizedMessage(
    'Откройте MainStore в Telegram, чтобы повторить заказ.',
  );
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
          setErrorMessage(
            mapReorderError(
              payload && !payload.ok ? payload.error : undefined,
              unauthorizedMessage,
            ),
          );
          return;
        }

        if (payload.unavailableItemsCount > 0) {
          setSuccessMessage(
            `В корзину добавлено ${payload.addedItemsCount} поз. Сейчас недоступно: ${payload.unavailableItemsCount}.`,
          );
          return;
        }

        setSuccessMessage(`В корзину добавлено ${payload.addedItemsCount} поз.`);
      } catch {
        setErrorMessage('Сетевая ошибка при повторе заказа.');
      }
    });
  };

  return (
    <div className={styles.inlineActionStack}>
      <button
        type="button"
        className={styles.secondaryButton}
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? 'Повторяем...' : 'Повторить заказ'}
      </button>

      <Link href="/cart" className={styles.secondaryInlineLink}>
        Открыть корзину
      </Link>

      {successMessage ? (
        <p className={classNames(styles.inlineActionMessage, styles.inlineActionMessageSuccess)}>
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p className={classNames(styles.inlineActionMessage, styles.inlineActionMessageError)}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
