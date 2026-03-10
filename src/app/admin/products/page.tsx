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
    <AdminScreen title="Товары" subtitle="Каталог как рабочее пространство магазина">
      {combinedMessage && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            hasError && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление каталога</p>
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

      <section className={adminStyles.adminPageLead}>
        <h2 className={adminStyles.adminPageLeadTitle}>Управление карточками без лишних переходов</h2>
        <p className={adminStyles.adminPageLeadText}>
          Ищите товары, проверяйте публикацию, остатки и скидки, а массовые обновления оставляйте
          для Excel import.
        </p>
        <div className={adminStyles.adminActionBar}>
          <Link href="/admin/products/new" className={adminStyles.adminPrimaryLink}>
            Создать товар
          </Link>
          <Link href="/admin/import" className={adminStyles.adminActionLink}>
            Открыть import
          </Link>
          <Link href="/admin/discounts" className={adminStyles.adminActionLink}>
            Проверить скидки
          </Link>
        </div>
      </section>

      {productsResult.products.length === 0 ? (
        <StoreEmptyState
          title="Товаров пока нет"
          description="Создайте первый товар вручную или загрузите каталог через Excel import."
          actionLabel="Создать товар"
          actionHref="/admin/products/new"
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
