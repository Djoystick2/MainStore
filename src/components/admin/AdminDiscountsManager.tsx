'use client';

import { useMemo, useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type {
  AdminCategoryOption,
  AdminCollectionOption,
  AdminProductListItem,
} from '@/features/admin';
import type { AdminDiscountItem, DiscountTargetOption, DiscountUpsertInput } from '@/features/discounts';
import type { DiscountScope, DiscountType } from '@/types/db';

import styles from './admin.module.css';

interface AdminDiscountsManagerProps {
  discounts: AdminDiscountItem[];
  products: AdminProductListItem[];
  categories: AdminCategoryOption[];
  collections: AdminCollectionOption[];
}

interface DiscountRowProps {
  discount: AdminDiscountItem;
  targetOptionsByScope: Record<DiscountScope, DiscountTargetOption[]>;
}

function formatStateLabel(state: AdminDiscountItem['currentState']): string {
  switch (state) {
    case 'live':
      return 'Активна';
    case 'scheduled':
      return 'Запланирована';
    case 'expired':
      return 'Завершена';
    case 'inactive':
      return 'Отключена';
    default:
      return state;
  }
}

function formatScopeLabel(scope: DiscountScope): string {
  switch (scope) {
    case 'product':
      return 'Товар';
    case 'category':
      return 'Категория';
    case 'collection':
      return 'Подборка';
    default:
      return scope;
  }
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return '';
  }

  return value.slice(0, 16);
}

function formatDiscountValue(type: DiscountType, value: number): string {
  if (type === 'percentage') {
    return `${Math.round(value)}%`;
  }

  return `-${value}`;
}

function mapDiscountError(error: string | undefined): string {
  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'invalid_discount_scope':
      return 'Выберите корректную область скидки.';
    case 'discount_target_required':
      return 'Укажите, куда применяется скидка.';
    case 'discount_target_not_found':
      return 'Выбранная цель больше не существует.';
    case 'discount_target_has_no_products':
      return 'Для фиксированной скидки нужен хотя бы один связанный товар.';
    case 'discount_target_mixed_currency':
      return 'Фиксированная скидка недоступна: у связанных товаров разные валюты.';
    case 'discount_target_conflict':
      return 'Для этой цели уже существует скидка. Измените текущую запись.';
    case 'discount_title_required':
      return 'Укажите название скидки.';
    case 'invalid_discount_type':
      return 'Выберите корректный тип скидки.';
    case 'invalid_discount_value':
      return 'Значение скидки должно быть больше нуля.';
    case 'invalid_discount_percentage':
      return 'Процент скидки не может быть больше 100.';
    case 'discount_value_exceeds_target_price':
      return 'Фиксированная скидка больше минимальной цены затронутого товара.';
    case 'invalid_discount_starts_at':
    case 'invalid_discount_ends_at':
      return 'Укажите корректную дату действия скидки.';
    case 'invalid_discount_schedule':
      return 'Дата окончания должна быть позже даты начала.';
    case 'discount_not_found':
      return 'Эта скидка больше не существует.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось сохранить скидку. Попробуйте еще раз.';
  }
}

function DiscountRow({ discount, targetOptionsByScope }: DiscountRowProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useState<DiscountScope>(discount.scope);
  const [targetId, setTargetId] = useState(discount.targetId);
  const [title, setTitle] = useState(discount.title);
  const [type, setType] = useState<DiscountType>(discount.type);
  const [value, setValue] = useState(String(discount.value));
  const [isActive, setIsActive] = useState(discount.isActive);
  const [startsAt, setStartsAt] = useState(toDateTimeLocalValue(discount.startsAt));
  const [endsAt, setEndsAt] = useState(toDateTimeLocalValue(discount.endsAt));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const targetOptions = targetOptionsByScope[scope];

  const onSave = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: DiscountUpsertInput = {
        scope,
        targetId,
        title,
        type,
        value: Number(value),
        isActive,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      };

      try {
        const response = await fetch(`/api/admin/discounts/${discount.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) as { ok: true } | { ok: false; error?: string } | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        setSuccessMessage('Скидка сохранена.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при сохранении скидки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const onDelete = () => {
    if (isPending || isSubmittingRef.current) {
      return;
    }

    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const response = await fetch(`/api/admin/discounts/${discount.id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const data = (await response.json().catch(() => null)) as { ok: true } | { ok: false; error?: string } | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при удалении скидки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <article className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h3 className={styles.adminCardTitle}>{discount.title}</h3>
          <p className={styles.adminCardSub}>{discount.targetTitle} В· {formatScopeLabel(discount.scope)}</p>
        </div>
        <div className={styles.adminBadgeRow}>
          <span className={styles.adminStatusBadge}>{formatStateLabel(discount.currentState)}</span>
          <span className={styles.adminFeatureBadge}>{formatDiscountValue(discount.type, discount.value)}</span>
        </div>
      </div>

      <div className={styles.adminForm}>
        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Область</span>
            <select className={styles.adminSelect} value={scope} onChange={(event) => { const nextScope = event.target.value as DiscountScope; setScope(nextScope); setTargetId(targetOptionsByScope[nextScope][0]?.id ?? ''); }}>
              <option value="product">Товар</option>
              <option value="category">Категория</option>
              <option value="collection">Подборка</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Цель</span>
            <select className={styles.adminSelect} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.title}</option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Название</span>
            <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Тип</span>
            <select className={styles.adminSelect} value={type} onChange={(event) => setType(event.target.value as DiscountType)}>
              <option value="percentage">Процент</option>
              <option value="fixed">Фиксированная сумма</option>
            </select>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Значение</span>
            <input type="number" min="0" step="0.01" className={styles.adminInput} value={value} onChange={(event) => setValue(event.target.value)} />
          </label>

          <label className={styles.adminCheckboxRow}>
            <input type="checkbox" className={styles.adminCheckbox} checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            <span className={styles.adminLabel}>Активна сейчас</span>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Начало</span>
            <input type="datetime-local" className={styles.adminInput} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Окончание</span>
            <input type="datetime-local" className={styles.adminInput} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </label>
        </div>

        <div className={styles.adminActions}>
          <button type="button" className={styles.adminActionButton} onClick={onSave} disabled={isPending}>
            {isPending ? 'Сохраняем...' : 'Сохранить'}
          </button>
          <button type="button" className={styles.adminDangerButton} onClick={onDelete} disabled={isPending}>
            {isConfirmingDelete ? 'Подтвердить удаление' : 'Удалить'}
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminDiscountsManager({ discounts, products, categories, collections }: AdminDiscountsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | DiscountScope>('all');
  const [stateFilter, setStateFilter] = useState<'all' | AdminDiscountItem['currentState']>('all');
  const [scope, setScope] = useState<DiscountScope>('product');
  const targetOptionsByScope = useMemo<Record<DiscountScope, DiscountTargetOption[]>>(
    () => ({
      product: products.map((product) => ({ id: product.id, title: product.title, subtitle: product.slug })),
      category: categories.map((category) => ({ id: category.id, title: category.title, subtitle: category.slug })),
      collection: collections.map((collection) => ({ id: collection.id, title: collection.title, subtitle: collection.slug })),
    }),
    [products, categories, collections],
  );
  const [targetId, setTargetId] = useState(targetOptionsByScope.product[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DiscountType>('percentage');
  const [value, setValue] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const filteredDiscounts = discounts.filter((discount) => {
    if (scopeFilter !== 'all' && discount.scope !== scopeFilter) {
      return false;
    }
    if (stateFilter !== 'all' && discount.currentState !== stateFilter) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }

    const haystack = `${discount.title} ${discount.targetTitle} ${discount.scope}`.toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const currentTargetOptions = targetOptionsByScope[scope];

  const onCreate: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const payload: DiscountUpsertInput = {
        scope,
        targetId,
        title,
        type,
        value: Number(value),
        isActive,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      };

      try {
        const response = await fetch('/api/admin/discounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) as { ok: true; id?: string } | { ok: false; error?: string } | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        setTitle('');
        setValue('');
        setIsActive(true);
        setStartsAt('');
        setEndsAt('');
        setSuccessMessage('Скидка создана.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при создании скидки.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  const liveCount = discounts.filter((discount) => discount.currentState === 'live').length;

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Управление скидками</h2>
            <p className={styles.adminCardSub}>
              Одна скидка на товар, категорию или подборку с понятной областью и сроками действия.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{discounts.length} всего</span>
            <span className={styles.adminFeatureBadge}>{liveCount} активных</span>
          </div>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Поиск</span>
            <input className={styles.adminInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название или цель" />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Область</span>
            <select className={styles.adminSelect} value={scopeFilter} onChange={(event) => setScopeFilter(event.target.value as 'all' | DiscountScope)}>
              <option value="all">Все области</option>
              <option value="product">Товары</option>
              <option value="category">Категории</option>
              <option value="collection">Подборки</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Состояние</span>
            <select className={styles.adminSelect} value={stateFilter} onChange={(event) => setStateFilter(event.target.value as 'all' | AdminDiscountItem['currentState'])}>
              <option value="all">Все состояния</option>
              <option value="live">Активные</option>
              <option value="scheduled">Запланированные</option>
              <option value="expired">Завершенные</option>
              <option value="inactive">Отключенные</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2 className={styles.adminCardTitle}>Создать скидку</h2>
        <form className={styles.adminForm} onSubmit={onCreate} aria-busy={isPending}>
          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Область</span>
              <select className={styles.adminSelect} value={scope} onChange={(event) => { const nextScope = event.target.value as DiscountScope; setScope(nextScope); setTargetId(targetOptionsByScope[nextScope][0]?.id ?? ''); }}>
                <option value="product">Товар</option>
                <option value="category">Категория</option>
                <option value="collection">Подборка</option>
              </select>
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Цель</span>
              <select className={styles.adminSelect} value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                {currentTargetOptions.map((option) => (
                  <option key={option.id} value={option.id}>{option.title}</option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Название</span>
              <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Тип</span>
              <select className={styles.adminSelect} value={type} onChange={(event) => setType(event.target.value as DiscountType)}>
                <option value="percentage">Процент</option>
                <option value="fixed">Фиксированная сумма</option>
              </select>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Значение</span>
              <input type="number" min="0" step="0.01" className={styles.adminInput} value={value} onChange={(event) => setValue(event.target.value)} required />
            </label>

            <label className={styles.adminCheckboxRow}>
              <input type="checkbox" className={styles.adminCheckbox} checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              <span className={styles.adminLabel}>Активна сейчас</span>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Начало</span>
              <input type="datetime-local" className={styles.adminInput} value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Окончание</span>
              <input type="datetime-local" className={styles.adminInput} value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
            </label>
          </div>

          <button type="submit" className={styles.adminPrimaryButton} disabled={isPending}>
            {isPending ? 'Создаем...' : 'Создать скидку'}
          </button>

          {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
          {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
        </form>
      </section>

      {filteredDiscounts.length === 0 ? (
        <StoreEmptyState
          title={discounts.length === 0 ? 'Скидок пока нет' : 'Совпадений не найдено'}
          description={discounts.length === 0 ? 'Создайте первую скидку для товаров, категорий или подборок.' : 'Измените фильтры или поисковый запрос.'}
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredDiscounts.map((discount) => (
            <DiscountRow key={discount.id} discount={discount} targetOptionsByScope={targetOptionsByScope} />
          ))}
        </div>
      )}
    </section>
  );
}
