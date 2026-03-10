'use client';

import { useMemo, useRef, useState, useTransition, type FormEventHandler } from 'react';
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

interface PaymentStartSuccess {
  orderId: string;
  paymentAttemptId: string;
  checkoutUrl: string | null;
  totalCents: number;
  currency: string;
}

function mapCheckoutError(error: string): string {
  switch (error) {
    case 'unauthorized':
      return 'Откройте MainStore в Telegram, чтобы перейти к оплате.';
    case 'invalid_input':
      return 'Заполните обязательные поля доставки.';
    case 'empty_cart':
      return 'Корзина пуста. Добавьте товары и попробуйте снова.';
    case 'unavailable_items':
      return 'Часть товаров больше недоступна. Проверьте корзину.';
    case 'mixed_currency':
      return 'В одном заказе поддерживается только одна валюта.';
    case 'not_configured':
      return 'Платёжный слой временно недоступен.';
    case 'payment_provider_not_supported':
      return 'Выбранный платёжный провайдер пока не подключён.';
    default:
      return 'Не удалось запустить оплату. Попробуйте ещё раз.';
  }
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
  const [startedPayment, setStartedPayment] = useState<PaymentStartSuccess | null>(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const paymentSummaryLabel = useMemo(
    () => formatStorePrice(totalCents, currency),
    [currency, totalCents],
  );

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);

      try {
        const response = await fetch('/api/store/checkout/start-payment', {
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
            idempotencyKey: idempotencyKeyRef.current,
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              ok: true;
              orderId: string;
              paymentAttemptId: string;
              checkoutUrl?: string | null;
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

        const nextState = {
          orderId: payload.orderId,
          paymentAttemptId: payload.paymentAttemptId,
          checkoutUrl: payload.checkoutUrl ?? null,
          totalCents: payload.totalCents,
          currency: payload.currency,
        };

        setStartedPayment(nextState);

        if (payload.checkoutUrl) {
          window.location.assign(payload.checkoutUrl);
          return;
        }
      } catch {
        setErrorMessage('Сетевая ошибка при запуске оплаты.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  if (startedPayment) {
    return (
      <section className={styles.checkoutSuccess}>
        <h2 className={styles.checkoutSuccessTitle}>Заказ готов к оплате</h2>
        <p className={styles.checkoutSuccessText}>
          Сумма к оплате: {formatStorePrice(startedPayment.totalCents, startedPayment.currency)}
        </p>
        <p className={styles.checkoutHint}>
          Заказ #{startedPayment.orderId.slice(0, 8).toUpperCase()} создан. Если автоматический
          переход не сработал, откройте платёжный шаг вручную.
        </p>
        {startedPayment.checkoutUrl && (
          <Link href={startedPayment.checkoutUrl} className={styles.primaryLinkButton}>
            Перейти к оплате
          </Link>
        )}
        <Link href={`/orders/${startedPayment.orderId}`} className={styles.secondaryInlineLink}>
          Открыть заказ
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
        <p className={styles.checkoutHint}>До скидок: {formatStorePrice(subtotalCents, currency)}</p>
        {discountCents > 0 && (
          <p className={styles.checkoutHint}>Скидка: {formatStorePrice(discountCents, currency)}</p>
        )}
        <p className={styles.checkoutHint}>К оплате: {paymentSummaryLabel}</p>
      </div>

      <p className={styles.checkoutHint}>
        После подтверждения будет создан заказ и открыта платёжная сессия. Финальная оплата
        подтверждается на сервере, а статус заказа обновляется отдельно от витрины и корзины.
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
        aria-label="Перейти к оплате"
      >
        {isPending ? 'Запускаем оплату...' : 'Перейти к оплате'}
      </button>
    </form>
  );
}
