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
    <AdminScreen title="Admin Dashboard" subtitle="Manage catalog and orders">
      {dashboard.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            dashboard.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Admin update</p>
          <p className={storeStyles.dataNoticeText}>{dashboard.message}</p>
          {(dashboard.status === 'error' || dashboard.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin"
                className={storeStyles.dataNoticeRetry}
                aria-label="Retry loading admin dashboard"
              >
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      {dashboard.dashboard ? (
        <>
          <section className={storeStyles.section}>
            <h2 className={storeStyles.sectionTitle}>Store metrics</h2>
            <div className={storeStyles.infoGrid}>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Products</p>
                <p className={storeStyles.infoValue}>{dashboard.dashboard.productsCount}</p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Orders</p>
                <p className={storeStyles.infoValue}>{dashboard.dashboard.ordersCount}</p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Active products</p>
                <p className={storeStyles.infoValue}>
                  {dashboard.dashboard.activeProductsCount}
                </p>
              </div>
              <div className={storeStyles.infoItem}>
                <p className={storeStyles.infoLabel}>Pending orders</p>
                <p className={storeStyles.infoValue}>
                  {dashboard.dashboard.pendingOrdersCount}
                </p>
              </div>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Management links</h2>
            <div className={adminStyles.adminActions}>
              <Link href="/admin/products" className={adminStyles.adminPrimaryLink}>
                Open products
              </Link>
              <Link href="/admin/orders" className={adminStyles.adminActionLink}>
                Open orders
              </Link>
              <Link href="/admin/import" className={adminStyles.adminActionLink}>
                Import scaffold
              </Link>
            </div>
          </section>
        </>
      ) : (
        <StoreEmptyState
          title="Admin data is unavailable"
          description="Admin data is temporarily unavailable. Retry in a moment."
        />
      )}
    </AdminScreen>
  );
}
