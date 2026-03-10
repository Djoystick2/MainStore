import Link from 'next/link';

import { AdminProductsCatalogManager } from '@/components/admin/AdminProductsCatalogManager';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminProducts } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminProductsPage() {
  const productsResult = await getAdminProducts();
  const combinedMessage = productsResult.message;
  const hasError = productsResult.status === 'error';

  return (
    <AdminScreen title="Товары" subtitle="Управление каталогом как цельным контентным слоем">
      {combinedMessage && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            hasError && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление товаров</p>
          <p className={storeStyles.dataNoticeText}>{combinedMessage}</p>
          {hasError && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/products"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку товаров"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      <Link
        href="/admin/products/new"
        className={adminStyles.adminPrimaryLink}
        aria-label="Создать товар"
      >
        Создать товар
      </Link>

      {productsResult.products.length === 0 ? (
        <StoreEmptyState
          title="Товаров пока нет"
          description="Создайте первый товар в админке."
        />
      ) : (
        <AdminProductsCatalogManager
          products={productsResult.products}
          categories={productsResult.categories}
        />
      )}
    </AdminScreen>
  );
}
