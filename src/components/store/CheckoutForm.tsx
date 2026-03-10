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
  discountCents: number;
  totalCents: number;
  currency: string;
}

interface PlaceOrderSuccess {
  orderId: string;
  totalCents: number;
  currency: string;
}

function mapCheckoutError(error: string): string {
  if (error === 'unauthorized') {
    return 'Откройте MainStore в Telegram, чтобы оформить заказ.';
  }
  if (error === 'invalid_input') {
    return 'Заполните обязательные поля доставки.';
  }
  if (error === 'empty_cart') {
    return 'Корзина пуста. Добавьте товары и попробуйте снова.';
  }
  if (error === 'unavailable_items') {
    return 'Часть товаров больше недоступна. Проверьте корзину.';
  }
  if (error === 'mixed_currency') {
    return 'В одном заказе поддерживается только одна валюта.';
  }
  if (error === 'not_configured') {
    return 'Оформление временно недоступно.';
  }
  return 'Не удалось оформить заказ. Попробуйте еще раз.';
}

export function CheckoutForm({
  initialFullName,
  initialPhone,
  subtotalCents,
  discountCents,
  totalCents,
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

        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              orderId: string;
              totalCents: number;
              currency: string;
            }
          | {
              ok: false;
              error?: string;
            }
          | null;

        if (!response.ok || !payload || !payload.ok) {
          const code = payload && !payload.ok ? payload.error ?? 'unknown' : 'unknown';
          setErrorMessage(mapCheckoutError(code));
          return;
        }

        setSuccess({
          orderId: payload.orderId,
          totalCents: payload.totalCents,
          currency: payload.currency,
        });
      } catch {
        setErrorMessage('Сетевая ошибка при оформлении заказа.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  if (success) {
    return (
      <section className={styles.checkoutSuccess}>
        <h2 className={styles.checkoutSuccessTitle}>Заказ оформлен</h2>
        <p className={styles.checkoutSuccessText}>
          Итого: {formatStorePrice(success.totalCents, success.currency)}
        </p>
        <p className={styles.checkoutHint}>
          Номер заказа: #{success.orderId.slice(0, 8).toUpperCase()}
        </p>
        <Link
          href={`/orders/${success.orderId}`}
          className={styles.primaryLinkButton}
          aria-label="Открыть созданный заказ"
        >
          Открыть заказ
        </Link>
        <Link
          href="/catalog"
          className={styles.secondaryInlineLink}
          aria-label="Продолжить покупки"
        >
          Продолжить покупки
        </Link>
      </section>
    );
  }

  return (
    <form className={styles.checkoutForm} onSubmit={handleSubmit}>
      <div className={styles.checkoutFields}>
        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Имя и фамилия</span>
          <input
            className={styles.checkoutInput}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Телефон</span>
          <input
            className={styles.checkoutInput}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            required
          />
        </label>

        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Город</span>
          <input
            className={styles.checkoutInput}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            autoComplete="address-level2"
            required
          />
        </label>

        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Адрес</span>
          <input
            className={styles.checkoutInput}
            value={addressLine}
            onChange={(event) => setAddressLine(event.target.value)}
            autoComplete="street-address"
            required
          />
        </label>

        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Индекс</span>
          <input
            className={styles.checkoutInput}
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            autoComplete="postal-code"
          />
        </label>

        <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Комментарий</span>
          <textarea
            className={styles.checkoutTextarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
          />
        </label>
      </div>

      <div className={styles.checkoutTotals}>
        <p className={styles.checkoutHint}>
          До скидок: {formatStorePrice(subtotalCents, currency)}
        </p>
        {discountCents > 0 && (
          <p className={styles.checkoutHint}>
            Скидка: {formatStorePrice(discountCents, currency)}
          </p>
        )}
        <p className={styles.checkoutHint}>
          К оплате: {formatStorePrice(totalCents, currency)}
        </p>
      </div>

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
        aria-label="Оформить заказ"
      >
        {isPending ? 'Оформляем...' : 'Оформить заказ'}
      </button>
    </form>
  );
}
