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
    return 'Open MainStore in Telegram to use cart actions.';
  }
  if (error === 'not_configured') {
    return 'Cart is temporarily unavailable.';
  }
  if (error === 'product_not_found') {
    return 'This product is not available.';
  }
  if (error === 'invalid_quantity') {
    return 'Could not add this quantity to cart.';
  }
  return 'Could not add the product to cart.';
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

        const payload = (await response.json()) as
          | { ok: true; quantity: number }
          | { ok: false; error?: string };

        if (!response.ok || !payload.ok) {
          const message = mapAddToCartError(payload.ok ? 'unknown' : payload.error ?? 'unknown');
          setStatusMessage(message);
          setIsError(true);
          return;
        }

        setStatusMessage('Added to cart. You can continue shopping or open cart.');
        setIsError(false);
        router.refresh();
      } catch {
        setStatusMessage('Network error while updating cart.');
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
        aria-label="Add product to cart"
      >
        {isPending ? 'Adding...' : 'Add to cart'}
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
