import Link from 'next/link';
import type { Metadata } from 'next';

import { AddToCartButton } from '@/components/store/AddToCartButton';
import { FavoriteToggleButton } from '@/components/store/FavoriteToggleButton';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductShareButton } from '@/components/store/ProductShareButton';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getProductStorefrontData } from '@/features/storefront/data';
import { getFavoriteProductIdsForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

function formatDiscountScope(scope: string): string {
  switch (scope) {
    case 'product':
      return 'товара';
    case 'category':
      return 'категории';
    case 'collection':
      return 'подборки';
    default:
      return scope;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const productData = await getProductStorefrontData(productId);
  const product = productData.product;

  if (!product) {
    return {
      title: 'Product | MainStore',
      description: 'Посмотрите детали товара в каталоге MainStore.',
    };
  }

  return {
    title: `${product.title} | MainStore`,
    description: (product.shortDescription || product.description).slice(0, 160),
    alternates: {
      canonical: `/products/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [productData, userContext] = await Promise.all([
    getProductStorefrontData(productId),
    getCurrentUserContext(),
  ]);
  const product = productData.product;

  const favoriteIds = product
    ? await getFavoriteProductIdsForProfile(userContext.profile?.id ?? null)
    : [];
  const favoriteIdSet = new Set(favoriteIds);
  const isFavorited = product ? favoriteIdSet.has(product.id) : false;

  const price = product ? formatStorePrice(product.priceCents, product.currency) : '';
  const compareAtPrice =
    product?.compareAtPriceCents && product.compareAtPriceCents > product.priceCents
      ? formatStorePrice(product.compareAtPriceCents, product.currency)
      : null;

  const detailImageStyle = product?.imageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.18), rgba(12, 18, 31, 0.18)), url(${product.imageUrl})`,
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }
    : {
        background:
          product?.imageGradient ||
          'linear-gradient(135deg, #9fb8ff 0%, #5f7de8 100%)',
      };

  return (
    <StoreScreen
      title="Товар"
      subtitle={product ? product.title : 'Детали товара'}
      back={true}
      showBottomNav={false}
    >
      {productData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            (productData.status === 'error' ||
              productData.status === 'fallback_error') &&
              styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление товара</p>
          <p className={styles.dataNoticeText}>{productData.message}</p>
          {(productData.status === 'error' ||
            productData.status === 'fallback_error' ||
            productData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href={product ? `/products/${product.slug}` : `/products/${productId}`}
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку товара"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {!product ? (
        <StoreEmptyState
          title="Товар не найден"
          description="Товар не найден или сейчас неактивен. Откройте каталог, чтобы продолжить."
          actionLabel="Перейти в каталог"
          actionHref="/catalog"
        />
      ) : (
        <>
          <div className={styles.productPageBottomSpace}>
            <section className={styles.detailCard}>
              <div className={styles.detailImage} style={detailImageStyle}>
                <span className={styles.productImageLabel}>{product.imageLabel}</span>
              </div>
              <div className={styles.detailMeta}>
                <h2 className={styles.detailTitle}>{product.title}</h2>
                <div className={styles.detailPriceRow}>
                  <p className={styles.detailPrice}>{price}</p>
                  {compareAtPrice && (
                    <p className={styles.detailPriceCompare}>{compareAtPrice}</p>
                  )}
                </div>
                {product.appliedDiscount && (
                  <p className={styles.detailDiscountNote}>
                    {product.appliedDiscount.badgeText} по скидке {formatDiscountScope(product.appliedDiscount.scope)} «{product.appliedDiscount.title}».
                  </p>
                )}
                <p className={styles.detailDescription}>{product.description}</p>
                <div className={styles.detailActions}>
                  <div className={styles.detailActionGrid}>
                    <FavoriteToggleButton
                      productId={product.id}
                      initialFavorited={isFavorited}
                    />
                    <ProductShareButton
                      productSlug={product.slug}
                      productTitle={product.title}
                    />
                  </div>
                  <Link
                    href="/catalog"
                    className={styles.secondaryInlineLink}
                    aria-label="Вернуться в каталог"
                  >
                    Вернуться в каталог
                  </Link>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Поделиться и открыть позже</h2>
              <p className={styles.panelText}>
                Ссылка на товар работает как прямой путь и открывается и в Telegram, и в браузере.
              </p>
            </section>

            {productData.relatedProducts.length > 0 && (
              <StoreSection title="Может пригодиться">
                <div className={styles.scrollRow}>
                  {productData.relatedProducts.map((item) => (
                    <ProductCard
                      key={item.id}
                      product={item}
                      href={`/products/${item.slug}`}
                      compact
                    />
                  ))}
                </div>
              </StoreSection>
            )}
          </div>

          <div className={styles.stickyBar}>
            <div className={styles.stickyBarInner}>
              <AddToCartButton
                productId={product.id}
                className={styles.stickyBarButton}
              />
            </div>
          </div>
        </>
      )}
    </StoreScreen>
  );
}
