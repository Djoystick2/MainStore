import type { PropsWithChildren } from 'react';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface StoreScreenContainerProps extends PropsWithChildren {
  hasBottomNav?: boolean;
}

export function StoreScreenContainer({
  children,
  hasBottomNav = true,
}: StoreScreenContainerProps) {
  return (
    <div
      className={classNames(
        styles.container,
        hasBottomNav ? styles.containerWithBottomNav : styles.containerWithoutBottomNav,
      )}
    >
      {children}
    </div>
  );
}
