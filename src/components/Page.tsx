'use client';

import { backButton } from '@tma.js/sdk-react';
import { PropsWithChildren, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { resolveTelegramBackFallback } from '@/features/telegram/navigation';

export function Page({ children, back = true }: PropsWithChildren<{
  /**
   * True if it is allowed to go back from this page.
   * @default true
   */
  back?: boolean
}>) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (back) {
      backButton.show();
    } else {
      backButton.hide();
    }
  }, [back]);

  useEffect(() => {
    return backButton.onClick(() => {
      if (!back) {
        return;
      }

      const fallbackHref = resolveTelegramBackFallback(pathname);
      if (fallbackHref && fallbackHref !== pathname) {
        router.replace(fallbackHref);
        return;
      }

      router.back();
    });
  }, [back, pathname, router]);

  return <>{children}</>;
}
