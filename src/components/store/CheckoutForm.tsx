'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import Link from 'next/link';

import { classNames } from '@/css/classnames';

import { formatStorePrice } from './formatPrice';
import styles from './store.module.css';

interface CheckoutFormProps {
  initialFullName?: string | null;
  initialPhone?: string | null;
  subtotalCents: number;
  currency: string;
}

interface PlaceOrderSuccess {
  orderId: string;
  totalCents: number;
  currency: string;
}

function mapCheckoutError(error: string): string {
  if (error === 'unauthorized') {
    return 'Open MainStore in Telegram to place an order.';
  }
  if (error === 'invalid_input') {
    return 'Please fill all required shipping fields.';
  }
  if (error === 'empty_cart') {
    return 'Your cart is empty. Add products and try again.';
  }
  if (error === 'unavailable_items') {
    return 'Some products in cart are no longer available. Review your cart.';
  }
  if (error === 'mixed_currency') {
    return 'Checkout supports only one currency per order.';
  }
  if (error === 'not_configured') {
    return 'Checkout backend is not configured yet.';
  }
  return 'Could not create order. Please try again.';
}

export function CheckoutForm({
  initialFullName,
  initialPhone,
  subtotalCents,
  currency,
}: CheckoutFormProps) {
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initialFullName ?? '');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<PlaceOrderSuccess | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (isPending || isSubmittingRef.current || success) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch('/api/store/checkout/place-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            fullName,
            phone,
            city,
            addressLine,
            postalCode,
            notes,
          }),
        });

        const payload = (await response.json()) as
          | {
              ok: true;
              orderId: string;
              totalCents: number;
              currency: string;
            }
          | {
              ok: false;
              error?: string;
            };

        if (!response.ok || !payload.ok) {
          const code = payload.ok ? 'unknown' : payload.error ?? 'unknown';
          setErrorMessage(mapCheckoutError(code));
          return;
        }

        setSuccess({
          orderId: payload.orderId,
          totalCents: payload.totalCents,
          currency: payload.currency,
        });
      } catch {
        setErrorMessage('Network error during checkout. Please try again.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  if (success) {
    return (
      <section className={styles.checkoutSuccess}>
        <h2 className={styles.checkoutSuccessTitle}>Order created</h2>
        <p className={styles.checkoutSuccessText}>
          Total: {formatStorePrice(success.totalCents, success.currency)}
        </p>
        <p className={styles.checkoutHint}>
          Order ID: #{success.orderId.slice(0, 8).toUpperCase()}
        </p>
        <Link
          href={`/orders/${success.orderId}`}
          className={styles.primaryLinkButton}
          aria-label="Open created order"
        >
          Open order
        </Link>
        <Link
          href="/catalog"
          className={styles.secondaryInlineLink}
          aria-label="Continue shopping"
        >
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <form className={styles.checkoutForm} onSubmit={handleSubmit}>
      <div className={styles.checkoutFields}>
        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Full name</span>
          <input
            className={styles.checkoutInput}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Phone</span>
          <input
            className={styles.checkoutInput}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            required
          />
        </label>

        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>City</span>
          <input
            className={styles.checkoutInput}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            autoComplete="address-level2"
            required
          />
        </label>

        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Address line</span>
          <input
            className={styles.checkoutInput}
            value={addressLine}
            onChange={(event) => setAddressLine(event.target.value)}
            autoComplete="street-address"
            required
          />
        </label>

        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Postal code</span>
          <input
            className={styles.checkoutInput}
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            autoComplete="postal-code"
          />
        </label>

        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Comment (optional)</span>
          <textarea
            className={styles.checkoutTextarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </label>
      </div>

      <p className={styles.checkoutHint}>
        Place order total: {formatStorePrice(subtotalCents, currency)}
      </p>

      {errorMessage && (
        <p
          className={classNames(styles.inlineActionMessage, styles.inlineActionMessageError)}
          role="status"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className={styles.primaryButton}
        disabled={isPending}
        aria-label="Place order"
      >
        {isPending ? 'Placing order...' : 'Place order'}
      </button>
    </form>
  );
}
