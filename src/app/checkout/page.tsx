import Link from 'next/link';

import { CheckoutForm } from '@/components/store/CheckoutForm';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getCartDataForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

export default async function CheckoutPage() {
  const { profile } = await getCurrentUserContext();
  const cartData = await getCartDataForProfile(profile?.id ?? null);

  const isUnauthorized = cartData.status === 'unauthorized';
  const isEmpty = cartData.status === 'ok' && cartData.items.length === 0;
  const isCheckoutUnavailable =
    (cartData.status === 'not_configured' || cartData.status === 'error') &&
    cartData.items.length === 0;
  const currency = cartData.items[0]?.product.currency ?? 'USD';

  return (
    <StoreScreen title="Checkout" subtitle="Shipping details and order review" back={true}>
      {cartData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            cartData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Checkout update</p>
          <p className={styles.dataNoticeText}>{cartData.message}</p>
          {(cartData.status === 'error' || cartData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/checkout"
                className={styles.dataNoticeRetry}
                aria-label="Retry loading checkout"
              >
                Retry
              </Link>
            </div>
          )}
        </section>
      )}

      {isUnauthorized ? (
        <StoreEmptyState
          title="Checkout needs Telegram session"
          description="Open MainStore in Telegram to place orders."
          actionLabel="Open catalog"
          actionHref="/catalog"
        />
      ) : null}

      {isEmpty ? (
        <StoreEmptyState
          title="Cart is empty"
          description="Add products to cart before checkout."
          actionLabel="Go to catalog"
          actionHref="/catalog"
        />
      ) : null}

      {isCheckoutUnavailable ? (
        <StoreEmptyState
          title="Checkout is temporarily unavailable"
          description="Review your cart and try again in a moment."
          actionLabel="Back to cart"
          actionHref="/cart"
        />
      ) : null}

      {cartData.items.length > 0 && (
        <>
          <StoreSection title="Order summary">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Items</p>
                <p className={styles.infoValue}>{cartData.itemCount}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Subtotal</p>
                <p className={styles.infoValue}>
                  {formatStorePrice(cartData.subtotalCents, currency)}
                </p>
              </div>
            </div>
          </StoreSection>

          <section className={styles.panel}>
            <p className={styles.panelText}>
              Price and availability are confirmed on the server when you place the order.
            </p>
          </section>

          <StoreSection title="Shipping information">
            <CheckoutForm
              initialFullName={profile?.displayName}
              subtotalCents={cartData.subtotalCents}
              currency={currency}
            />
          </StoreSection>

          <Link
            href="/cart"
            className={styles.secondaryInlineLink}
            aria-label="Back to cart"
          >
            Back to cart
          </Link>
        </>
      )}
    </StoreScreen>
  );
}
