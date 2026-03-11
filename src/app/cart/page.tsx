import Link from 'next/link';

import { TelegramSessionRequiredState } from '@/components/auth/TelegramSessionRequiredState';
import { CartItemControls } from '@/components/store/CartItemControls';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getCartDataForProfile, getUserStoreSummaryForProfile } from '@/features/user-store/data';
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
  const [cartData, summary] = await Promise.all([
    getCartDataForProfile(profile?.id ?? null),
    getUserStoreSummaryForProfile(profile?.id ?? null),
  ]);
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

  if (isSessionMissing) {
    return (
      <StoreScreen title="Корзина" subtitle="Проверьте состав заказа и переходите к оформлению без лишних шагов">
        <TelegramSessionRequiredState
          fallbackTitle="Нужна сессия Telegram"
          fallbackDescription="Откройте MainStore в Telegram, чтобы загрузить личную корзину."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/cart"
        />
      </StoreScreen>
    );
  }

  return (
    <StoreScreen title="Корзина" subtitle="Проверьте состав заказа и переходите к оформлению без лишних шагов">
      {cartData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            cartData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление корзины</p>
          <p className={styles.dataNoticeText}>{cartData.message}</p>
          {(cartData.status === 'error' || cartData.status === 'not_configured') ? (
            <div className={styles.dataNoticeActions}>
              <Link href="/cart" className={styles.dataNoticeRetry} aria-label="Повторить загрузку корзины">
                Повторить
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <StoreSection title="Сводка">
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Позиции</p>
            <p className={styles.infoValue}>{cartData.itemCount}</p>
          </div>
          {cartData.discountTotalCents > 0 ? (
            <div className={styles.infoItem}>
              <p className={styles.infoLabel}>До скидок</p>
              <p className={styles.infoValue}>{baseSubtotalLabel}</p>
            </div>
          ) : null}
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Итого</p>
            <p className={styles.infoValue}>{subtotalLabel}</p>
          </div>
          {cartData.discountTotalCents > 0 ? (
            <div className={styles.infoItem}>
              <p className={styles.infoLabel}>Экономия</p>
              <p className={styles.infoValue}>{discountLabel}</p>
            </div>
          ) : null}
        </div>
      </StoreSection>

      {cartData.items.length > 0 ? (
        <div className={styles.panelActions}>
          <Link href="/checkout" className={styles.primaryLinkButton} aria-label="Перейти к оформлению">
            К оформлению
          </Link>
          <Link href="/catalog" className={styles.secondaryButton}>
            Продолжить покупки
          </Link>
        </div>
      ) : null}

      {isSessionMissing ? (
        <TelegramSessionRequiredState
          fallbackTitle="Нужна сессия Telegram"
          fallbackDescription="Откройте MainStore в Telegram, чтобы загрузить личную корзину."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/cart"
        />
      ) : null}

      {isEmpty ? (
        <>
          <StoreEmptyState
            title="Корзина пуста"
            description="Добавьте товары из каталога, и они появятся здесь."
            actionLabel="Перейти в каталог"
            actionHref="/catalog"
          />

          {summary.favoritesCount > 0 ? (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Можно вернуться к избранному</h2>
              <p className={styles.panelText}>
                У вас уже есть сохранённые товары. Откройте избранное и соберите новый заказ оттуда.
              </p>
              <div className={styles.panelActions}>
                <Link href="/favorites" className={styles.secondaryButton}>
                  Открыть избранное
                </Link>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      {cartData.items.length > 0 ? (
        <>
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
                        item.product.compareAtPriceCents > item.product.priceCents ? (
                          <p className={styles.cartItemPriceCompare}>
                            {formatStorePrice(item.product.compareAtPriceCents, item.product.currency)}
                          </p>
                        ) : null}
                      </div>
                      {item.product.appliedDiscount ? (
                        <p className={styles.cartItemDiscount}>{item.product.appliedDiscount.badgeText}</p>
                      ) : null}
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

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Следующий шаг</h2>
            <p className={styles.panelText}>
              На оформлении заказ создаётся с отдельным статусом оплаты, а затем открывается
              тестовый платёжный шаг. Сводка по скидкам и финальная сумма подтверждаются на сервере.
            </p>
          </section>
        </>
      ) : null}
    </StoreScreen>
  );
}
