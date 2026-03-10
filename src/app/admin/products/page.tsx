import Link from 'next/link';

import { AdminCategoriesManager } from '@/components/admin/AdminCategoriesManager';
import { AdminProductStatusControl } from '@/components/admin/AdminProductStatusControl';
import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminCategories, getAdminProducts } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminProductsPage() {
  const [productsResult, categoriesResult] = await Promise.all([
    getAdminProducts(),
    getAdminCategories(),
  ]);

  const combinedMessage = productsResult.message || categoriesResult.message;
  const hasError =
    productsResult.status === 'error' || categoriesResult.status === 'error';

  return (
    <AdminScreen title="Admin Products" subtitle="Catalog CRUD and moderation">
      {combinedMessage && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            hasError && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Products update</p>
          <p className={storeStyles.dataNoticeText}>{combinedMessage}</p>
        </section>
      )}

      <Link
        href="/admin/products/new"
        className={adminStyles.adminPrimaryLink}
        aria-label="Create product"
      >
        Create product
      </Link>

      {productsResult.products.length === 0 ? (
        <StoreEmptyState
          title="No products"
          description="Create your first product from admin panel."
        />
      ) : (
        <section className={storeStyles.section}>
          <h2 className={storeStyles.sectionTitle}>Product list</h2>
          <div className={adminStyles.adminCardList}>
            {productsResult.products.map((product) => (
              <article key={product.id} className={adminStyles.adminCard}>
                <div className={adminStyles.adminCardHead}>
                  <h3 className={adminStyles.adminCardTitle}>{product.title}</h3>
                  <span className={storeStyles.orderStatusBadge}>{product.status}</span>
                </div>
                <p className={adminStyles.adminCardSub}>
                  {product.slug}
                  {product.categoryTitle ? ` • ${product.categoryTitle}` : ''}
                </p>
                <div className={adminStyles.adminMetaGrid}>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Price</p>
                    <p className={adminStyles.adminMetaValue}>
                      {formatPrice(product.price, product.currency)}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Stock</p>
                    <p className={adminStyles.adminMetaValue}>{product.stockQuantity}</p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Featured</p>
                    <p className={adminStyles.adminMetaValue}>
                      {product.isFeatured ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className={adminStyles.adminMetaCell}>
                    <p className={adminStyles.adminMetaLabel}>Updated</p>
                    <p className={adminStyles.adminMetaValue}>
                      {new Date(product.updatedAt).toLocaleDateString('en-US')}
                    </p>
                  </div>
                </div>
                <AdminProductStatusControl
                  productId={product.id}
                  initialStatus={product.status}
                />
                <div className={adminStyles.adminActions}>
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className={adminStyles.adminActionLink}
                    aria-label={`Edit ${product.title}`}
                  >
                    Edit product
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {categoriesResult.status === 'ok' && (
        <AdminCategoriesManager categories={categoriesResult.categories} />
      )}
    </AdminScreen>
  );
}
