import Link from 'next/link';

import styles from './store.module.css';

interface StoreEmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export function StoreEmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: StoreEmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <h2 className={styles.emptyStateTitle}>{title}</h2>
      <p className={styles.emptyStateText}>{description}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className={styles.emptyStateAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </Link>
      )}
    </section>
  );
}
