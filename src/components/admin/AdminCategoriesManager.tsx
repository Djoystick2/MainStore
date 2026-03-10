'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type { AdminCategoryOption, CategoryUpsertInput } from '@/features/admin/types';

import styles from './admin.module.css';

interface AdminCategoriesManagerProps {
  categories: AdminCategoryOption[];
}

interface CategoryRowProps {
  category: AdminCategoryOption;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapAdminCategoryError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось обновить категорию.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'category_title_required':
      return 'Укажите название категории.';
    case 'invalid_category_slug':
      return 'Slug категории должен содержать строчные буквы, цифры и дефисы.';
    case 'invalid_category_sort_order':
      return 'Порядок вывода должен быть неотрицательным целым числом.';
    case 'slug_conflict':
      return 'Этот slug уже используется другой категорией.';
    case 'category_not_found':
      return 'Эта категория больше недоступна.';
    case 'invalid_category_payload':
      return 'Заполните обязательные поля категории.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось сохранить категорию. Попробуйте еще раз.';
  }
}

function CategoryRow({ category }: CategoryRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(category.title);
  const [slug, setSlug] = useState(category.slug);
  const [description, setDescription] = useState(category.description ?? '');
  const [shortText, setShortText] = useState(category.shortText ?? '');
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [isActive, setIsActive] = useState(category.isActive);
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

      const payload: CategoryUpsertInput = {
        title,
        slug,
        description,
        shortText,
        isActive,
        sortOrder: parsedSortOrder,
      };

      try {
        const response = await fetch(`/api/admin/categories/${category.id}`, {
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
          setErrorMessage(mapAdminCategoryError(errorCode));
          return;
        }

        setSuccessMessage('Категория сохранена.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при сохранении категории.');
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
        const response = await fetch(`/api/admin/categories/${category.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; summary?: { detachedProductsCount: number } }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminCategoryError(errorCode));
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при удалении категории.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <article className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h3 className={styles.adminCardTitle}>{category.title}</h3>
          <p className={styles.adminCardSub}>
            {category.productsCount} связанных товаров
          </p>
        </div>
        <div className={styles.adminBadgeRow}>
          <span className={styles.adminStatusBadge}>{isActive ? 'Видна' : 'Скрыта'}</span>
        </div>
      </div>

      <div className={styles.adminForm}>
        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Название</span>
            <input
              className={styles.adminInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Slug</span>
            <div className={styles.adminInlineActionRow}>
              <input
                className={styles.adminInput}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
              <button
                type="button"
                className={styles.adminActionButton}
                onClick={() => setSlug(slugify(title))}
                disabled={!title.trim() || isPending}
                aria-label="Сгенерировать slug категории"
              >
                Из названия
              </button>
            </div>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Короткий текст</span>
            <input
              className={styles.adminInput}
              value={shortText}
              onChange={(event) => setShortText(event.target.value)}
            />
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

        <label className={styles.adminCheckboxRow}>
          <input
            type="checkbox"
            className={styles.adminCheckbox}
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span className={styles.adminLabel}>Показывать на витрине</span>
        </label>

        <div className={styles.adminActions}>
          <button
            type="button"
            className={styles.adminActionButton}
            onClick={onSave}
            disabled={isPending}
            aria-label={`Сохранить категорию ${category.title}`}
          >
            {isPending ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button
            type="button"
            className={styles.adminDangerButton}
            onClick={onDelete}
            disabled={isPending}
            aria-label={`Удалить категорию ${category.title}`}
          >
            {isConfirmingDelete ? 'Подтвердить удаление' : 'Удалить'}
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminCategoriesManager({ categories }: AdminCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [shortText, setShortText] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const filteredCategories = categories.filter((category) => {
    if (visibilityFilter === 'visible' && !category.isActive) {
      return false;
    }
    if (visibilityFilter === 'hidden' && category.isActive) {
      return false;
    }

    if (!search.trim()) {
      return true;
    }

    const haystack = `${category.title} ${category.slug} ${category.shortText ?? ''}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

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

      const payload: CategoryUpsertInput = {
        title,
        slug,
        description,
        shortText,
        isActive,
        sortOrder: parsedSortOrder,
      };

      try {
        const response = await fetch('/api/admin/categories', {
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
          setErrorMessage(mapAdminCategoryError(errorCode));
          return;
        }

        setTitle('');
        setSlug('');
        setDescription('');
        setShortText('');
        setSortOrder('0');
        setIsActive(true);
        setSuccessMessage('Категория создана.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при создании категории.');
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
            <h2 className={styles.adminCardTitle}>Категории</h2>
            <p className={styles.adminCardSub}>
              Навигация, видимость, тексты и порядок вывода для витрины.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{categories.length} всего</span>
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
              <option value="all">Все категории</option>
              <option value="visible">Только видимые</option>
              <option value="hidden">Только скрытые</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2 className={styles.adminCardTitle}>Создать категорию</h2>

        <form className={styles.adminForm} onSubmit={onCreate} aria-busy={isPending}>
          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Название</span>
              <input
                className={styles.adminInput}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Slug</span>
              <div className={styles.adminInlineActionRow}>
                <input
                  className={styles.adminInput}
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className={styles.adminActionButton}
                  onClick={() => setSlug(slugify(title))}
                  disabled={!title.trim() || isPending}
                  aria-label="Сгенерировать slug категории"
                >
                  Из названия
                </button>
              </div>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Короткий текст</span>
              <input
                className={styles.adminInput}
                value={shortText}
                onChange={(event) => setShortText(event.target.value)}
              />
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

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className={styles.adminLabel}>Показывать на витрине</span>
          </label>

          <button
            type="submit"
            className={styles.adminPrimaryButton}
            disabled={isPending}
            aria-label="Создать категорию"
          >
            {isPending ? 'Создаем...' : 'Создать категорию'}
          </button>

          {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
          {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
        </form>
      </section>

      {filteredCategories.length === 0 ? (
        <StoreEmptyState
          title={categories.length === 0 ? 'Категорий пока нет' : 'Совпадений не найдено'}
          description={
            categories.length === 0
              ? 'Создайте первую категорию, чтобы упорядочить каталог и входы на витрине.'
              : 'Измените фильтры или поисковый запрос.'
          }
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredCategories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </div>
      )}
    </section>
  );
}
