import Link from 'next/link';

import { AdminCollectionsManager } from '@/components/admin/AdminCollectionsManager';
import { AdminScreen } from '@/components/admin/AdminScreen';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminCollections } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminCollectionsPage() {
  const collectionsResult = await getAdminCollections();

  return (
    <AdminScreen title="Подборки" subtitle="Контентные и merchandising-группы витрины" back={true}>
      {collectionsResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            collectionsResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление подборок</p>
          <p className={storeStyles.dataNoticeText}>{collectionsResult.message}</p>
          {(collectionsResult.status === 'error' || collectionsResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/collections"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку подборок"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {collectionsResult.status === 'ok' ? (
        <AdminCollectionsManager collections={collectionsResult.collections} />
      ) : (
        <StoreEmptyState
          title="Не удалось загрузить подборки"
          description="Подборки временно недоступны. Попробуйте чуть позже."
          actionLabel="Повторить"
          actionHref="/admin/collections"
        />
      )}
    </AdminScreen>
  );
}
