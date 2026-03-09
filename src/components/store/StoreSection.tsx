import type { PropsWithChildren } from 'react';
import Link from 'next/link';

import styles from './store.module.css';

interface StoreSectionProps extends PropsWithChildren {
  title: string;
  actionLabel?: string;
  actionHref?: string;
}

export function StoreSection({
  title,
  actionLabel,
  actionHref,
  children,
}: StoreSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className={styles.sectionAction}
            aria-label={actionLabel}
          >
            {actionLabel}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
