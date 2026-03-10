'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface CartItemControlsProps {
  itemId: string;
  quantity: number;
}

function mapCartError(error: string): string {
  if (error === 'unauthorized') {
    return 'Откройте MainStore в Telegram, чтобы управлять корзиной.';
  }
  if (error === 'not_configured') {
    return 'Корзина временно недоступна.';
  }
  return 'Не удалось обновить товар в корзине.';
}

export function CartItemControls({ itemId, quantity }: CartItemControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isSubmittingRef = useRef(false);

  const updateQuantity = (nextQuantity: number) => {
    const normalizedQuantity = Math.max(0, Math.trunc(nextQuantity));
    if (normalizedQuantity === quantity || isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setStatusMessage(null);
      setIsError(false);

      try {
        const response = await fetch(`/api/store/cart/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ quantity: normalizedQuantity }),
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true; quantity: number }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          setStatusMessage(
            mapCartError(payload && !payload.ok ? payload.error ?? 'unknown' : 'unknown'),
          );
          setIsError(true);
          return;
        }

        setStatusMessage(
          normalizedQuantity === 0 ? 'Товар удален из корзины.' : 'Корзина обновлена.',
        );
        router.refresh();
      } catch {
        setStatusMessage('Сетевая ошибка при обновлении корзины.');
        setIsError(true);
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const removeItem = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setStatusMessage(null);
      setIsError(false);

      try {
        const response = await fetch(`/api/store/cart/items/${itemId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const payload = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          setStatusMessage(
            mapCartError(payload && !payload.ok ? payload.error ?? 'unknown' : 'unknown'),
          );
          setIsError(true);
          return;
        }

        setStatusMessage('Товар удален из корзины.');
        router.refresh();
      } catch {
        setStatusMessage('Сетевая ошибка при удалении товара.');
        setIsError(true);
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.cartItemControls}>
      <div className={styles.quantityControl} aria-label="Управление количеством">
        <button
          type="button"
          className={styles.quantityButton}
          onClick={() => updateQuantity(quantity - 1)}
          disabled={isPending}
          aria-label="Уменьшить количество"
        >
          -
        </button>
        <span className={styles.quantityValue} aria-live="polite">
          {quantity}
        </span>
        <button
          type="button"
          className={styles.quantityButton}
          onClick={() => updateQuantity(quantity + 1)}
          disabled={isPending}
          aria-label="Увеличить количество"
        >
          +
        </button>
      </div>

      <button
        type="button"
        className={styles.cartRemoveButton}
        onClick={removeItem}
        disabled={isPending}
        aria-label="Удалить товар из корзины"
      >
        Удалить
      </button>

      {statusMessage && (
        <p
          className={classNames(
            styles.cartActionMessage,
            isError ? styles.inlineActionMessageError : styles.inlineActionMessageSuccess,
          )}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}
    </div>
  );
}
