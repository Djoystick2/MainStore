'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type {
  AdminCollectionOption,
  AdminProductCollectionAssignment,
} from '@/features/admin/types';

import styles from './admin.module.css';

interface AdminProductCollectionsManagerProps {
  productId: string;
  collections: AdminCollectionOption[];
  assignments: AdminProductCollectionAssignment[];
}

interface AssignmentRowProps {
  productId: string;
  assignment: AdminProductCollectionAssignment;
  isDisabled: boolean;
  onBusyChange: (next: boolean) => void;
  onFeedback: (kind: 'error' | 'success', message: string) => void;
}

function mapCollectionBindingError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить связь с подборкой.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'collection_not_found':
    case 'product_not_found':
      return 'Товар или подборка больше недоступны.';
    case 'invalid_collection_sort_order':
      return 'Порядок в подборке должен быть неотрицательным целым числом.';
    case 'invalid_product_collection_payload':
      return 'Некорректные данные связи с подборкой.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось обновить связь с подборкой. Попробуйте еще раз.';
  }
}

function AssignmentRow({
  productId,
  assignment,
  isDisabled,
  onBusyChange,
  onFeedback,
}: AssignmentRowProps) {
  const router = useRouter();
  const [sortOrder, setSortOrder] = useState(String(assignment.sortOrder));

  const onSave = async () => {
    const parsedSortOrder = Number(sortOrder);
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      onFeedback('error', 'Порядок в подборке должен быть неотрицательным целым числом.');
      return;
    }

    onBusyChange(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          collectionId: assignment.collectionId,
          sortOrder: parsedSortOrder,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !data || !data.ok) {
        const errorCode = data && !data.ok ? data.error : undefined;
        onFeedback('error', mapCollectionBindingError(errorCode));
        return;
      }

      onFeedback('success', 'Связь с подборкой сохранена.');
      router.refresh();
    } catch {
      onFeedback('error', 'Сетевая ошибка при сохранении связи.');
    } finally {
      onBusyChange(false);
    }
  };

  const onRemove = async () => {
    onBusyChange(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/collections`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collectionId: assignment.collectionId }),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string }
        | null;

      if (!response.ok || !data || !data.ok) {
        const errorCode = data && !data.ok ? data.error : undefined;
        onFeedback('error', mapCollectionBindingError(errorCode));
        return;
      }

      onFeedback('success', 'Связь с подборкой удалена.');
      router.refresh();
    } catch {
      onFeedback('error', 'Сетевая ошибка при удалении связи.');
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <article className={styles.adminMetaCell}>
      <div className={styles.adminCardHead}>
        <div>
          <p className={styles.adminMetaValue}>{assignment.title}</p>
          <p className={styles.adminCardSub}>{assignment.slug}</p>
        </div>
      </div>
      <div className={styles.adminInlineActionRow}>
        <input
          type="number"
          min="0"
          step="1"
          className={styles.adminInput}
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value)}
          aria-label={`Порядок для ${assignment.title}`}
        />
        <button
          type="button"
          className={styles.adminActionButton}
          onClick={onSave}
          disabled={isDisabled}
          aria-label={`Сохранить связь с подборкой ${assignment.title}`}
        >
          Сохранить
        </button>
      </div>
      <div className={styles.adminActions}>
        <button
          type="button"
          className={styles.adminDangerButton}
          onClick={onRemove}
          disabled={isDisabled}
          aria-label={`Убрать из подборки ${assignment.title}`}
        >
          Удалить
        </button>
      </div>
    </article>
  );
}

export function AdminProductCollectionsManager({
  productId,
  collections,
  assignments,
}: AdminProductCollectionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? '');
  const [sortOrder, setSortOrder] = useState(String(assignments.length));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const linkedCollectionIds = new Set(assignments.map((assignment) => assignment.collectionId));
  const availableCollections = collections.filter((collection) => !linkedCollectionIds.has(collection.id));

  const onAssign: FormEventHandler<HTMLFormElement> = (event) => {
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
        setErrorMessage('Порядок в подборке должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/admin/products/${productId}/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            collectionId,
            sortOrder: parsedSortOrder,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapCollectionBindingError(errorCode));
          return;
        }

        setSuccessMessage('Связь с подборкой сохранена.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при добавлении в подборку.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h2 className={styles.adminCardTitle}>Подборки товара</h2>
          <p className={styles.adminCardSub}>
            Добавляйте товар в подборки и управляйте его порядком внутри них.
          </p>
        </div>
        <span className={styles.adminStatusBadge}>{assignments.length} связей</span>
      </div>

      {availableCollections.length > 0 && (
        <form className={styles.adminForm} onSubmit={onAssign} aria-busy={isPending}>
          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Подборка</span>
              <select
                className={styles.adminSelect}
                value={collectionId}
                onChange={(event) => setCollectionId(event.target.value)}
              >
                {availableCollections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.title}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Порядок</span>
              <input
                type="number"
                min="0"
                step="1"
                className={styles.adminInput}
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </label>
          </div>

          <button
            type="submit"
            className={styles.adminPrimaryButton}
            disabled={isPending}
            aria-label="Добавить товар в подборку"
          >
            {isPending ? 'Сохраняем...' : 'Добавить в подборку'}
          </button>
        </form>
      )}

      {assignments.length === 0 ? (
        <StoreEmptyState
          title="Связей с подборками пока нет"
          description="Используйте подборки, чтобы выводить товар в тематических блоках витрины."
        />
      ) : (
        <div className={styles.adminCardList}>
          {assignments.map((assignment) => (
            <AssignmentRow
              key={assignment.collectionId}
              productId={productId}
              assignment={assignment}
              isDisabled={isPending}
              onBusyChange={(next) => {
                isSubmittingRef.current = next;
              }}
              onFeedback={(kind, message) => {
                if (kind === 'error') {
                  setErrorMessage(message);
                  setSuccessMessage(null);
                  return;
                }

                setSuccessMessage(message);
                setErrorMessage(null);
              }}
            />
          ))}
        </div>
      )}

      {availableCollections.length === 0 && collections.length > 0 && (
        <p className={styles.adminCardSub}>Товар уже добавлен во все доступные подборки.</p>
      )}

      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </section>
  );
}

