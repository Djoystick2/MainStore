import Link from 'next/link';

import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminDashboardData } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminPage() {
  const dashboard = await getAdminDashboardData();

  return (
    <AdminScreen title="Админка" subtitle="Управление каталогом и заказами">
      {dashboard.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            dashboard.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление админки</p>
          <p className={storeStyles.dataNoticeText}>{dashboard.message}</p>
          {(dashboard.status === 'error' || dashboard.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку админки"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {dashboard.dashboard ? (
        <>
          <section className={storeStyles.section}>
            <h2 className={storeStyles.sectionTitle}>Показатели магазина</h2>
            <div className={storeStyles.infoGrid}>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Товары</p>
                <p className={storeStyles.infoValue}>{dashboard.dashboard.productsCount}</p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Заказы</p>
                <p className={storeStyles.infoValue}>{dashboard.dashboard.ordersCount}</p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Активные товары</p>
                <p className={storeStyles.infoValue}>
                  {dashboard.dashboard.activeProductsCount}
                </p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Ожидающие заказы</p>
                <p className={storeStyles.infoValue}>
                  {dashboard.dashboard.pendingOrdersCount}
                </p>
              </div>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Разделы управления</h2>
            <div className={adminStyles.adminActions}>
              <Link href="/admin/products" className={adminStyles.adminPrimaryLink}>
                Товары
              </Link>
              <Link href="/admin/discounts" className={adminStyles.adminActionLink}>
                Скидки
              </Link>
              <Link href="/admin/orders" className={adminStyles.adminActionLink}>
                Заказы
              </Link>
              <Link href="/admin/import" className={adminStyles.adminActionLink}>
                Импорт
              </Link>
            </div>
          </section>
        </>
      ) : (
        <StoreEmptyState
          title="Данные админки недоступны"
          description="Попробуйте обновить страницу чуть позже."
        />
      )}
    </AdminScreen>
  );
}
