import Link from 'next/link';

import { AdminCategoriesManager } from '@/components/admin/AdminCategoriesManager';
import { AdminScreen } from '@/components/admin/AdminScreen';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminCategories } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminCategoriesPage() {
  const categoriesResult = await getAdminCategories();

  return (
    <AdminScreen title="Категории" subtitle="Структура каталога для витрины и навигации" back={true}>
      {categoriesResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            categoriesResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление категорий</p>
          <p className={storeStyles.dataNoticeText}>{categoriesResult.message}</p>
          {(categoriesResult.status === 'error' || categoriesResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin/categories"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку категорий"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {categoriesResult.status === 'ok' ? (
        <AdminCategoriesManager categories={categoriesResult.categories} />
      ) : (
        <StoreEmptyState
          title="Не удалось загрузить категории"
          description="Категории временно недоступны. Попробуйте чуть позже."
          actionLabel="Повторить"
          actionHref="/admin/categories"
        />
      )}
    </AdminScreen>
  );
}
