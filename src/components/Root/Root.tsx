'use client';

import { type PropsWithChildren, useEffect } from 'react';
import {
  initData,
  useLaunchParams,
  useSignal,
} from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { TelegramSessionBootstrap } from '@/components/auth/TelegramSessionBootstrap';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorPage } from '@/components/ErrorPage';
import {
  StoreUiPreferencesProvider,
  useStoreUiPreferences,
} from '@/components/Root/StoreUiPreferencesProvider';
import { useDidMount } from '@/hooks/useDidMount';
import { setLocale } from '@/core/i18n/locale';

import './styles.css';

function RootAppShell({
  children,
  platform,
}: PropsWithChildren<{ platform: 'ios' | 'base' }>) {
  const { theme } = useStoreUiPreferences();

  return (
    <AppRoot appearance={theme} platform={platform}>
      <TelegramSessionBootstrap>{children}</TelegramSessionBootstrap>
    </AppRoot>
  );
}

function RootInner({ children }: PropsWithChildren) {
  const lp = useLaunchParams();
  const initDataUser = useSignal(initData.user);

  // Set the user locale.
  useEffect(() => {
    if (initDataUser) {
      void setLocale(initDataUser.language_code);
    }
  }, [initDataUser]);

  return (
    <StoreUiPreferencesProvider>
      <RootAppShell platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}>
        {children}
      </RootAppShell>
    </StoreUiPreferencesProvider>
  );
}

export function Root(props: PropsWithChildren) {
  // Unfortunately, Telegram Mini Apps does not allow us to use all features of
  // the Server Side Rendering. That's why we are showing loader on the server
  // side.
  const didMount = useDidMount();

  return didMount ? (
    <ErrorBoundary fallback={ErrorPage}>
      <RootInner {...props} />
    </ErrorBoundary>
  ) : (
    <div className="root__loading">Загрузка</div>
  );
}
