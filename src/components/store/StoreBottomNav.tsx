'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface NavItem {
  href: string;
  icon: ReactNode;
  label: string;
  isActive: (pathname: string) => boolean;
}

function createNavIcon(path: ReactNode): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.bottomNavIconGlyph}>
      {path}
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    href: '/',
    icon: createNavIcon(
      <path
        d="M4.5 10.5 12 4l7.5 6.5v8a1 1 0 0 1-1 1h-4.5v-5h-4v5H5.5a1 1 0 0 1-1-1v-8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />,
    ),
    label: 'Главная',
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/catalog',
    icon: createNavIcon(
      <>
        <rect x="4" y="5" width="7" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="5" width="7" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="4" y="13" width="7" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="13" width="7" height="6.5" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </>,
    ),
    label: 'Каталог',
    isActive: (pathname) =>
      pathname === '/catalog' || pathname.startsWith('/products/'),
  },
  {
    href: '/cart',
    icon: createNavIcon(
      <>
        <path
          d="M4.5 6h2.2l1.5 8.2a1 1 0 0 0 1 .8h7.7a1 1 0 0 0 1-.8L19.5 8H8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10" cy="18.5" r="1.2" fill="currentColor" />
        <circle cx="17" cy="18.5" r="1.2" fill="currentColor" />
      </>,
    ),
    label: 'Корзина',
    isActive: (pathname) => pathname === '/cart' || pathname === '/checkout',
  },
  {
    href: '/favorites',
    icon: createNavIcon(
      <path
        d="M12 19.2 5.8 13a4 4 0 1 1 5.7-5.6L12 8l.5-.6A4 4 0 1 1 18.2 13L12 19.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />,
    ),
    label: 'Избранное',
    isActive: (pathname) => pathname === '/favorites',
  },
  {
    href: '/profile',
    icon: createNavIcon(
      <>
        <circle cx="12" cy="8.2" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M5.5 19c1.6-3 4-4.5 6.5-4.5s4.9 1.5 6.5 4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </>,
    ),
    label: 'Профиль',
    isActive: (pathname) =>
      pathname === '/profile' ||
      pathname.startsWith('/orders') ||
      pathname === '/admin',
  },
];

export function StoreBottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bottomNavShell} aria-label="Навигация магазина">
      <div className={styles.bottomNav}>
        {navItems.map((item) => {
          const isActive = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={classNames(
                styles.bottomNavLink,
                isActive && styles.bottomNavLinkActive,
              )}
            >
              <span className={styles.bottomNavIcon}>{item.icon}</span>
              <span className={styles.bottomNavLabel}>{item.label}</span>
              <span className={styles.bottomNavActiveGlow} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
