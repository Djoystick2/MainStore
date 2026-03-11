'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { useTelegramUnauthorizedMessage } from '@/components/auth/TelegramSessionBootstrap';
import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface FavoriteToggleButtonProps {
  productId: string;
  initialFavorited: boolean;
  compact?: boolean;
}

function mapFavoriteError(error: string, unauthorizedMessage: string): string {
  if (error === 'unauthorized') {
    return unauthorizedMessage;
  }
  if (error === 'not_configured') {
    return 'Избранное временно недоступно.';
  }
  return 'Не удалось обновить избранное.';
}

export function FavoriteToggleButton({
  productId,
  initialFavorited,
  compact = false,
}: FavoriteToggleButtonProps) {
  const router = useRouter();
  const unauthorizedMessage = useTelegramUnauthorizedMessage(
    'Откройте MainStore в Telegram, чтобы пользоваться избранным.',
  );
  const [isPending, startTransition] = useTransition();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isSubmittingRef = useRef(false);

  const label = useMemo(() => {
    if (isFavorited) {
      return compact ? 'Сохранено' : 'В избранном';
    }
    return compact ? 'Сохранить' : 'В избранное';
  }, [compact, isFavorited]);

  const handleToggle = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setStatusMessage(null);
      setIsError(false);

      try {
        const response = await fetch('/api/store/favorites/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ productId }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok: true; favorited: boolean }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          const message = mapFavoriteError(
            payload && !payload.ok ? payload.error ?? 'unknown' : 'unknown',
            unauthorizedMessage,
          );
          setStatusMessage(message);
          setIsError(true);
          return;
        }

        setIsFavorited(payload.favorited);
        setStatusMessage(payload.favorited ? 'Добавлено в избранное.' : 'Удалено из избранного.');
        setIsError(false);
        router.refresh();
      } catch {
        setStatusMessage('Сетевая ошибка при обновлении избранного.');
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
        className={classNames(
          styles.secondaryButton,
          compact && styles.secondaryButtonCompact,
          styles.actionButtonReset,
          isFavorited && styles.secondaryButtonActive,
        )}
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isFavorited}
        aria-label={isFavorited ? 'Убрать из избранного' : 'Добавить в избранное'}
      >
        {isPending ? 'Сохраняем...' : label}
      </button>
      {!compact && statusMessage && (
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
