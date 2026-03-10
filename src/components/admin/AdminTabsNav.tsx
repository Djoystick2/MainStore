'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './admin.module.css';

const tabs = [
  { href: '/admin', label: 'Главная' },
  { href: '/admin/products', label: 'Товары' },
  { href: '/admin/discounts', label: 'Скидки' },
  { href: '/admin/categories', label: 'Категории' },
  { href: '/admin/collections', label: 'Подборки' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/import', label: 'Импорт' },
];

export function AdminTabsNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.adminNav} aria-label="Разделы админки">
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href ||
          (tab.href !== '/admin' && pathname.startsWith(`${tab.href}/`));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={classNames(
              styles.adminNavLink,
              isActive && styles.adminNavLinkActive,
            )}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
