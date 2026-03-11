'use client';

import { openLink } from '@tma.js/sdk-react';
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
  return 'Не удалось подготовить ссылку. Попробуйте ещё раз.';
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
        const shareText = `Посмотрите товар «${productTitle}» в MainStore`;

        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            await navigator.share({
              title: productTitle,
              text: shareText,
              url: productUrl,
            });
            setStatusMessage('Окно отправки открыто.');
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
          openLink(buildTelegramShareUrl(productUrl, shareText));
          setStatusMessage('Окно Telegram открыто.');
          return;
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(productUrl);
          setStatusMessage('Ссылка на товар скопирована.');
          return;
        }

        setStatusMessage(`Скопируйте ссылку: ${productUrl}`);
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
        aria-label="Поделиться товаром"
      >
        {isPending ? 'Готовим...' : 'Поделиться'}
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
