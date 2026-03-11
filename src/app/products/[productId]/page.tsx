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
import type { StoreProduct } from '@/components/store/types';
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

function getAvailability(product: StoreProduct): {
  tone: 'default' | 'warn' | 'danger';
  title: string;
  description: string;
  canBuy: boolean;
} {
  switch (product.stockState) {
    case 'out_of_stock':
      return {
        tone: 'danger',
        title: 'Нет в наличии',
        description: 'Товар временно закончился. Сохраните его в избранное и вернитесь позже.',
        canBuy: false,
      };
    case 'low_stock':
      return {
        tone: 'warn',
        title: 'Осталось мало',
        description: 'Позицию ещё можно заказать, но запас уже небольшой.',
        canBuy: true,
      };
    case 'in_stock':
      return {
        tone: 'default',
        title: 'В наличии',
        description: 'Товар доступен для заказа прямо сейчас.',
        canBuy: true,
      };
    default:
      return {
        tone: 'default',
        title: 'Наличие уточняется',
        description: 'Цена и описание актуальны. Детали по наличию обновляются вместе с каталогом.',
        canBuy: true,
      };
  }
}

function buildDetailImageStyle(url: string | null | undefined, gradient: string) {
  if (url) {
    return {
      backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.14), rgba(12, 18, 31, 0.14)), url(${url})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }

  return {
    background: gradient,
  };
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
      title: 'Товар | MainStore',
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

  const favoriteIds = product ? await getFavoriteProductIdsForProfile(userContext.profile?.id ?? null) : [];
  const favoriteIdSet = new Set(favoriteIds);
  const isFavorited = product ? favoriteIdSet.has(product.id) : false;

  if (!product) {
    return (
      <StoreScreen title="Товар" subtitle="Детали позиции" back={true} showBottomNav={false}>
        {productData.message ? (
          <section
            className={classNames(
              styles.dataNotice,
              (productData.status === 'error' || productData.status === 'fallback_error') && styles.dataNoticeError,
            )}
          >
            <p className={styles.dataNoticeTitle}>Состояние карточки товара</p>
            <p className={styles.dataNoticeText}>{productData.message}</p>
          </section>
        ) : null}

        <StoreEmptyState
          title="Товар не найден"
          description="Позиция недоступна или уже скрыта. Вернитесь в каталог, чтобы продолжить выбор."
          actionLabel="Перейти в каталог"
          actionHref="/catalog"
        />
      </StoreScreen>
    );
  }

  const price = formatStorePrice(product.priceCents, product.currency);
  const compareAtPrice =
    product.compareAtPriceCents && product.compareAtPriceCents > product.priceCents
      ? formatStorePrice(product.compareAtPriceCents, product.currency)
      : null;
  const availability = getAvailability(product);
  const media =
    product.media && product.media.length > 0
      ? product.media
      : [
          {
            id: `${product.id}-fallback`,
            url: product.imageUrl ?? '',
            alt: product.imageAlt ?? product.title,
            isPrimary: true,
            sortOrder: 0,
          },
        ];
  const leadMedia = media[0];
  const descriptionBlocks = (product.description || '')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const collectionNames = (product.collections ?? []).map((collection) => collection.title).join(', ');

  return (
    <StoreScreen title="Товар" subtitle={product.title} back={true} showBottomNav={false}>
      {productData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            (productData.status === 'error' || productData.status === 'fallback_error') && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Состояние карточки товара</p>
          <p className={styles.dataNoticeText}>{productData.message}</p>
          {(productData.status === 'error' ||
            productData.status === 'fallback_error' ||
            productData.status === 'fallback_env') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href={`/products/${product.slug}`}
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку карточки товара"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      ) : null}

      <div className={styles.productPageBottomSpace}>
        <section className={styles.detailCard}>
          <div className={styles.detailImage} style={buildDetailImageStyle(leadMedia?.url, product.imageGradient)}>
            <span className={styles.productImageLabel}>{product.imageLabel}</span>
          </div>

          {media.length > 1 ? (
            <div className={styles.detailGalleryRow} aria-label="Галерея товара">
              {media.map((item) => (
                <div
                  key={item.id}
                  className={classNames(styles.detailGalleryCard, item.isPrimary && styles.detailGalleryCardActive)}
                  style={buildDetailImageStyle(item.url, product.imageGradient)}
                  aria-hidden="true"
                />
              ))}
            </div>
          ) : null}

          <div className={styles.detailMeta}>
            <div className={styles.detailHeading}>
              <h2 className={styles.detailTitle}>{product.title}</h2>
              {product.shortDescription ? <p className={styles.detailLead}>{product.shortDescription}</p> : null}
            </div>

            <div className={styles.detailPriceRow}>
              <p className={styles.detailPrice}>{price}</p>
              {compareAtPrice ? <p className={styles.detailPriceCompare}>{compareAtPrice}</p> : null}
            </div>

            {product.appliedDiscount ? (
              <p className={styles.detailDiscountNote}>
                {product.appliedDiscount.badgeText} по скидке {formatDiscountScope(product.appliedDiscount.scope)} «
                {product.appliedDiscount.title}».
              </p>
            ) : null}

            <section
              className={classNames(
                styles.detailAvailability,
                availability.tone === 'warn' && styles.detailAvailabilityWarn,
                availability.tone === 'danger' && styles.detailAvailabilityDanger,
              )}
            >
              <p className={styles.detailAvailabilityTitle}>{availability.title}</p>
              <p className={styles.detailAvailabilityText}>{availability.description}</p>
            </section>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Категория</p>
                <p className={styles.infoValueCompact}>{product.categoryTitle || 'Без категории'}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Подборки</p>
                <p className={styles.infoValueCompact}>{collectionNames || 'Пока не добавлен'}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Наличие</p>
                <p className={styles.infoValueCompact}>{availability.title}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Артикул</p>
                <p className={styles.infoValueCompact}>{product.slug}</p>
              </div>
            </div>

            <div className={styles.detailDescriptionStack}>
              {descriptionBlocks.length > 0 ? (
                descriptionBlocks.map((block, index) => (
                  <p key={`${product.id}-description-${index}`} className={styles.detailDescription}>
                    {block}
                  </p>
                ))
              ) : (
                <p className={styles.detailDescription}>Описание товара скоро появится.</p>
              )}
            </div>

            <div className={styles.detailActions}>
              <div className={styles.detailActionGrid}>
                <FavoriteToggleButton productId={product.id} initialFavorited={isFavorited} />
                <ProductShareButton productSlug={product.slug} productTitle={product.title} />
              </div>
              <Link href="/catalog" className={styles.secondaryInlineLink} aria-label="Вернуться в каталог">
                Вернуться в каталог
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Что важно перед покупкой</h2>
          <p className={styles.panelText}>
            Карточка открывается и по прямой ссылке, и внутри магазина в Telegram. Вы можете спокойно вернуться назад: товар останется в истории навигации.
          </p>
        </section>

        {productData.relatedProducts.length > 0 ? (
          <StoreSection title="Может подойти ещё">
            <div className={styles.scrollRow}>
              {productData.relatedProducts.map((item) => (
                <ProductCard key={item.id} product={item} href={`/products/${item.slug}`} compact />
              ))}
            </div>
          </StoreSection>
        ) : null}
      </div>

      <div className={styles.stickyBar}>
        <div className={styles.stickyBarInner}>
          <AddToCartButton
            productId={product.id}
            className={styles.stickyBarButton}
            disabled={!availability.canBuy}
            disabledLabel="Нет в наличии"
          />
        </div>
      </div>
    </StoreScreen>
  );
}
