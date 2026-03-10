'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { ProductStatus } from '@/features/admin';

import styles from './admin.module.css';

const statusOptions: ProductStatus[] = ['draft', 'active', 'archived'];

function formatProductStatus(status: ProductStatus): string {
  switch (status) {
    case 'draft':
      return 'Черновик';
    case 'active':
      return 'Активен';
    case 'archived':
      return 'Архив';
    default:
      return status;
  }
}

function mapAdminProductStatusError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить статус.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'invalid_status':
      return 'Выбран некорректный статус.';
    case 'product_not_found':
      return 'Этот товар больше недоступен.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось обновить статус. Попробуйте еще раз.';
  }
}

interface AdminProductStatusControlProps {
  productId: string;
  initialStatus: ProductStatus;
}

export function AdminProductStatusControl({
  productId,
  initialStatus,
}: AdminProductStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ProductStatus>(initialStatus);
  const [savedStatus, setSavedStatus] = useState<ProductStatus>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSave = () => {
    if (status === savedStatus || isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/admin/products/${productId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminProductStatusError(errorCode));
          return;
        }

        setSavedStatus(status);
        setSuccessMessage('Статус обновлен.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при обновлении статуса.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.adminActions}>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as ProductStatus)}
        className={styles.adminSelect}
        aria-label="Статус товара"
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {formatProductStatus(option)}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.adminActionButton}
        onClick={handleSave}
        disabled={isPending || status === savedStatus}
        aria-label="Сохранить статус товара"
      >
        {isPending ? 'Сохраняем...' : 'Сохранить статус'}
      </button>
      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </div>
  );
}
