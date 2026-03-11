'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type { AdminProductImageItem } from '@/features/admin/types';

import styles from './admin.module.css';

interface AdminProductImagesManagerProps {
  productId: string;
  images: AdminProductImageItem[];
}

interface ImageRowEditorProps {
  image: AdminProductImageItem;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSwapOrder: (imageId: string, direction: 'up' | 'down') => Promise<string | null>;
}

function mapAdminImageError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить изображение.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'invalid_image_payload':
    case 'image_url_required':
      return 'Укажите ссылку на изображение.';
    case 'invalid_image_url':
      return 'Ссылка на изображение должна начинаться с http:// или https://.';
    case 'invalid_sort_order':
      return 'Порядок должен быть неотрицательным целым числом.';
    case 'invalid_product':
    case 'image_not_found':
      return 'Запрошенное изображение больше недоступно.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось обновить изображение. Попробуйте еще раз.';
  }
}

function ImageRowEditor({ image, canMoveUp, canMoveDown, onSwapOrder }: ImageRowEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(image.url);
  const [alt, setAlt] = useState(image.alt ?? '');
  const [sortOrder, setSortOrder] = useState(String(image.sortOrder));
  const [isPrimary, setIsPrimary] = useState(image.isPrimary);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const runUpdate = (nextPayload?: { url: string; alt: string; sortOrder: number; isPrimary: boolean; }) => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const parsedSortOrder = nextPayload?.sortOrder ?? Number(sortOrder);
      if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
        setErrorMessage('Порядок должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/admin/product-images/${image.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ url: nextPayload?.url ?? url, alt: nextPayload?.alt ?? alt, sortOrder: parsedSortOrder, isPrimary: nextPayload?.isPrimary ?? isPrimary }),
        });

        const data = (await response.json().catch(() => null)) as { ok: true } | { ok: false; error?: string } | null;
        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }

        setSortOrder(String(parsedSortOrder));
        setSuccessMessage('Изображение обновлено.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при обновлении изображения.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const onDelete = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const response = await fetch(`/api/admin/product-images/${image.id}`, { method: 'DELETE', credentials: 'include' });
        const data = (await response.json().catch(() => null)) as { ok: true } | { ok: false; error?: string } | null;
        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при удалении изображения.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const handleSwap = (direction: 'up' | 'down') => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      const swapError = await onSwapOrder(image.id, direction);
      if (swapError) {
        setErrorMessage(swapError);
      } else {
        setSuccessMessage('Порядок изображений обновлен.');
        router.refresh();
      }
      isSubmittingRef.current = false;
    });
  };

  return (
    <article className={styles.adminImageCard}>
      <div className={styles.adminImageCardLayout}>
        <div className={styles.adminImagePreview} style={{ backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.15), rgba(12, 18, 31, 0.15)), url(${url})` }} />

        <div className={styles.adminForm}>
          <div className={styles.adminCardHead}>
            <div>
              <h3 className={styles.adminCardTitle}>Изображение #{image.sortOrder + 1}</h3>
              <p className={styles.adminCardSub}>{image.isPrimary ? 'Главное изображение' : 'Изображение галереи'}</p>
            </div>
            <div className={styles.adminActions}>
              <button type="button" className={styles.adminActionButton} disabled={!canMoveUp || isPending} onClick={() => handleSwap('up')} aria-label="Переместить изображение вверх">Вверх</button>
              <button type="button" className={styles.adminActionButton} disabled={!canMoveDown || isPending} onClick={() => handleSwap('down')} aria-label="Переместить изображение вниз">Вниз</button>
            </div>
          </div>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Ссылка на изображение</span>
            <input className={styles.adminInput} value={url} onChange={(event) => setUrl(event.target.value)} />
            <span className={styles.adminFieldHint}>
              Используйте прямую ссылку, которая открывается без авторизации.
            </span>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Описание изображения</span>
            <input className={styles.adminInput} value={alt} onChange={(event) => setAlt(event.target.value)} />
            <span className={styles.adminFieldHint}>
              Кратко опишите, что изображено. Это помогает доступности и импорту.
            </span>
          </label>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Порядок</span>
              <input type="number" min="0" step="1" className={styles.adminInput} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
            </label>

            <label className={styles.adminCheckboxRow}>
              <input type="checkbox" className={styles.adminCheckbox} checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
              <span className={styles.adminLabel}>Главное изображение</span>
            </label>
          </div>

          <div className={styles.adminActions}>
            <button type="button" className={styles.adminActionButton} onClick={() => runUpdate()} disabled={isPending} aria-label="Сохранить изображение товара">{isPending ? 'Сохраняем...' : 'Сохранить'}</button>
            <button type="button" className={styles.adminDangerButton} onClick={onDelete} disabled={isPending} aria-label="Удалить изображение товара">Удалить</button>
          </div>

          {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
          {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
        </div>
      </div>
    </article>
  );
}

export function AdminProductImagesManager({ productId, images }: AdminProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextSortOrder = images.reduce((max, image) => Math.max(max, image.sortOrder), -1) + 1;
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [sortOrder, setSortOrder] = useState(String(nextSortOrder));
  const [isPrimary, setIsPrimary] = useState(images.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const onAddImage: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      const parsedSortOrder = Number(sortOrder);
      if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
        setErrorMessage('Порядок должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ url, alt, sortOrder: parsedSortOrder, isPrimary }),
        });

        const data = (await response.json().catch(() => null)) as { ok: true; id?: string } | { ok: false; error?: string } | null;
        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }

        setUrl('');
        setAlt('');
        setSortOrder(String(parsedSortOrder + 1));
        setIsPrimary(false);
        setSuccessMessage('Изображение добавлено.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при добавлении изображения.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const onSwapOrder = async (sourceImageId: string, direction: 'up' | 'down'): Promise<string | null> => {
    const sourceIndex = images.findIndex((image) => image.id === sourceImageId);
    if (sourceIndex === -1) {
      return 'Запрошенное изображение больше недоступно.';
    }

    const targetIndex = sourceIndex + (direction === 'up' ? -1 : 1);
    const sourceImage = images[sourceIndex];
    const targetImage = images[targetIndex];
    if (!sourceImage || !targetImage) {
      return 'Изображение больше нельзя переместить.';
    }

    const requests = [
      { id: sourceImage.id, payload: { url: sourceImage.url, alt: sourceImage.alt ?? '', sortOrder: targetImage.sortOrder, isPrimary: sourceImage.isPrimary } },
      { id: targetImage.id, payload: { url: targetImage.url, alt: targetImage.alt ?? '', sortOrder: sourceImage.sortOrder, isPrimary: targetImage.isPrimary } },
    ];

    for (const request of requests) {
      const response = await fetch(`/api/admin/product-images/${request.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(request.payload),
      });
      const data = (await response.json().catch(() => null)) as { ok: true } | { ok: false; error?: string } | null;
      if (!response.ok || !data || !data.ok) {
        const errorCode = data && !data.ok ? data.error : undefined;
        return mapAdminImageError(errorCode);
      }
    }

    return null;
  };

  return (
    <section className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h2 className={styles.adminCardTitle}>Изображения товара</h2>
          <p className={styles.adminCardSub}>
            Главное изображение, порядок галереи и понятные подписи для витрины.
          </p>
        </div>
        <span className={styles.adminStatusBadge}>{images.length} изображений</span>
      </div>

      <form className={styles.adminForm} onSubmit={onAddImage} aria-busy={isPending}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Ссылка на изображение</span>
          <input className={styles.adminInput} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." required />
          <span className={styles.adminFieldHint}>
            Используйте прямую ссылку, которая открывается без авторизации.
          </span>
        </label>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Описание изображения</span>
          <input className={styles.adminInput} value={alt} onChange={(event) => setAlt(event.target.value)} />
          <span className={styles.adminFieldHint}>
            Кратко опишите изображение, чтобы карточка оставалась понятной и доступной.
          </span>
        </label>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Порядок</span>
            <input type="number" min="0" step="1" className={styles.adminInput} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </label>

          <label className={styles.adminCheckboxRow}>
            <input type="checkbox" className={styles.adminCheckbox} checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
            <span className={styles.adminLabel}>Главное изображение</span>
          </label>
        </div>

        <button type="submit" className={styles.adminPrimaryButton} disabled={isPending} aria-label="Добавить изображение товара">
          {isPending ? 'Добавляем...' : 'Добавить изображение'}
        </button>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </form>

      {images.length === 0 ? (
        <StoreEmptyState title="Изображений пока нет" description="Добавьте главное изображение, чтобы карточка выглядела собранно и в витрине, и в админке." />
      ) : (
        <div className={styles.adminImageList}>
          {images.map((image, index) => (
            <ImageRowEditor key={image.id} image={image} canMoveUp={index > 0} canMoveDown={index < images.length - 1} onSwapOrder={onSwapOrder} />
          ))}
        </div>
      )}
    </section>
  );
}

