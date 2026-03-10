'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import styles from './admin.module.css';

function mapDuplicateError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось дублировать товар.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'product_not_found':
      return 'Этот товар больше недоступен.';
    case 'duplicate_slug_generation_failed':
      return 'Не удалось подготовить уникальный slug для копии.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось дублировать товар. Попробуйте еще раз.';
  }
}

interface AdminProductDuplicateButtonProps {
  productId: string;
  label?: string;
}

export function AdminProductDuplicateButton({
  productId,
  label = 'Дублировать',
}: AdminProductDuplicateButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleDuplicate = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/admin/products/${productId}/duplicate`, {
          method: 'POST',
          credentials: 'include',
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok || !data.id) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapDuplicateError(errorCode));
          return;
        }

        router.push(`/admin/products/${data.id}/edit`);
      } catch {
        setErrorMessage('Сетевая ошибка при дублировании товара.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className={styles.adminActionButton}
        onClick={handleDuplicate}
        disabled={isPending}
        aria-label="Дублировать товар"
      >
        {isPending ? 'Дублируем...' : label}
      </button>
      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
    </>
  );
}
