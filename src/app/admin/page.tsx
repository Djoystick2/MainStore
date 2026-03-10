import Link from 'next/link';

import { AdminScreen } from '@/components/admin/AdminScreen';
import adminStyles from '@/components/admin/admin.module.css';
import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import { getAdminDashboardData } from '@/features/admin';
import storeStyles from '@/components/store/store.module.css';

export default async function AdminPage() {
  const dashboard = await getAdminDashboardData();
  const data = dashboard.dashboard;

  return (
    <AdminScreen title="Админка" subtitle="Операционная панель магазина">
      {dashboard.message && (
        <section
          className={classNames(
            storeStyles.dataNotice,
            dashboard.status === 'error' && storeStyles.dataNoticeError,
          )}
        >
          <p className={storeStyles.dataNoticeTitle}>Состояние админки</p>
          <p className={storeStyles.dataNoticeText}>{dashboard.message}</p>
          {(dashboard.status === 'error' || dashboard.status === 'not_configured') && (
            <div className={storeStyles.dataNoticeActions}>
              <Link
                href="/admin"
                className={storeStyles.dataNoticeRetry}
                aria-label="Повторить загрузку админки"
              >
                Повторить
              </Link>
            </div>
          )}
        </section>
      )}

      {data ? (
        <div className={adminStyles.adminSectionStack}>
          <section className={adminStyles.adminPageLead}>
            <h2 className={adminStyles.adminPageLeadTitle}>Что важно сейчас</h2>
            <p className={adminStyles.adminPageLeadText}>
              Держите под контролем оплату, публикацию каталога и активные merchandising-блоки из
              одного рабочего пространства.
            </p>
            <div className={adminStyles.adminActionBar}>
              <Link href="/admin/orders" className={adminStyles.adminPrimaryLink}>
                Проверить заказы
              </Link>
              <Link href="/admin/products/new" className={adminStyles.adminActionLink}>
                Создать товар
              </Link>
              <Link href="/admin/import" className={adminStyles.adminActionLink}>
                Импортировать Excel
              </Link>
            </div>
          </section>

          <section className={adminStyles.adminSummaryGrid}>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Каталог</p>
              <p className={adminStyles.adminSummaryValue}>{data.productsCount}</p>
              <p className={adminStyles.adminSummaryText}>
                {data.activeProductsCount} активных, {data.draftProductsCount} черновиков,{' '}
                {data.archivedProductsCount} в архиве.
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Заказы</p>
              <p className={adminStyles.adminSummaryValue}>{data.ordersCount}</p>
              <p className={adminStyles.adminSummaryText}>
                {data.pendingOrdersCount} требуют операционного внимания, {data.awaitingPaymentOrdersCount}{' '}
                еще ждут оплату.
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Структура каталога</p>
              <p className={adminStyles.adminSummaryValue}>
                {data.categoriesCount + data.collectionsCount}
              </p>
              <p className={adminStyles.adminSummaryText}>
                {data.categoriesCount} категорий и {data.collectionsCount} подборок для витрины и
                входов в каталог.
              </p>
            </article>
            <article className={adminStyles.adminSummaryCard}>
              <p className={adminStyles.adminSummaryLabel}>Скидки</p>
              <p className={adminStyles.adminSummaryValue}>{data.discountsCount}</p>
              <p className={adminStyles.adminSummaryText}>
                {data.liveDiscountsCount} активных и {data.scheduledDiscountsCount} запланированных
                кампаний.
              </p>
            </article>
          </section>

          <section className={adminStyles.adminCard}>
            <div className={adminStyles.adminCardHead}>
              <div>
                <h2 className={adminStyles.adminCardTitle}>Операционные маршруты</h2>
                <p className={adminStyles.adminCardSub}>
                  Разделы сгруппированы по реальным задачам магазина, а не только по сущностям.
                </p>
              </div>
            </div>
            <div className={adminStyles.adminLinkGrid}>
              <Link href="/admin/products" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Каталог</p>
                <p className={adminStyles.adminLinkText}>
                  Товары, публикация, остатки, изображения и быстрые операции по карточкам.
                </p>
              </Link>
              <Link href="/admin/categories" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Категории</p>
                <p className={adminStyles.adminLinkText}>
                  Навигация витрины, порядок показа и безопасное управление связями товаров.
                </p>
              </Link>
              <Link href="/admin/collections" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Подборки</p>
                <p className={adminStyles.adminLinkText}>
                  Контентные и merchandising-группы для home, витрины и акцентов.
                </p>
              </Link>
              <Link href="/admin/discounts" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Скидки</p>
                <p className={adminStyles.adminLinkText}>
                  Правила цен, сроки действия и влияние на товары, категории и подборки.
                </p>
              </Link>
              <Link href="/admin/orders" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Заказы и оплата</p>
                <p className={adminStyles.adminLinkText}>
                  Статусы заказа, состояние оплаты и безопасное продвижение исполнения.
                </p>
              </Link>
              <Link href="/admin/import" className={adminStyles.adminLinkCard}>
                <p className={adminStyles.adminLinkTitle}>Импорт Excel</p>
                <p className={adminStyles.adminLinkText}>
                  Массовое обновление каталога с preview-first validation для XLSX, XLS, XLSM и
                  XLTX.
                </p>
              </Link>
            </div>
          </section>

          <section className={adminStyles.adminCard}>
            <div className={adminStyles.adminCardHead}>
              <div>
                <h2 className={adminStyles.adminCardTitle}>Быстрые приоритеты</h2>
                <p className={adminStyles.adminCardSub}>
                  Короткий operational checklist, чтобы не терять время на повседневных задачах.
                </p>
              </div>
            </div>
            <div className={adminStyles.adminSectionStack}>
              <div className={adminStyles.adminCalloutWarn}>
                <p className={adminStyles.adminCalloutTitle}>Заказы без оплаты</p>
                <p className={adminStyles.adminCalloutText}>
                  Сейчас {data.awaitingPaymentOrdersCount} заказов нельзя безопасно продвигать в
                  исполнение до подтверждения платежа.
                </p>
              </div>
              <div className={adminStyles.adminCallout}>
                <p className={adminStyles.adminCalloutTitle}>Черновики и мерчандайзинг</p>
                <p className={adminStyles.adminCalloutText}>
                  Проверьте {data.draftProductsCount} черновиков и {data.liveDiscountsCount} активных
                  скидок, чтобы витрина оставалась актуальной.
                </p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <StoreEmptyState
          title="Данные админки недоступны"
          description="Попробуйте обновить страницу чуть позже."
          actionLabel="Повторить"
          actionHref="/admin"
        />
      )}
    </AdminScreen>
  );
}
