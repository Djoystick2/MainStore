import Link from 'next/link';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { getCurrentUserContext } from '@/features/auth';
import { getOrdersForProfile } from '@/features/orders/data';
import { getUserStoreSummaryForProfile } from '@/features/user-store/data';
import styles from '@/components/store/store.module.css';

function formatOrderStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Ожидает';
    case 'confirmed':
      return 'Подтвержден';
    case 'processing':
      return 'В обработке';
    case 'shipped':
      return 'Отправлен';
    case 'delivered':
      return 'Доставлен';
    case 'cancelled':
      return 'Отменен';
    default:
      return status;
  }
}

export default async function ProfilePage() {
  const { profile } = await getCurrentUserContext();
  const [summary, ordersData] = await Promise.all([
    getUserStoreSummaryForProfile(profile?.id ?? null),
    getOrdersForProfile(profile?.id ?? null),
  ]);
  const latestOrder = ordersData.orders[0] ?? null;
  const displayName = profile?.displayName || profile?.username || 'Пользователь Telegram';
  const username = profile?.username ? `@${profile.username}` : 'Без username';

  return (
    <StoreScreen title="Профиль" subtitle="Аккаунт, история и быстрые действия">
      {profile ? (
        <>
          {ordersData.message && (
            <section
              className={classNames(
                styles.dataNotice,
                ordersData.status === 'error' && styles.dataNoticeError,
              )}
            >
              <p className={styles.dataNoticeTitle}>Обновление профиля</p>
              <p className={styles.dataNoticeText}>{ordersData.message}</p>
              {(ordersData.status === 'error' ||
                ordersData.status === 'not_configured') && (
                <div className={styles.dataNoticeActions}>
                  <Link
                    href="/profile"
                    className={styles.dataNoticeRetry}
                    aria-label="Повторить загрузку профиля"
                  >
                    Повторить
                  </Link>
                </div>
              )}
            </section>
          )}

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>{displayName}</h2>
            <p className={styles.panelText}>
              {username}
              <br />
              Роль: {profile.role}
            </p>
          </section>

          <StoreSection title="Активность">
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Избранное</p>
                <p className={styles.infoValue}>{summary.favoritesCount}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Товаров в корзине</p>
                <p className={styles.infoValue}>{summary.cartQuantityTotal}</p>
              </div>
              <div className={styles.infoItem}>
                <p className={styles.infoLabel}>Заказы</p>
                <p className={styles.infoValue}>{ordersData.totalOrders}</p>
              </div>
            </div>
          </StoreSection>

          {latestOrder && (
            <StoreSection title="Последний заказ">
              <Link
                href={`/orders/${latestOrder.id}`}
                className={styles.orderCard}
                aria-label="Открыть последний заказ"
              >
                <div className={styles.orderCardHeader}>
                  <p className={styles.orderCardId}>
                    Заказ #{latestOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span className={styles.orderStatusBadge}>
                    {formatOrderStatus(latestOrder.status)}
                  </span>
                </div>
                <p className={styles.orderMetaItem}>
                  {formatStorePrice(latestOrder.totalCents, latestOrder.currency)}
                </p>
              </Link>
            </StoreSection>
          )}
        </>
      ) : (
        <StoreEmptyState
          title="Нет активной сессии"
          description="Откройте MainStore в Telegram, чтобы загрузить профиль, избранное и корзину."
          actionLabel="Открыть каталог"
          actionHref="/catalog"
        />
      )}

      <StoreSection title="Быстрые переходы">
        <div className={styles.actionList}>
          <Link href="/orders" className={styles.actionItem} aria-label="Открыть мои заказы">
            <div>
              <p className={styles.actionItemTitle}>Мои заказы</p>
              <p className={styles.actionItemSub}>Статусы и история покупок</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>

          <Link href="/favorites" className={styles.actionItem} aria-label="Открыть избранное">
            <div>
              <p className={styles.actionItemTitle}>Избранное</p>
              <p className={styles.actionItemSub}>Сохраненные товары в одном месте</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>

          <Link href="/cart" className={styles.actionItem} aria-label="Открыть корзину">
            <div>
              <p className={styles.actionItemTitle}>Корзина</p>
              <p className={styles.actionItemSub}>Проверьте товары перед оформлением</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>
        </div>
      </StoreSection>
    </StoreScreen>
  );
}
