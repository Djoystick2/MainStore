import Link from 'next/link';

import { AdminProductForm } from '@/components/admin/AdminProductForm';
import { AdminProductImagesManager } from '@/components/admin/AdminProductImagesManager';
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
    <AdminScreen title="Edit Product" subtitle="Update fields and images" back={true}>
      {detailResult.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            detailResult.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Product details update</p>
          <p className={storeStyles.dataNoticeText}>{detailResult.message}</p>
          {(detailResult.status === 'error' || detailResult.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href={`/admin/products/${productId}/edit`}
                className={storeStyles.dataNoticeRetry}
                aria-label="Retry loading product details"
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

      {!detailResult.product ? (
        <StoreEmptyState
          title="Product not found"
          description="Requested product does not exist."
          actionLabel="Back to products"
          actionHref="/admin/products"
        />
      ) : (
        <>
          <AdminProductForm
            mode="edit"
            product={detailResult.product}
            categories={detailResult.categories}
          />
          <AdminProductImagesManager
            productId={detailResult.product.id}
            images={detailResult.product.images}
          />
        </>
      )}
    </AdminScreen>
  );
}
