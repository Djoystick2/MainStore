'use client';

import { useState, useTransition } from 'react';

import { classNames } from '@/css/classnames';
import {
  buildStoreAbsoluteUrl,
  buildTelegramShareUrl,
  isTelegramMiniAppRuntime,
} from '@/features/telegram/navigation';

import styles from './store.module.css';

interface ProductShareButtonProps {
  productSlug: string;
  productTitle: string;
}

function mapShareError(): string {
  return 'Could not prepare a share link right now. Please try again.';
}

export function ProductShareButton({
  productSlug,
  productTitle,
}: ProductShareButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleShare = () => {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      setStatusMessage(null);
      setIsError(false);

      try {
        const productUrl = buildStoreAbsoluteUrl(
          `/products/${productSlug}`,
          window.location.origin,
        );
        const shareText = `Take a look at ${productTitle} in MainStore`;

        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: productTitle,
              text: shareText,
              url: productUrl,
            });
            setStatusMessage('Share dialog opened.');
            return;
          } catch (error) {
            if (
              error &&
              typeof error === 'object' &&
              'name' in error &&
              error.name === 'AbortError'
            ) {
              return;
            }
          }
        }

        if (isTelegramMiniAppRuntime()) {
          window.open(
            buildTelegramShareUrl(productUrl, shareText),
            '_blank',
            'noopener,noreferrer',
          );
          setStatusMessage('Telegram share opened.');
          return;
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(productUrl);
          setStatusMessage('Product link copied to clipboard.');
          return;
        }

        setStatusMessage(`Copy this link: ${productUrl}`);
      } catch {
        setStatusMessage(mapShareError());
        setIsError(true);
      }
    });
  };

  return (
    <div className={styles.inlineActionBlock}>
      <button
        type="button"
        className={classNames(
          styles.secondaryButton,
          styles.secondaryButtonCompact,
          styles.actionButtonReset,
        )}
        onClick={handleShare}
        disabled={isPending}
        aria-label="Share this product"
      >
        {isPending ? 'Preparing...' : 'Share product'}
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
