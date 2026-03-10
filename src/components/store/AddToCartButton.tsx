'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface AddToCartButtonProps {
  productId: string;
  className?: string;
}

function mapAddToCartError(error: string): string {
  if (error === 'unauthorized') {
    return 'Откройте MainStore в Telegram, чтобы работать с корзиной.';
  }
  if (error === 'not_configured') {
    return 'Корзина временно недоступна.';
  }
  if (error === 'product_not_found') {
    return 'Этот товар сейчас недоступен.';
  }
  if (error === 'invalid_quantity') {
    return 'Не удалось добавить такое количество.';
  }
  return 'Не удалось добавить товар в корзину.';
}

export function AddToCartButton({ productId, className }: AddToCartButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleClick = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setStatusMessage(null);
      setIsError(false);

      try {
        const response = await fetch('/api/store/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId, quantity: 1 }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok: true; quantity: number }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          const message = mapAddToCartError(payload && !payload.ok ? payload.error ?? 'unknown' : 'unknown');
          setStatusMessage(message);
          setIsError(true);
          return;
        }

        setStatusMessage('Товар добавлен в корзину.');
        setIsError(false);
        router.refresh();
      } catch {
        setStatusMessage('Сетевая ошибка при обновлении корзины.');
        setIsError(true);
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.inlineActionBlock}>
      <button
        type="button"
        className={classNames(className, styles.actionButtonReset)}
        onClick={handleClick}
        disabled={isPending}
        aria-label="Добавить товар в корзину"
      >
        {isPending ? 'Добавляем...' : 'В корзину'}
      </button>
      {statusMessage && (
        <p
          className={classNames(
            styles.inlineActionMessage,
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
