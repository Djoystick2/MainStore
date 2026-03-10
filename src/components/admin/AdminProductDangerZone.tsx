'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminProductDetail } from '@/features/admin/types';

import styles from './admin.module.css';

interface DeleteSummary {
  detachedOrderItemsCount: number;
  removedImagesCount: number;
  removedCollectionLinksCount: number;
  removedFavoritesCount: number;
  removedCartItemsCount: number;
}

function mapDeleteError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось удалить товар.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'product_not_found':
      return 'Этот товар больше недоступен.';
    case 'delete_precheck_failed':
      return 'Не удалось подготовить безопасное удаление. Попробуйте чуть позже.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось удалить товар. Попробуйте еще раз.';
  }
}

interface AdminProductDangerZoneProps {
  product: AdminProductDetail;
}

export function AdminProductDangerZone({ product }: AdminProductDangerZoneProps) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteSummary, setDeleteSummary] = useState<DeleteSummary | null>(null);
  const isSubmittingRef = useRef(false);

  const canDelete = confirmation.trim() === product.slug;

  const handleDelete: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (!canDelete || isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setDeleteSummary(null);

      try {
        const response = await fetch(`/api/admin/products/${product.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; summary?: DeleteSummary }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok || !data.summary) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapDeleteError(errorCode));
          return;
        }

        setDeleteSummary(data.summary);
        router.push('/admin/products');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при удалении товара.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminDangerCard}>
      <h2 className={styles.adminCardTitle}>Удаление товара</h2>
      <p className={styles.adminCardSub}>
        Используется контролируемое полное удаление. Изображения, избранное, корзины и связи с подборками будут удалены, а история заказов сохранится через отвязку `order_items`.
      </p>

      <div className={styles.adminMetaGrid}>
        <div className={styles.adminMetaCell}>
          <p className={styles.adminMetaLabel}>Изображения</p>
          <p className={styles.adminMetaValue}>{product.imagesCount}</p>
        </div>
        <div className={styles.adminMetaCell}>
          <p className={styles.adminMetaLabel}>Избранное</p>
          <p className={styles.adminMetaValue}>{product.favoritesCount}</p>
        </div>
        <div className={styles.adminMetaCell}>
          <p className={styles.adminMetaLabel}>В корзинах</p>
          <p className={styles.adminMetaValue}>{product.cartItemsCount}</p>
        </div>
        <div className={styles.adminMetaCell}>
          <p className={styles.adminMetaLabel}>Связи с заказами</p>
          <p className={styles.adminMetaValue}>{product.orderItemsCount}</p>
        </div>
      </div>

      <form className={styles.adminForm} onSubmit={handleDelete}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Введите slug товара для подтверждения</span>
          <input
            className={styles.adminInput}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={product.slug}
            aria-label="Подтвердить удаление товара"
          />
        </label>

        <button
          type="submit"
          className={styles.adminDangerButton}
          disabled={!canDelete || isPending}
          aria-label="Удалить товар навсегда"
        >
          {isPending ? 'Удаляем...' : 'Удалить товар'}
        </button>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {deleteSummary && (
          <p className={styles.adminSuccess}>
            Товар удален. Сохранено связей истории заказов: {deleteSummary.detachedOrderItemsCount}.
          </p>
        )}
      </form>
    </section>
  );
}

