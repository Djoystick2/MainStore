import Link from 'next/link';

import { TelegramSessionRequiredState } from '@/components/auth/TelegramSessionRequiredState';
import { StoreScreen } from '@/components/store/StoreScreen';
import { StoreSection } from '@/components/store/StoreSection';
import { formatStorePrice } from '@/components/store/formatPrice';
import { classNames } from '@/css/classnames';
import { hasAdminRole } from '@/features/admin/access';
import { getCurrentUserContext } from '@/features/auth';
import { formatPaymentStatus } from '@/features/payments';
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

function getNextAction(input: {
  cartQuantityTotal: number;
  favoritesCount: number;
  actionRequiredOrders: number;
  inProgressOrders: number;
}): { title: string; text: string; href: string; label: string } {
  if (input.actionRequiredOrders > 0) {
    return {
      title: 'Есть заказы, которые ждут действия',
      text: 'Откройте историю заказов и проверьте оплату или текущий статус.',
      href: '/orders',
      label: 'К заказам',
    };
  }

  if (input.cartQuantityTotal > 0) {
    return {
      title: 'Можно вернуться к оформлению',
      text: 'В корзине уже есть товары. Проверьте состав и продолжите заказ, когда будете готовы.',
      href: '/cart',
      label: 'Открыть корзину',
    };
  }

  if (input.favoritesCount > 0) {
    return {
      title: 'В избранном есть сохраненные товары',
      text: 'Посмотрите сохраненные позиции и верните их в покупку, когда захотите.',
      href: '/favorites',
      label: 'Открыть избранное',
    };
  }

  if (input.inProgressOrders > 0) {
    return {
      title: 'Следите за текущими заказами',
      text: 'Статусы и детали доставки обновляются прямо в вашем личном разделе.',
      href: '/orders',
      label: 'Смотреть заказы',
    };
  }

  return {
    title: 'Можно продолжить покупки',
    text: 'Каталог, подборки и карточки товаров уже готовы. Выберите следующую позицию без лишних шагов.',
    href: '/catalog',
    label: 'Перейти в каталог',
  };
}

function formatProfileRole(role: string): string {
  return hasAdminRole(role) ? 'Администратор' : 'Покупатель';
}

export default async function ProfilePage() {
  const { profile } = await getCurrentUserContext();
  const [summary, ordersData] = await Promise.all([
    getUserStoreSummaryForProfile(profile?.id ?? null),
    getOrdersForProfile(profile?.id ?? null),
  ]);
  const latestOrder = ordersData.orders[0] ?? null;
  const nextAction = getNextAction({
    cartQuantityTotal: summary.cartQuantityTotal,
    favoritesCount: summary.favoritesCount,
    actionRequiredOrders: ordersData.actionRequiredOrders,
    inProgressOrders: ordersData.inProgressOrders,
  });

  if (!profile) {
    return (
      <StoreScreen title="Профиль" subtitle="Аккаунт, история и быстрые действия">
        <TelegramSessionRequiredState
          fallbackTitle="Нет активной сессии"
          fallbackDescription="Откройте MainStore в Telegram, чтобы загрузить профиль, избранное, корзину и заказы."
          fallbackActionLabel="Открыть каталог"
          fallbackActionHref="/catalog"
          retryHref="/profile"
        />
      </StoreScreen>
    );
  }

  const displayName = profile.displayName || profile.username || 'Пользователь Telegram';
  const username = profile.username ? `@${profile.username}` : 'username не указан';
  const isAdmin = hasAdminRole(profile.role);
  const roleLabel = formatProfileRole(profile.role);

  return (
    <StoreScreen
      title="Профиль"
      subtitle="Личное пространство для заказов, избранного и корзины"
    >
      {ordersData.message ? (
        <section
          className={classNames(
            styles.dataNotice,
            ordersData.status === 'error' && styles.dataNoticeError,
          )}
        >
          <p className={styles.dataNoticeTitle}>Обновление профиля</p>
          <p className={styles.dataNoticeText}>{ordersData.message}</p>
          {(ordersData.status === 'error' || ordersData.status === 'not_configured') ? (
            <div className={styles.dataNoticeActions}>
              <Link
                href="/profile"
                className={styles.dataNoticeRetry}
                aria-label="Повторить загрузку профиля"
              >
                Повторить
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className={classNames(styles.panel, styles.profileHero)}>
        <p className={styles.profileEyebrow}>Профиль MainStore</p>
        <h2 className={styles.panelTitle}>{displayName}</h2>
        <p className={styles.panelText}>
          {username}
          <br />
          Личный раздел для покупок, истории заказов и сохраненных товаров.
        </p>
        <div className={styles.profileHeroMeta}>
          <span className={styles.profileMetaBadge}>Роль: {roleLabel}</span>
          <span className={styles.profileMetaBadge}>Заказов: {ordersData.totalOrders}</span>
          <span className={styles.profileMetaBadge}>В корзине: {summary.cartQuantityTotal}</span>
        </div>
      </section>

      {isAdmin ? (
        <section className={classNames(styles.panel, styles.adminEntryCard)}>
          <div className={styles.adminEntryHead}>
            <div className={styles.adminEntryCopy}>
              <p className={styles.adminEntryEyebrow}>Управление магазином</p>
              <h2 className={styles.panelTitle}>Админ-панель</h2>
              <p className={styles.adminEntryText}>
                Откройте каталог, заказы, скидки и Excel-импорт из одного места.
              </p>
            </div>
            <Link
              href="/admin"
              className={styles.adminEntryButton}
              aria-label="Открыть админ-панель"
            >
              Открыть админку
            </Link>
          </div>
        </section>
      ) : null}

      <StoreSection title="Что сейчас важно">
        <div className={styles.actionList}>
          <Link href={nextAction.href} className={styles.actionItem} aria-label={nextAction.label}>
            <div>
              <p className={styles.actionItemTitle}>{nextAction.title}</p>
              <p className={styles.actionItemSub}>{nextAction.text}</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>
        </div>
      </StoreSection>

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
            <p className={styles.infoLabel}>Заказы в работе</p>
            <p className={styles.infoValue}>{ordersData.inProgressOrders}</p>
          </div>
          <div className={styles.infoItem}>
            <p className={styles.infoLabel}>Требуют действия</p>
            <p className={styles.infoValue}>{ordersData.actionRequiredOrders}</p>
          </div>
        </div>
      </StoreSection>

      {latestOrder ? (
        <StoreSection title="Последний заказ">
          <Link
            href={`/orders/${latestOrder.id}`}
            className={styles.orderCard}
            aria-label="Открыть последний заказ"
          >
            <div className={styles.orderCardHeader}>
              <p className={styles.orderCardId}>Заказ #{latestOrder.id.slice(0, 8).toUpperCase()}</p>
              <p className={styles.orderMetaItem}>
                {formatStorePrice(latestOrder.totalCents, latestOrder.currency)}
              </p>
            </div>
            <div className={styles.paymentBadgeRow}>
              <span className={styles.orderStatusBadge}>{formatOrderStatus(latestOrder.status)}</span>
              <span className={styles.paymentStatusBadge}>
                {formatPaymentStatus(latestOrder.paymentStatus)}
              </span>
            </div>
            <p className={styles.orderCardHint}>
              {latestOrder.canRetryPayment
                ? 'Ожидает оплаты или подтверждения платежа'
                : 'Открыть детали заказа'}
            </p>
          </Link>
        </StoreSection>
      ) : (
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>История заказов еще пустая</h2>
          <p className={styles.panelText}>
            Когда появится первый заказ, здесь будет удобно вернуться к оплате, доставке и
            деталям покупки.
          </p>
        </section>
      )}

      <StoreSection title="Быстрые переходы">
        <div className={styles.actionList}>
          <Link href="/orders" className={styles.actionItem} aria-label="Открыть мои заказы">
            <div>
              <p className={styles.actionItemTitle}>Мои заказы</p>
              <p className={styles.actionItemSub}>Статусы, оплата и история покупок</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>

          <Link href="/favorites" className={styles.actionItem} aria-label="Открыть избранное">
            <div>
              <p className={styles.actionItemTitle}>Избранное</p>
              <p className={styles.actionItemSub}>Сохраненные товары для быстрого возврата</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>

          <Link href="/cart" className={styles.actionItem} aria-label="Открыть корзину">
            <div>
              <p className={styles.actionItemTitle}>Корзина</p>
              <p className={styles.actionItemSub}>Проверьте состав заказа и переходите к оформлению</p>
            </div>
            <span className={styles.actionItemIcon}>--&gt;</span>
          </Link>
        </div>
      </StoreSection>
    </StoreScreen>
  );
}
