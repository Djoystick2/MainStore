'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminCategoryOption } from '@/features/admin';

import styles from './admin.module.css';

interface AdminCategoriesManagerProps {
  categories: AdminCategoryOption[];
}

interface CategoryRowProps {
  category: AdminCategoryOption;
}

function mapAdminCategoryError(error: string | undefined): string {
  if (!error) {
    return 'Could not update category.';
  }

  switch (error) {
    case 'not_configured':
      return 'Admin backend is temporarily unavailable.';
    case 'category_title_required':
      return 'Category title is required.';
    case 'invalid_category_slug':
      return 'Category slug should contain lowercase letters, digits, and hyphens.';
    case 'invalid_category_payload':
    case 'title_and_slug_required':
      return 'Fill in both title and slug.';
    case 'admin_access_denied':
      return 'You do not have access to this admin action.';
    default:
      return 'Could not save category. Please retry.';
  }
}

function CategoryRow({ category }: CategoryRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(category.title);
  const [slug, setSlug] = useState(category.slug);
  const [isActive, setIsActive] = useState(category.isActive);
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

      try {
        const response = await fetch(`/api/admin/categories/${category.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, slug, isActive }),
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

        setSuccessMessage('Category saved.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while saving category.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <article className={styles.adminImageCard}>
      <div className={styles.adminForm}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Title</span>
          <input
            className={styles.adminInput}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Slug</span>
          <input
            className={styles.adminInput}
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
          />
        </label>

        <label className={styles.adminCheckboxRow}>
          <input
            type="checkbox"
            className={styles.adminCheckbox}
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span className={styles.adminLabel}>Active category</span>
        </label>

        <button
          type="button"
          className={styles.adminActionButton}
          onClick={onSave}
          disabled={isPending}
          aria-label={`Save category ${category.title}`}
        >
          {isPending ? 'Saving...' : 'Save category'}
        </button>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminCategoriesManager({ categories }: AdminCategoriesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const onCreate: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);
      try {
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title, slug, isActive }),
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
        setIsActive(true);
        setSuccessMessage('Category created.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while creating category.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminCard}>
      <h2 className={styles.adminCardTitle}>Categories</h2>

      <form className={styles.adminForm} onSubmit={onCreate} aria-busy={isPending}>
        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Title</span>
            <input
              className={styles.adminInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Slug</span>
            <input
              className={styles.adminInput}
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              required
            />
          </label>
        </div>

        <label className={styles.adminCheckboxRow}>
          <input
            type="checkbox"
            className={styles.adminCheckbox}
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span className={styles.adminLabel}>Active</span>
        </label>

        <button
          type="submit"
          className={styles.adminPrimaryButton}
          disabled={isPending}
          aria-label="Create category"
        >
          {isPending ? 'Creating...' : 'Create category'}
        </button>
        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </form>

      <div className={styles.adminImageList}>
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </div>
    </section>
  );
}
