'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type { AdminCollectionOption, CollectionUpsertInput } from '@/features/admin/types';

import styles from './admin.module.css';

interface AdminCollectionsManagerProps {
  collections: AdminCollectionOption[];
}

interface CollectionRowProps {
  collection: AdminCollectionOption;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapAdminCollectionError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить подборку.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'collection_title_required':
      return 'Укажите название подборки.';
    case 'invalid_collection_slug':
      return 'Slug подборки должен содержать только строчные буквы, цифры и дефисы.';
    case 'invalid_collection_sort_order':
      return 'Порядок вывода должен быть неотрицательным целым числом.';
    case 'slug_conflict':
      return 'Этот slug уже используется другой подборкой.';
    case 'collection_not_found':
      return 'Эта подборка больше недоступна.';
    case 'invalid_collection_payload':
      return 'Заполните обязательные поля подборки.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось сохранить подборку. Попробуйте еще раз.';
  }
}

function CollectionRow({ collection }: CollectionRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(collection.title);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description ?? '');
  const [shortText, setShortText] = useState(collection.shortText ?? '');
  const [sortOrder, setSortOrder] = useState(String(collection.sortOrder));
  const [isActive, setIsActive] = useState(collection.isActive);
  const [isFeatured, setIsFeatured] = useState(collection.isFeatured);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const onSave = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const parsedSortOrder = Number(sortOrder);
      if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
        setErrorMessage('Порядок вывода должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      const payload: CollectionUpsertInput = {
        title,
        slug,
        description,
        shortText,
        isActive,
        isFeatured,
        sortOrder: parsedSortOrder,
      };

      try {
        const response = await fetch(`/api/admin/collections/${collection.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminCollectionError(errorCode));
          return;
        }

        setSuccessMessage('Подборка сохранена.');
        setIsConfirmingDelete(false);
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при сохранении подборки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const onDelete = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/admin/collections/${collection.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminCollectionError(errorCode));
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при удалении подборки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <article className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h3 className={styles.adminCardTitle}>{collection.title}</h3>
          <p className={styles.adminCardSub}>
            {collection.productsCount} связанных товаров · {collection.slug}
          </p>
        </div>
        <div className={styles.adminBadgeRow}>
          {isFeatured && <span className={styles.adminFeatureBadge}>Рекомендуемая</span>}
          <span className={styles.adminStatusBadge}>{isActive ? 'Видна' : 'Скрыта'}</span>
        </div>
      </div>

      <div className={styles.adminForm}>
        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Название</span>
            <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Slug</span>
            <div className={styles.adminInlineActionRow}>
              <input className={styles.adminInput} value={slug} onChange={(event) => setSlug(event.target.value)} />
              <button
                type="button"
                className={styles.adminActionButton}
                onClick={() => setSlug(slugify(title))}
                disabled={!title.trim() || isPending}
              >
                Из названия
              </button>
            </div>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Короткий текст</span>
            <input className={styles.adminInput} value={shortText} onChange={(event) => setShortText(event.target.value)} />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Порядок вывода</span>
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

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Описание</span>
          <textarea
            className={styles.adminTextarea}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </label>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className={styles.adminLabel}>Показывать на витрине</span>
          </label>

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isFeatured}
              onChange={(event) => setIsFeatured(event.target.checked)}
            />
            <span className={styles.adminLabel}>Выделять как рекомендуемую</span>
          </label>
        </div>

        {isConfirmingDelete && (
          <div className={styles.adminCalloutWarn}>
            <p className={styles.adminCalloutTitle}>Подтверждение удаления</p>
            <p className={styles.adminCalloutText}>
              Подборка удалится, а связи с товарами будут безопасно сняты без удаления самих карточек.
            </p>
          </div>
        )}

        <div className={styles.adminActions}>
          <button type="button" className={styles.adminActionButton} onClick={onSave} disabled={isPending}>
            {isPending ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button type="button" className={styles.adminDangerButton} onClick={onDelete} disabled={isPending}>
            {isConfirmingDelete ? 'Подтвердить удаление' : 'Удалить'}
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminCollectionsManager({ collections }: AdminCollectionsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortText, setShortText] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const filteredCollections = collections.filter((collection) => {
    if (visibilityFilter === 'visible' && !collection.isActive) {
      return false;
    }
    if (visibilityFilter === 'hidden' && collection.isActive) {
      return false;
    }
    if (featuredFilter === 'featured' && !collection.isFeatured) {
      return false;
    }
    if (featuredFilter === 'standard' && collection.isFeatured) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }

    const haystack = `${collection.title} ${collection.slug} ${collection.shortText ?? ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const visibleCount = collections.filter((collection) => collection.isActive).length;
  const featuredCount = collections.filter((collection) => collection.isFeatured).length;
  const linkedProductsCount = collections.reduce(
    (total, collection) => total + collection.productsCount,
    0,
  );

  const onCreate: FormEventHandler<HTMLFormElement> = (event) => {
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
        setErrorMessage('Порядок вывода должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      const payload: CollectionUpsertInput = {
        title,
        slug,
        description,
        shortText,
        isActive,
        isFeatured,
        sortOrder: parsedSortOrder,
      };

      try {
        const response = await fetch('/api/admin/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminCollectionError(errorCode));
          return;
        }

        setTitle('');
        setSlug('');
        setDescription('');
        setShortText('');
        setSortOrder('0');
        setIsActive(true);
        setIsFeatured(false);
        setSuccessMessage('Подборка создана.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при создании подборки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Подборки</h2>
            <p className={styles.adminCardSub}>
              Используйте подборки как merchandising-слой для home, витрины и тематических входов.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{collections.length} всего</span>
            <span className={styles.adminFeatureBadge}>{featuredCount} рекомендуемых</span>
          </div>
        </div>

        <div className={styles.adminSummaryGrid}>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Видимые подборки</p>
            <p className={styles.adminSummaryValue}>{visibleCount}</p>
            <p className={styles.adminSummaryText}>Участвуют в storefront и витринных сценариях.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Рекомендуемые</p>
            <p className={styles.adminSummaryValue}>{featuredCount}</p>
            <p className={styles.adminSummaryText}>Приоритетны для home и маркетинговых блоков.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Связанные товары</p>
            <p className={styles.adminSummaryValue}>{linkedProductsCount}</p>
            <p className={styles.adminSummaryText}>Показывает, насколько подборки уже наполнены контентом.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>После фильтрации</p>
            <p className={styles.adminSummaryValue}>{filteredCollections.length}</p>
            <p className={styles.adminSummaryText}>Текущий рабочий список по фильтрам и поиску.</p>
          </div>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Поиск</span>
            <input
              className={styles.adminInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название, slug, текст"
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Видимость</span>
            <select
              className={styles.adminSelect}
              value={visibilityFilter}
              onChange={(event) =>
                setVisibilityFilter(event.target.value as 'all' | 'visible' | 'hidden')
              }
            >
              <option value="all">Все подборки</option>
              <option value="visible">Только видимые</option>
              <option value="hidden">Только скрытые</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Рекомендация</span>
            <select
              className={styles.adminSelect}
              value={featuredFilter}
              onChange={(event) =>
                setFeaturedFilter(event.target.value as 'all' | 'featured' | 'standard')
              }
            >
              <option value="all">Все подборки</option>
              <option value="featured">Только рекомендуемые</option>
              <option value="standard">Без рекомендации</option>
            </select>
          </label>
        </div>

        <div className={styles.adminCallout}>
          <p className={styles.adminCalloutTitle}>Storefront integration</p>
          <p className={styles.adminCalloutText}>
            Подборки уже связаны с home mini-shelves и merchandising-секциями. Скрывайте или
            перемещайте их здесь, если нужно быстро изменить витринные акценты без CMS.
          </p>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2 className={styles.adminCardTitle}>Создать подборку</h2>

        <form className={styles.adminForm} onSubmit={onCreate} aria-busy={isPending}>
          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Название</span>
              <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Slug</span>
              <div className={styles.adminInlineActionRow}>
                <input className={styles.adminInput} value={slug} onChange={(event) => setSlug(event.target.value)} required />
                <button
                  type="button"
                  className={styles.adminActionButton}
                  onClick={() => setSlug(slugify(title))}
                  disabled={!title.trim() || isPending}
                >
                  Из названия
                </button>
              </div>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Короткий текст</span>
              <input className={styles.adminInput} value={shortText} onChange={(event) => setShortText(event.target.value)} />
            </label>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Порядок вывода</span>
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

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Описание</span>
            <textarea className={styles.adminTextarea} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
          </label>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminCheckboxRow}>
              <input
                type="checkbox"
                className={styles.adminCheckbox}
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span className={styles.adminLabel}>Показывать на витрине</span>
            </label>

            <label className={styles.adminCheckboxRow}>
              <input
                type="checkbox"
                className={styles.adminCheckbox}
                checked={isFeatured}
                onChange={(event) => setIsFeatured(event.target.checked)}
              />
              <span className={styles.adminLabel}>Выделять как рекомендуемую</span>
            </label>
          </div>

          <button type="submit" className={styles.adminPrimaryButton} disabled={isPending}>
            {isPending ? 'Создаем...' : 'Создать подборку'}
          </button>

          {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
          {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
        </form>
      </section>

      {filteredCollections.length === 0 ? (
        <StoreEmptyState
          title={collections.length === 0 ? 'Подборок пока нет' : 'Совпадений не найдено'}
          description={
            collections.length === 0
              ? 'Создайте первую подборку для home, контентных блоков и merchandising-сценариев.'
              : 'Измените фильтры или поисковый запрос.'
          }
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredCollections.map((collection) => (
            <CollectionRow key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </section>
  );
}
