import Link from 'next/link';

import { AdminDiscountsManager } from '@/components/admin/AdminDiscountsManager';
import { AdminScreen } from '@/components/admin/AdminScreen';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminCategories, getAdminCollections, getAdminProducts } from '@/features/admin';
import { getAdminDiscounts } from '@/features/discounts';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminDiscountsPage() {
  const [discountsResult, productsResult, categoriesResult, collectionsResult] = await Promise.all([
    getAdminDiscounts(),
    getAdminProducts(),
    getAdminCategories(),
    getAdminCollections(),
  ]);

  const message =
    discountsResult.message ??
    productsResult.message ??
    categoriesResult.message ??
    collectionsResult.message;
  const hasError =
    discountsResult.status === 'error' ||
    productsResult.status === 'error' ||
    categoriesResult.status === 'error' ||
    collectionsResult.status === 'error';

  return (
    <AdminScreen title="Admin Discounts" subtitle="Manage pricing rules for products, categories, and collections" back={true}>
      {message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            hasError && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Discounts update</p>
          <p className={storeStyles.dataNoticeText}>{message}</p>
          {hasError && (
            <div className={storeStyles.dataNoticeActions}>
              <Link href="/admin/discounts" className={storeStyles.dataNoticeRetry} aria-label="Retry loading discounts">
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      {discountsResult.status === 'ok' &&
      productsResult.status === 'ok' &&
      categoriesResult.status === 'ok' &&
      collectionsResult.status === 'ok' ? (
        <AdminDiscountsManager
          discounts={discountsResult.discounts}
          products={productsResult.products}
          categories={categoriesResult.categories}
          collections={collectionsResult.collections}
        />
      ) : (
        <StoreEmptyState
          title="Discount workspace unavailable"
          description="Discount data is temporarily unavailable. Retry in a moment."
        />
      )}
    </AdminScreen>
  );
}
