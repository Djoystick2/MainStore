'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { ProductStatus } from '@/features/admin';

import styles from './admin.module.css';

const statusOptions: ProductStatus[] = ['draft', 'active', 'archived'];

function mapAdminProductStatusError(error: string | undefined): string {
  if (!error) {
    return 'Could not update status.';
  }

  switch (error) {
    case 'not_configured':
      return 'Admin backend is temporarily unavailable.';
    case 'invalid_status':
      return 'Selected status is invalid.';
    case 'admin_access_denied':
      return 'You do not have access to this admin action.';
    default:
      return 'Could not update status. Please retry.';
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
        setSuccessMessage('Status updated.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while updating status.');
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
        aria-label="Product status"
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.adminActionButton}
        onClick={handleSave}
        disabled={isPending || status === savedStatus}
        aria-label="Save product status"
      >
        {isPending ? 'Saving...' : 'Save status'}
      </button>
      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </div>
  );
}
