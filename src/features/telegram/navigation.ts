import { retrieveLaunchParams } from '@tma.js/sdk-react';

export function resolveTelegramBackFallback(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  if (pathname.startsWith('/products/')) {
    return '/catalog';
  }

  if (pathname === '/checkout') {
    return '/cart';
  }

  if (pathname.startsWith('/pay/')) {
    return '/orders';
  }

  if (pathname.startsWith('/orders/')) {
    return '/orders';
  }

  if (pathname === '/orders') {
    return '/profile';
  }

  if (pathname === '/favorites' || pathname === '/cart' || pathname === '/catalog') {
    return '/';
  }

  if (pathname === '/profile') {
    return '/';
  }

  if (pathname.startsWith('/admin/orders/')) {
    return '/admin/orders';
  }

  if (pathname.startsWith('/admin/products/') && pathname.endsWith('/edit')) {
    return '/admin/products';
  }

  if (pathname === '/admin/products/new') {
    return '/admin/products';
  }

  if (pathname.startsWith('/admin')) {
    return '/admin';
  }

  return '/';
}

export function buildStoreAbsoluteUrl(pathname: string, origin: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return new URL(normalizedPath, origin).toString();
}

export function buildTelegramShareUrl(targetUrl: string, text?: string): string {
  const shareUrl = new URL('https://t.me/share/url');
  shareUrl.searchParams.set('url', targetUrl);
  if (text) {
    shareUrl.searchParams.set('text', text);
  }
  return shareUrl.toString();
}

export function isTelegramMiniAppRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const runtime = window as Window & {
    Telegram?: { WebApp?: object };
    TelegramWebviewProxy?: object;
  };

  if (runtime.Telegram?.WebApp || runtime.TelegramWebviewProxy) {
    return true;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const launchKeys = ['tgWebAppData', 'tgWebAppPlatform', 'tgWebAppVersion', 'tgWebAppStartParam'];

  if (launchKeys.some((key) => searchParams.has(key) || hashParams.has(key))) {
    return true;
  }

  try {
    const launchParams = retrieveLaunchParams();
    return Boolean(
      launchParams.tgWebAppPlatform ||
        launchParams.tgWebAppVersion ||
        launchParams.tgWebAppData,
    );
  } catch {
    return false;
  }
}
