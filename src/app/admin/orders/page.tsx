import Link from 'next/link';

import { AdminOrdersManager } from '@/components/admin/AdminOrdersManager';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminOrders } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminOrdersPage() {
  const ordersResult = await getAdminOrders();

  return (
    <AdminScreen title="Заказы" subtitle="Операционный контроль исполнения и оплаты">
      {ordersResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            ordersResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление заказов</p>
          <p className={storeStyles.dataNoticeText}>{ordersResult.message}</p>
          {(ordersResult.status === 'error' || ordersResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/orders"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку заказов"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      <section className={adminStyles.adminPageLead}>
        <h2 className={adminStyles.adminPageLeadTitle}>Не теряйте заказ между оплатой и исполнением</h2>
        <p className={adminStyles.adminPageLeadText}>
          В этом разделе видно, где покупатель еще не завершил оплату, а где заказ уже можно
          подтверждать, собирать и передавать в доставку.
        </p>
      </section>

      {ordersResult.orders.length === 0 ? (
        <StoreEmptyState
          title="Заказов пока нет"
          description="Заказы появятся здесь после оформления клиентами."
          actionLabel="Перейти к витрине"
          actionHref="/"
        />
      ) : (
        <AdminOrdersManager orders={ordersResult.orders} />
      )}
    </AdminScreen>
  );
}
