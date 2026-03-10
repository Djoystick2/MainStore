'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { OrderStatus } from '@/features/admin';

import styles from './admin.module.css';

const statusOptions: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

function mapAdminOrderStatusError(error: string | undefined): string {
  if (!error) {
    return 'Could not update order status.';
  }

  switch (error) {
    case 'not_configured':
      return 'Admin backend is temporarily unavailable.';
    case 'invalid_order_status':
      return 'Selected order status is invalid.';
    case 'admin_access_denied':
      return 'You do not have access to this admin action.';
    default:
      return 'Could not update order status. Please retry.';
  }
}

interface AdminOrderStatusControlProps {
  orderId: string;
  initialStatus: OrderStatus;
}

export function AdminOrderStatusControl({
  orderId,
  initialStatus,
}: AdminOrderStatusControlProps) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [savedStatus, setSavedStatus] = useState<OrderStatus>(initialStatus);
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
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
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
          setErrorMessage(mapAdminOrderStatusError(errorCode));
          return;
        }

        setSavedStatus(status);
        setSuccessMessage('Order status updated.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while updating order status.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <div className={styles.adminForm}>
      <label className={styles.adminField}>
        <span className={styles.adminLabel}>Order status</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as OrderStatus)}
          className={styles.adminSelect}
          aria-label="Order status"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        className={styles.adminPrimaryLink}
        onClick={handleSave}
        disabled={isPending || status === savedStatus}
        aria-label="Update order status"
      >
        {isPending ? 'Updating...' : 'Update status'}
      </button>

      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </div>
  );
}
