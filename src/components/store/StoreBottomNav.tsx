'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './store.module.css';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    href: '/',
    icon: 'HM',
    label: 'Главная',
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/catalog',
    icon: 'CT',
    label: 'Каталог',
    isActive: (pathname) =>
      pathname === '/catalog' || pathname.startsWith('/products/'),
  },
  {
    href: '/cart',
    icon: 'CR',
    label: 'Корзина',
    isActive: (pathname) => pathname === '/cart' || pathname === '/checkout',
  },
  {
    href: '/favorites',
    icon: 'FV',
    label: 'Избранное',
    isActive: (pathname) => pathname === '/favorites',
  },
  {
    href: '/profile',
    icon: 'PF',
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
