import type { PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

import { Root } from '@/components/Root/Root';
import { I18nProvider } from '@/core/i18n/provider';

import '@telegram-apps/telegram-ui/dist/styles.css';
import 'normalize.css/normalize.css';
import './_assets/globals.css';

export const metadata: Metadata = {
  title: 'MainStore',
  description: 'MainStore в Telegram: витрина, заказы и админ-панель магазина.',
};

const storeThemeBootstrapScript = `
  (function () {
    try {
      var storedTheme = window.localStorage.getItem('mainstore:theme');
      if (storedTheme === 'dark' || storedTheme === 'light') {
        document.documentElement.dataset.storeTheme = storedTheme;
        document.documentElement.style.colorScheme = storedTheme;
      }
    } catch (error) {
      // Ignore storage access issues before hydration.
    }
  })();
`;

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: storeThemeBootstrapScript }} />
      </head>
      <body>
        <I18nProvider>
          <Root>{children}</Root>
        </I18nProvider>
      </body>
    </html>
  );
}
