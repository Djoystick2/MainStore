'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { classNames } from '@/css/classnames';

import styles from './admin.module.css';

const tabs = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/discounts', label: 'Discounts' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/collections', label: 'Collections' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/import', label: 'Import' },
];

export function AdminTabsNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.adminNav} aria-label="Admin sections">
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
