'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface FavoriteToggleButtonProps {
  productId: string;
  initialFavorited: boolean;
  compact?: boolean;
}

function mapFavoriteError(error: string): string {
  if (error === 'unauthorized') {
    return 'Open MainStore in Telegram to use favorites.';
  }
  if (error === 'not_configured') {
    return 'Favorites are temporarily unavailable.';
  }
  return 'Could not update favorites.';
}

export function FavoriteToggleButton({
  productId,
  initialFavorited,
  compact = false,
}: FavoriteToggleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isSubmittingRef = useRef(false);

  const label = useMemo(() => {
    if (isFavorited) {
      return compact ? 'Saved' : 'Saved in favorites';
    }
    return compact ? 'Save' : 'Add to favorites';
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
          );
          setStatusMessage(message);
          setIsError(true);
          return;
        }

        setIsFavorited(payload.favorited);
        setStatusMessage(payload.favorited ? 'Added to favorites.' : 'Removed from favorites.');
        setIsError(false);
        router.refresh();
      } catch {
        setStatusMessage('Network error while updating favorites.');
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
        aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isPending ? 'Saving...' : label}
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
