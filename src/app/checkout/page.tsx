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
  const baseSubtotalLabel = formatStorePrice(cartData.baseSubtotalCents, currency);
  const totalLabel = formatStorePrice(cartData.subtotalCents, currency);
  const discountLabel = formatStorePrice(cartData.discountTotalCents, currency);

  return (
    <StoreScreen title="Оформление" subtitle="Данные доставки и проверка заказа" back={true}>
      {cartData.message && (
        <section
          className={classNames(
            styles.dataNotice,
            cartData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление оформления</p>
          <p className={styles.dataNoticeText}>{cartData.message}</p>
          {(cartData.status === 'error' || cartData.status === 'not_configured') && (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/checkout"
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку оформления"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {isUnauthorized ? (
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы оформлять заказы."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      ) : null}

      {isEmpty ? (
        <StoreEmptyState
          title="Корзина пуста"
          description="Добавьте товары в корзину перед оформлением."
          actionLabel="Перейти в каталог"
          actionHref="/catalog"
        />
      ) : null}

      {isCheckoutUnavailable ? (
        <StoreEmptyState
          title="Оформление временно недоступно"
          description="Проверьте корзину и попробуйте снова чуть позже."
          actionLabel="Вернуться в корзину"
          actionHref="/cart"
        />
      ) : null}

      {cartData.items.length > 0 && (
        <>
          <StoreSection title="Сводка по заказу">
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
                <p className={styles.infoValue}>{totalLabel}</p>
              </div>
              {cartData.discountTotalCents > 0 && (
                <div className={styles.infoItem}>
                  <p className={styles.infoLabel}>Скидка</p>
                  <p className={styles.infoValue}>{discountLabel}</p>
                </div>
              )}
            </div>
          </StoreSection>

          <section className={styles.panel}>
            <p className={styles.panelText}>
              Цена и наличие подтверждаются на сервере в момент оформления заказа.
            </p>
          </section>

          <StoreSection title="Доставка">
            <CheckoutForm
              initialFullName={profile?.displayName}
              subtotalCents={cartData.baseSubtotalCents}
              discountCents={cartData.discountTotalCents}
              totalCents={cartData.subtotalCents}
              currency={currency}
            />
          </StoreSection>

          <Link
            href="/cart"
            className={styles.secondaryInlineLink}
            aria-label="Вернуться в корзину"
          >
            Вернуться в корзину
          </Link>
        </>
      )}
    </StoreScreen>
  );
}
