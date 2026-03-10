'use client';

import type { PropsWithChildren } from 'react';

import { Page } from '@/components/Page';

import { StoreBottomNav } from './StoreBottomNav';
import { StoreHeader } from './StoreHeader';
import { StoreScreenContainer } from './StoreScreenContainer';
import styles from './store.module.css';

interface StoreScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  back?: boolean;
  showBottomNav?: boolean;
}

export function StoreScreen({
  title,
  subtitle,
  back = false,
  showBottomNav = true,
  children,
}: StoreScreenProps) {
  return (
    <Page back={back}>
      <div className={styles.screen}>
        <StoreHeader title={title} subtitle={subtitle} />
        <StoreScreenContainer hasBottomNav={showBottomNav}>
          {children}
        </StoreScreenContainer>
        {showBottomNav && <StoreBottomNav />}
      </div>
    </Page>
  );
}
