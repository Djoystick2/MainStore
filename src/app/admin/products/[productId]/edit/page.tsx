import Link from 'next/link';

import { AdminProductDangerZone } from '@/components/admin/AdminProductDangerZone';
import { AdminProductDuplicateButton } from '@/components/admin/AdminProductDuplicateButton';
import { AdminProductFeatureToggle } from '@/components/admin/AdminProductFeatureToggle';
import { AdminProductCollectionsManager } from '@/components/admin/AdminProductCollectionsManager';
import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { AdminProductImagesManager } from '@/components/admin/AdminProductImagesManager';
import { AdminProductOverviewCard } from '@/components/admin/AdminProductOverviewCard';
import { AdminProductStatusControl } from '@/components/admin/AdminProductStatusControl';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminProductDetail } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const detailResult = await getAdminProductDetail(productId);

  return (
    <AdminScreen title="Карточка товара" subtitle="Контент, публикация и операционные действия" back={true}>
      {detailResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            detailResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Обновление карточки товара</p>
          <p className={storeStyles.dataNoticeText}>{detailResult.message}</p>
          {(detailResult.status === 'error' || detailResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href={`/admin/products/${productId}/edit`}
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку карточки товара"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      <div className={adminStyles.adminActionBar}>
        <Link href="/admin/products" className={adminStyles.adminActionLink}>
          К товарам
        </Link>
        {detailResult.product && (
          <AdminProductDuplicateButton productId={detailResult.product.id} label="Дублировать" />
        )}
      </div>

      {!detailResult.product ? (
        <StoreEmptyState
          title="Товар не найден"
          description="Запрошенный товар не существует."
          actionLabel="К товарам"
          actionHref="/admin/products"
        />
      ) : (
        <div className={adminStyles.adminSectionStack}>
          <AdminProductOverviewCard product={detailResult.product} />

          <section className={adminStyles.adminCard}>
            <h2 className={adminStyles.adminCardTitle}>Быстрые действия</h2>
            <p className={adminStyles.adminCardSub}>
              Меняйте публикацию и продвижение без перехода в полную форму.
            </p>
            <div className={adminStyles.adminStackActions}>
              <AdminProductStatusControl
                productId={detailResult.product.id}
                initialStatus={detailResult.product.status}
              />
              <AdminProductFeatureToggle
                productId={detailResult.product.id}
                initialIsFeatured={detailResult.product.isFeatured}
              />
            </div>
          </section>

          <AdminProductForm
            mode="edit"
            product={detailResult.product}
            categories={detailResult.categories}
          />

          <AdminProductCollectionsManager
            productId={detailResult.product.id}
            collections={detailResult.collections}
            assignments={detailResult.product.collectionAssignments}
          />

          <AdminProductImagesManager
            productId={detailResult.product.id}
            images={detailResult.product.images}
          />

          <AdminProductDangerZone product={detailResult.product} />
        </div>
      )}
    </AdminScreen>
  );
}
