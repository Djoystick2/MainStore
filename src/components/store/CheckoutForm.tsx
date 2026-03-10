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

interface CheckoutFieldErrors {
  fullName?: string;
  phone?: string;
  city?: string;
  addressLine?: string;
  postalCode?: string;
}

function mapCheckoutError(error: string): string {
  switch (error) {
    case 'unauthorized':
      return 'Откройте MainStore в Telegram, чтобы перейти к оплате.';
    case 'full_name_required':
      return 'Укажите имя получателя.';
    case 'full_name_too_short':
      return 'Имя получателя слишком короткое.';
    case 'phone_required':
      return 'Укажите телефон для связи.';
    case 'phone_invalid':
      return 'Проверьте номер телефона.';
    case 'city_required':
      return 'Укажите город доставки.';
    case 'city_too_short':
      return 'Название города выглядит слишком коротким.';
    case 'address_required':
      return 'Укажите адрес доставки.';
    case 'address_too_short':
      return 'Добавьте более точный адрес доставки.';
    case 'postal_code_invalid':
      return 'Проверьте индекс.';
    case 'invalid_input':
      return 'Проверьте обязательные поля доставки.';
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

function validateFields(input: {
  fullName: string;
  phone: string;
  city: string;
  addressLine: string;
  postalCode: string;
}): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();
  const city = input.city.trim();
  const addressLine = input.addressLine.trim();
  const postalCode = input.postalCode.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (!fullName) {
    errors.fullName = 'Укажите имя и фамилию получателя.';
  } else if (fullName.length < 2) {
    errors.fullName = 'Имя слишком короткое.';
  }

  if (!phone) {
    errors.phone = 'Укажите телефон для связи.';
  } else if (phoneDigits.length < 6) {
    errors.phone = 'Проверьте номер телефона.';
  }

  if (!city) {
    errors.city = 'Укажите город доставки.';
  } else if (city.length < 2) {
    errors.city = 'Название города слишком короткое.';
  }

  if (!addressLine) {
    errors.addressLine = 'Укажите адрес доставки.';
  } else if (addressLine.length < 6) {
    errors.addressLine = 'Добавьте дом, улицу и другие детали адреса.';
  }

  if (postalCode && postalCode.length < 3) {
    errors.postalCode = 'Проверьте индекс.';
  }

  return errors;
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
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [startedPayment, setStartedPayment] = useState<PaymentStartSuccess | null>(null);
  const isSubmittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const paymentSummaryLabel = useMemo(
    () => formatStorePrice(totalCents, currency),
    [currency, totalCents],
  );

  const clearFieldError = (field: keyof CheckoutFieldErrors) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (isPending || isSubmittingRef.current) {
      return;
    }

    const nextFieldErrors = validateFields({
      fullName,
      phone,
      city,
      addressLine,
      postalCode,
    });

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setErrorMessage('Проверьте поля формы и попробуйте ещё раз.');
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
        <h2 className={styles.checkoutSuccessTitle}>Заказ создан</h2>
        <p className={styles.checkoutSuccessText}>
          Сумма к оплате: {formatStorePrice(startedPayment.totalCents, startedPayment.currency)}
        </p>
        <div className={styles.checkoutSummaryCard}>
          <div className={styles.checkoutSummaryRow}>
            <span>Заказ</span>
            <span>#{startedPayment.orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className={styles.checkoutSummaryRow}>
            <span>Платёжная попытка</span>
            <span>#{startedPayment.paymentAttemptId.slice(0, 8).toUpperCase()}</span>
          </div>
        </div>
        <p className={styles.checkoutHint}>
          Если автоматический переход не сработал, откройте следующий шаг вручную или проверьте статус
          заказа позже.
        </p>
        <div className={styles.checkoutActionsRow}>
          {startedPayment.checkoutUrl ? (
            <Link href={startedPayment.checkoutUrl} className={styles.primaryLinkButton}>
              Перейти к оплате
            </Link>
          ) : null}
          <Link href={`/orders/${startedPayment.orderId}`} className={styles.secondaryButton}>
            Открыть заказ
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form className={styles.checkoutForm} onSubmit={handleSubmit}>
      <section className={styles.checkoutSection}>
        <h3 className={styles.checkoutSectionTitle}>Получатель</h3>
        <div className={styles.checkoutFields}>
          <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Имя и фамилия</span>
            <input
              className={classNames(styles.checkoutInput, fieldErrors.fullName && styles.checkoutInputError)}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearFieldError('fullName');
              }}
              autoComplete="name"
              placeholder="Как к вам обращаться"
              maxLength={120}
              required
            />
            {fieldErrors.fullName ? <span className={styles.checkoutFieldError}>{fieldErrors.fullName}</span> : null}
          </label>

          <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Телефон</span>
            <input
              className={classNames(styles.checkoutInput, fieldErrors.phone && styles.checkoutInputError)}
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                clearFieldError('phone');
              }}
              autoComplete="tel"
              inputMode="tel"
              placeholder="+7 999 123-45-67"
              maxLength={40}
              required
            />
            {fieldErrors.phone ? <span className={styles.checkoutFieldError}>{fieldErrors.phone}</span> : null}
          </label>
        </div>
      </section>

      <section className={styles.checkoutSection}>
        <h3 className={styles.checkoutSectionTitle}>Доставка</h3>
        <div className={styles.checkoutFields}>
          <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Город</span>
            <input
              className={classNames(styles.checkoutInput, fieldErrors.city && styles.checkoutInputError)}
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                clearFieldError('city');
              }}
              autoComplete="address-level2"
              placeholder="Москва"
              maxLength={120}
              required
            />
            {fieldErrors.city ? <span className={styles.checkoutFieldError}>{fieldErrors.city}</span> : null}
          </label>

          <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Адрес</span>
            <input
              className={classNames(styles.checkoutInput, fieldErrors.addressLine && styles.checkoutInputError)}
              value={addressLine}
              onChange={(event) => {
                setAddressLine(event.target.value);
                clearFieldError('addressLine');
              }}
              autoComplete="street-address"
              placeholder="Улица, дом, квартира, подъезд"
              maxLength={240}
              required
            />
            {fieldErrors.addressLine ? (
              <span className={styles.checkoutFieldError}>{fieldErrors.addressLine}</span>
            ) : (
              <span className={styles.checkoutFieldHint}>Добавьте детали, чтобы доставка была без уточнений.</span>
            )}
          </label>

          <label className={styles.checkoutField}>
            <span className={styles.checkoutLabel}>Индекс</span>
            <input
              className={classNames(styles.checkoutInput, fieldErrors.postalCode && styles.checkoutInputError)}
              value={postalCode}
              onChange={(event) => {
                setPostalCode(event.target.value);
                clearFieldError('postalCode');
              }}
              autoComplete="postal-code"
              inputMode="numeric"
              placeholder="Необязательно"
              maxLength={40}
            />
            {fieldErrors.postalCode ? (
              <span className={styles.checkoutFieldError}>{fieldErrors.postalCode}</span>
            ) : (
              <span className={styles.checkoutFieldHint}>Можно оставить пустым, если индекс не нужен.</span>
            )}
          </label>
        </div>
      </section>

      <section className={styles.checkoutSection}>
        <h3 className={styles.checkoutSectionTitle}>Комментарий к заказу</h3>
        <label className={styles.checkoutField}>
          <span className={styles.checkoutLabel}>Пожелания</span>
          <textarea
            className={styles.checkoutTextarea}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Например: позвонить перед доставкой"
            maxLength={500}
          />
          <span className={styles.checkoutFieldHint}>Необязательно. Комментарий сохранится в заказе.</span>
        </label>
      </section>

      <div className={styles.checkoutSummaryCard}>
        <div className={styles.checkoutSummaryRow}>
          <span>До скидок</span>
          <span>{formatStorePrice(subtotalCents, currency)}</span>
        </div>
        {discountCents > 0 ? (
          <div className={styles.checkoutSummaryRow}>
            <span>Скидка</span>
            <span>{formatStorePrice(discountCents, currency)}</span>
          </div>
        ) : null}
        <div className={styles.checkoutSummaryRow}>
          <span>К оплате</span>
          <strong>{paymentSummaryLabel}</strong>
        </div>
      </div>

      <p className={styles.checkoutHint}>
        После подтверждения создаётся заказ и открывается платёжная сессия. Финальная цена и скидки
        подтверждаются на сервере.
      </p>

      {errorMessage ? (
        <p
          className={classNames(styles.inlineActionMessage, styles.inlineActionMessageError)}
          role="status"
          aria-live="polite"
        >
          {errorMessage}
        </p>
      ) : null}

      <button type="submit" className={styles.primaryButton} disabled={isPending} aria-label="Создать заказ и перейти к оплате">
        {isPending ? 'Запускаем оплату...' : 'Создать заказ и перейти к оплате'}
      </button>
    </form>
  );
}
