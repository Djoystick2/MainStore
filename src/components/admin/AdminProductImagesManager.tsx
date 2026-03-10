'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import type { AdminProductImageItem } from '@/features/admin';

import styles from './admin.module.css';

interface AdminProductImagesManagerProps {
  productId: string;
  images: AdminProductImageItem[];
}

interface ImageRowEditorProps {
  image: AdminProductImageItem;
}

function mapAdminImageError(error: string | undefined): string {
  if (!error) {
    return 'Could not update image.';
  }

  switch (error) {
    case 'not_configured':
      return 'Admin backend is temporarily unavailable.';
    case 'invalid_image_payload':
    case 'image_url_required':
      return 'Image URL is required.';
    case 'invalid_sort_order':
      return 'Sort order should be a non-negative integer.';
    case 'invalid_product':
    case 'image_not_found':
      return 'Requested image is no longer available.';
    case 'admin_access_denied':
      return 'You do not have access to this admin action.';
    default:
      return 'Could not update image. Please retry.';
  }
}

function ImageRowEditor({ image }: ImageRowEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(image.url);
  const [alt, setAlt] = useState(image.alt ?? '');
  const [sortOrder, setSortOrder] = useState(String(image.sortOrder));
  const [isPrimary, setIsPrimary] = useState(image.isPrimary);
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
        setErrorMessage('Sort order must be a non-negative integer.');
        isSubmittingRef.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/admin/product-images/${image.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            url,
            alt,
            sortOrder: parsedSortOrder,
            isPrimary,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }

        setSuccessMessage('Image updated.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while updating image.');
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
        const response = await fetch(`/api/admin/product-images/${image.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Network error while deleting image.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <article className={styles.adminImageCard}>
      <div
        className={styles.adminImagePreview}
        style={{
          backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.15), rgba(12, 18, 31, 0.15)), url(${url})`,
        }}
      />
      <div className={styles.adminForm}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Image URL</span>
          <input
            className={styles.adminInput}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Alt</span>
          <input
            className={styles.adminInput}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Sort order</span>
            <input
              type="number"
              min="0"
              step="1"
              className={styles.adminInput}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </label>

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            <span className={styles.adminLabel}>Primary</span>
          </label>
        </div>

        <div className={styles.adminActions}>
          <button
            type="button"
            className={styles.adminActionButton}
            onClick={onSave}
            disabled={isPending}
            aria-label="Save product image"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            className={styles.adminDangerButton}
            onClick={onDelete}
            disabled={isPending}
            aria-label="Delete product image"
          >
            Delete
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminProductImagesManager({
  productId,
  images,
}: AdminProductImagesManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
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
        setErrorMessage('Sort order must be a non-negative integer.');
        isSubmittingRef.current = false;
        return;
      }

      try {
        const response = await fetch(`/api/admin/products/${productId}/images`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            url,
            alt,
            sortOrder: parsedSortOrder,
            isPrimary,
          }),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminImageError(errorCode));
          return;
        }

        setUrl('');
        setAlt('');
        setSortOrder('0');
        setIsPrimary(false);
        setSuccessMessage('Image added.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while adding image.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminCard}>
      <h2 className={styles.adminCardTitle}>Product images</h2>

      <form className={styles.adminForm} onSubmit={onAddImage} aria-busy={isPending}>
        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Image URL</span>
          <input
            className={styles.adminInput}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
        </label>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Alt</span>
          <input
            className={styles.adminInput}
            value={alt}
            onChange={(event) => setAlt(event.target.value)}
          />
        </label>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Sort order</span>
            <input
              type="number"
              min="0"
              step="1"
              className={styles.adminInput}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            />
          </label>

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            <span className={styles.adminLabel}>Primary image</span>
          </label>
        </div>

        <button
          type="submit"
          className={styles.adminPrimaryButton}
          disabled={isPending}
          aria-label="Add product image"
        >
          {isPending ? 'Adding...' : 'Add image'}
        </button>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </form>

      <div className={styles.adminImageList}>
        {images.map((image) => (
          <ImageRowEditor key={image.id} image={image} />
        ))}
      </div>
    </section>
  );
}
