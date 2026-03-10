import Link from 'next/link';

import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminCategories } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminCreateProductPage() {
  const categoriesResult = await getAdminCategories();

  return (
    <AdminScreen title="Create Product" subtitle="Add new product to catalog" back={true}>
      {categoriesResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            categoriesResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Categories update</p>
          <p className={storeStyles.dataNoticeText}>{categoriesResult.message}</p>
          {(categoriesResult.status === 'error' ||
            categoriesResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/products/new"
                className={storeStyles.dataNoticeRetry}
                aria-label="Retry loading categories"
              >
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      <Link href="/admin/products" className={adminStyles.adminActionLink}>
        Back to products
      </Link>

      {categoriesResult.status === 'ok' ? (
        <AdminProductForm mode="create" categories={categoriesResult.categories} />
      ) : (
        <StoreEmptyState
          title="Cannot load categories"
          description="Categories are temporarily unavailable. Retry in a moment."
        />
      )}
    </AdminScreen>
  );
}
