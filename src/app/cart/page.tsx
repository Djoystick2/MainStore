import Link from 'next/link';

import { CartItemControls } from '@/components/store/CartItemControls';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getCartDataForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

function buildImageStyle(imageUrl: string | null | undefined, gradient: string) {
  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.14), rgba(12, 18, 31, 0.14)), url(${imageUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }

  return { background: gradient };
}

export default async function CartPage() {
  const { profile } = await getCurrentUserContext();
  const cartData = await getCartDataForProfile(profile?.id ?? null);
  const isSessionMissing = cartData.status === 'unauthorized';
  const isEmpty = cartData.status === 'ok' && cartData.items.length === 0;
  const subtotalLabel = cartData.items[0]
    ? formatStorePrice(cartData.subtotalCents, cartData.items[0].product.currency)
    : '$0';
  const baseSubtotalLabel = cartData.items[0]
    ? formatStorePrice(cartData.baseSubtotalCents, cartData.items[0].product.currency)
    : '$0';
  const discountLabel = cartData.items[0]
    ? formatStorePrice(cartData.discountTotalCents, cartData.items[0].product.currency)
    : '$0';

  return (
    <StoreScreen title="Корзина" subtitle="Проверьте товары перед оформлением">
      {cartData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            cartData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление корзины</p>
          <p className={styles.dataNoticeText}>{cartData.message}</p>
          {(cartData.status === 'error' || cartData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link href="/cart" className={styles.dataNoticeRetry} aria-label="Повторить загрузку корзины">
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      <StoreSection title="Сводка">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Товаров</p>
            <p className={styles.infoValue}>{cartData.itemCount}</p>
          </div>
          {cartData.discountTotalCents > 0 && (
            <div className={styles.infoItem}>
              <p className={styles.infoLabel}>До скидок</p>
              <p className={styles.infoValue}>{baseSubtotalLabel}</p>
            </div>
          )}
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Итого</p>
            <p className={styles.infoValue}>{subtotalLabel}</p>
          </div>
          {cartData.discountTotalCents > 0 && (
            <div className={styles.infoItem}>
              <p className={styles.infoLabel}>Экономия</p>
              <p className={styles.infoValue}>{discountLabel}</p>
            </div>
          )}
        </div>
      </StoreSection>

      {cartData.items.length > 0 && (
        <Link
          href="/checkout"
          className={styles.primaryLinkButton}
          aria-label="Перейти к оформлению"
        >
          К оформлению
        </Link>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы загрузить личную корзину."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : null}

      {isEmpty ? (
        <StoreEmptyState
          title="Корзина пуста"
          description="Добавьте товары из каталога, и они появятся здесь."
          actionLabel="Перейти в каталог"
          actionHref="/catalog"
        />
      ) : null}

      {cartData.items.length > 0 && (
        <StoreSection title="Товары в корзине">
          <div className={styles.cartList}>
            {cartData.items.map((item) => (
              <article key={item.id} className={styles.cartItem}>
                <Link
                  href={`/products/${item.product.slug}`}
                  className={styles.cartItemPreview}
                  aria-label={`Открыть товар ${item.product.title}`}
                >
                  <div
                    className={styles.cartItemImage}
                    style={buildImageStyle(item.product.imageUrl, item.product.imageGradient)}
                  >
                    <span className={styles.productImageLabel}>{item.product.imageLabel}</span>
                  </div>
                  <div className={styles.cartItemMeta}>
                    <p className={styles.cartItemTitle}>{item.product.title}</p>
                    <div className={styles.cartItemPriceRow}>
                      <p className={styles.cartItemPrice}>
                        {formatStorePrice(item.product.priceCents, item.product.currency)}
                      </p>
                      {item.product.compareAtPriceCents &&
                        item.product.compareAtPriceCents > item.product.priceCents && (
                          <p className={styles.cartItemPriceCompare}>
                            {formatStorePrice(item.product.compareAtPriceCents, item.product.currency)}
                          </p>
                        )}
                    </div>
                    {item.product.appliedDiscount && (
                      <p className={styles.cartItemDiscount}>
                        {item.product.appliedDiscount.badgeText}
                      </p>
                    )}
                    <p className={styles.cartItemLineTotal}>
                      Сумма: {formatStorePrice(item.lineTotalCents, item.product.currency)}
                    </p>
                  </div>
                </Link>

                <CartItemControls itemId={item.id} quantity={item.quantity} />
              </article>
            ))}
          </div>
        </StoreSection>
      )}

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Оплата пока не подключена</h2>
        <p className={styles.panelText}>
          На этом этапе платежные провайдеры намеренно не подключены.
        </p>
      </section>
    </StoreScreen>
  );
}
