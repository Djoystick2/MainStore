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

  return (
    <StoreScreen title="Cart" subtitle="Review items before checkout">
      {cartData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            cartData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Cart update</p>
          <p className={styles.dataNoticeText}>{cartData.message}</p>
          {(cartData.status === 'error' || cartData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link href="/cart" className={styles.dataNoticeRetry} aria-label="Retry loading cart">
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      <StoreSection title="Summary">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Items</p>
            <p className={styles.infoValue}>{cartData.itemCount}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Subtotal</p>
            <p className={styles.infoValue}>{subtotalLabel}</p>
          </div>
        </div>
      </StoreSection>

      {cartData.items.length > 0 && (
        <Link
          href="/checkout"
          className={styles.primaryLinkButton}
          aria-label="Proceed to checkout"
        >
          Proceed to checkout
        </Link>
      )}

      {isSessionMissing ? (
        <StoreEmptyState
          title="Cart needs Telegram session"
          description="Open MainStore in Telegram to load your personal cart."
          actionLabel="Browse catalog"
          actionHref="/catalog"
        />
      ) : null}

      {isEmpty ? (
        <StoreEmptyState
          title="Your cart is empty"
          description="Add products from catalog and they will appear here."
          actionLabel="Go to catalog"
          actionHref="/catalog"
        />
      ) : null}

      {cartData.items.length > 0 && (
        <StoreSection title="Items in cart">
          <div className={styles.cartList}>
            {cartData.items.map((item) => (
              <article key={item.id} className={styles.cartItem}>
                <Link
                  href={`/products/${item.product.slug}`}
                  className={styles.cartItemPreview}
                  aria-label={`Open ${item.product.title}`}
                >
                  <div
                    className={styles.cartItemImage}
                    style={buildImageStyle(item.product.imageUrl, item.product.imageGradient)}
                  >
                    <span className={styles.productImageLabel}>{item.product.imageLabel}</span>
                  </div>
                  <div className={styles.cartItemMeta}>
                    <p className={styles.cartItemTitle}>{item.product.title}</p>
                    <p className={styles.cartItemPrice}>
                      {formatStorePrice(item.product.priceCents, item.product.currency)}
                    </p>
                    <p className={styles.cartItemLineTotal}>
                      Line total: {formatStorePrice(item.lineTotalCents, item.product.currency)}
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
        <h2 className={styles.panelTitle}>Checkout without payment integration</h2>
        <p className={styles.panelText}>
          Payment providers are intentionally not connected at this stage.
        </p>
      </section>
    </StoreScreen>
  );
}
