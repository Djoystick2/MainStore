import Link from 'next/link';
import type { CSSProperties } from 'react';

import { CheckoutForm } from '@/components/store/CheckoutForm';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getCartDataForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

function buildImageStyle(imageUrl: string | null | undefined, gradient: string): CSSProperties {
  if (imageUrl) {
    return {
      backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.14), rgba(12, 18, 31, 0.14)), url(${imageUrl})`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
    };
  }

  return {
    background: gradient,
  };
}

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
    <StoreScreen title="Оформление" subtitle="Доставка, сумма и понятный путь к оплате" back={true}>
      {cartData.message ? (
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
              <Link href="/checkout" className={styles.dataNoticeRetry} aria-label="Повторить загрузку оформления">
                Повторить
              </Link>
            </div>
          )}
        </section>
      ) : null}

      {isUnauthorized ? (
        <StoreEmptyState
          title="Нужна сессия Telegram"
          description="Откройте MainStore в Telegram, чтобы оформить и оплатить заказ."
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

      {cartData.items.length > 0 ? (
        <>
          <StoreSection title="Сводка по заказу">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Позиции</p>
                <p className={styles.infoValue}>{cartData.itemCount}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Итого</p>
                <p className={styles.infoValue}>{totalLabel}</p>
              </div>
              {cartData.discountTotalCents > 0 ? (
                <>
                  <div className={styles.infoItem}>
                    <p className={styles.infoLabel}>До скидок</p>
                    <p className={styles.infoValue}>{baseSubtotalLabel}</p>
                  </div>
                  <div className={styles.infoItem}>
                    <p className={styles.infoLabel}>Скидка</p>
                    <p className={styles.infoValue}>{discountLabel}</p>
                  </div>
                </>
              ) : null}
            </div>
          </StoreSection>

          <StoreSection title="Что войдёт в заказ">
            <div className={styles.orderItemsList}>
              {cartData.items.map((item) => (
                <article key={item.id} className={styles.orderItemRow}>
                  <div
                    className={styles.orderItemImage}
                    style={buildImageStyle(item.product.imageUrl, item.product.imageGradient)}
                  />
                  <div className={styles.orderItemMeta}>
                    <p className={styles.orderItemTitle}>{item.product.title}</p>
                    <p className={styles.orderItemSub}>
                      {item.quantity} x {formatStorePrice(item.product.priceCents, item.product.currency)}
                    </p>
                    <p className={styles.orderItemTotal}>
                      {formatStorePrice(item.lineTotalCents, item.product.currency)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </StoreSection>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Как пройдёт оформление</h2>
            <p className={styles.panelText}>
              Сначала вы подтверждаете данные доставки, затем создаётся заказ и открывается sandbox payment flow.
              Payment status и order status сохраняются отдельно и дальше отображаются в заказе.
            </p>
          </section>

          <StoreSection title="Получатель и доставка">
            <CheckoutForm
              initialFullName={profile?.displayName}
              subtotalCents={cartData.baseSubtotalCents}
              discountCents={cartData.discountTotalCents}
              totalCents={cartData.subtotalCents}
              currency={currency}
            />
          </StoreSection>

          <Link href="/cart" className={styles.secondaryInlineLink} aria-label="Вернуться в корзину">
            Вернуться в корзину
          </Link>
        </>
      ) : null}
    </StoreScreen>
  );
}
