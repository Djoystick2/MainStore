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
      return 'Live';
    case 'scheduled':
      return 'Scheduled';
    case 'expired':
      return 'Expired';
    case 'inactive':
      return 'Inactive';
    default:
      return state;
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

  return `Fixed ${value}`;
}

function mapDiscountError(error: string | undefined): string {
  switch (error) {
    case 'not_configured':
      return 'Admin backend is temporarily unavailable.';
    case 'invalid_discount_scope':
      return 'Select a valid discount scope.';
    case 'discount_target_required':
      return 'Select where the discount should apply.';
    case 'discount_target_not_found':
      return 'Selected target no longer exists.';
    case 'discount_target_has_no_products':
      return 'Fixed discount needs at least one linked product to validate against.';
    case 'discount_target_mixed_currency':
      return 'Fixed discount is blocked because linked products use mixed currencies.';
    case 'discount_target_conflict':
      return 'There is already a discount for this target. Edit the existing one instead.';
    case 'discount_title_required':
      return 'Discount title is required.';
    case 'invalid_discount_type':
      return 'Select a valid discount type.';
    case 'invalid_discount_value':
      return 'Discount value must be greater than zero.';
    case 'invalid_discount_percentage':
      return 'Percentage discount must be 100 or lower.';
    case 'discount_value_exceeds_target_price':
      return 'Fixed discount is higher than the lowest affected product price.';
    case 'invalid_discount_starts_at':
    case 'invalid_discount_ends_at':
      return 'Enter a valid discount schedule date.';
    case 'invalid_discount_schedule':
      return 'Discount end date must be later than the start date.';
    case 'discount_not_found':
      return 'This discount no longer exists.';
    case 'admin_access_denied':
      return 'You do not have access to this admin action.';
    default:
      return 'Could not save discount. Please retry.';
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
        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        setSuccessMessage('Discount saved.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while saving discount.');
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
        const data = (await response.json().catch(() => null)) as
          | { ok: true }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        router.refresh();
      } catch {
        setErrorMessage('Network error while deleting discount.');
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
          <p className={styles.adminCardSub}>
            {discount.targetTitle} · {discount.scope}
          </p>
        </div>
        <div className={styles.adminBadgeRow}>
          <span className={styles.adminStatusBadge}>{formatStateLabel(discount.currentState)}</span>
          <span className={styles.adminFeatureBadge}>{formatDiscountValue(discount.type, discount.value)}</span>
        </div>
      </div>

      <div className={styles.adminForm}>
        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Scope</span>
            <select
              className={styles.adminSelect}
              value={scope}
              onChange={(event) => {
                const nextScope = event.target.value as DiscountScope;
                setScope(nextScope);
                setTargetId(targetOptionsByScope[nextScope][0]?.id ?? '');
              }}
            >
              <option value="product">Product</option>
              <option value="category">Category</option>
              <option value="collection">Collection</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Target</span>
            <select
              className={styles.adminSelect}
              value={targetId}
              onChange={(event) => setTargetId(event.target.value)}
            >
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Title</span>
            <input
              className={styles.adminInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Type</span>
            <select
              className={styles.adminSelect}
              value={type}
              onChange={(event) => setType(event.target.value as DiscountType)}
            >
              <option value="percentage">Percentage off</option>
              <option value="fixed">Fixed amount off</option>
            </select>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Value</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className={styles.adminInput}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isActive}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className={styles.adminLabel}>Active now</span>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Start at</span>
            <input
              type="datetime-local"
              className={styles.adminInput}
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>End at</span>
            <input
              type="datetime-local"
              className={styles.adminInput}
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
        </div>

        <div className={styles.adminActions}>
          <button type="button" className={styles.adminActionButton} onClick={onSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save discount'}
          </button>
          <button type="button" className={styles.adminDangerButton} onClick={onDelete} disabled={isPending}>
            {isConfirmingDelete ? 'Confirm delete' : 'Delete'}
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </div>
    </article>
  );
}

export function AdminDiscountsManager({
  discounts,
  products,
  categories,
  collections,
}: AdminDiscountsManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | DiscountScope>('all');
  const [stateFilter, setStateFilter] = useState<'all' | AdminDiscountItem['currentState']>('all');
  const [scope, setScope] = useState<DiscountScope>('product');
  const targetOptionsByScope = useMemo<Record<DiscountScope, DiscountTargetOption[]>>(
    () => ({
      product: products.map((product) => ({
        id: product.id,
        title: product.title,
        subtitle: product.slug,
      })),
      category: categories.map((category) => ({
        id: category.id,
        title: category.title,
        subtitle: category.slug,
      })),
      collection: collections.map((collection) => ({
        id: collection.id,
        title: collection.title,
        subtitle: collection.slug,
      })),
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
        const data = (await response.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          setErrorMessage(mapDiscountError(data && !data.ok ? data.error : undefined));
          return;
        }

        setTitle('');
        setValue('');
        setIsActive(true);
        setStartsAt('');
        setEndsAt('');
        setSuccessMessage('Discount created.');
        router.refresh();
      } catch {
        setErrorMessage('Network error while creating discount.');
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
            <h2 className={styles.adminCardTitle}>Discount control</h2>
            <p className={styles.adminCardSub}>
              Manage one discount per product, category, or collection with clear timing and scope.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{discounts.length} total</span>
            <span className={styles.adminFeatureBadge}>{liveCount} live</span>
          </div>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Search</span>
            <input
              className={styles.adminInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title or target"
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Scope</span>
            <select
              className={styles.adminSelect}
              value={scopeFilter}
              onChange={(event) => setScopeFilter(event.target.value as 'all' | DiscountScope)}
            >
              <option value="all">All scopes</option>
              <option value="product">Products</option>
              <option value="category">Categories</option>
              <option value="collection">Collections</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>State</span>
            <select
              className={styles.adminSelect}
              value={stateFilter}
              onChange={(event) =>
                setStateFilter(event.target.value as 'all' | AdminDiscountItem['currentState'])
              }
            >
              <option value="all">All states</option>
              <option value="live">Live</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2 className={styles.adminCardTitle}>Create discount</h2>
        <form className={styles.adminForm} onSubmit={onCreate} aria-busy={isPending}>
          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Scope</span>
              <select
                className={styles.adminSelect}
                value={scope}
                onChange={(event) => {
                  const nextScope = event.target.value as DiscountScope;
                  setScope(nextScope);
                  setTargetId(targetOptionsByScope[nextScope][0]?.id ?? '');
                }}
              >
                <option value="product">Product</option>
                <option value="category">Category</option>
                <option value="collection">Collection</option>
              </select>
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Target</span>
              <select
                className={styles.adminSelect}
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {currentTargetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Title</span>
              <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Type</span>
              <select
                className={styles.adminSelect}
                value={type}
                onChange={(event) => setType(event.target.value as DiscountType)}
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Value</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.adminInput}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                required
              />
            </label>

            <label className={styles.adminCheckboxRow}>
              <input
                type="checkbox"
                className={styles.adminCheckbox}
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span className={styles.adminLabel}>Active now</span>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Start at</span>
              <input
                type="datetime-local"
                className={styles.adminInput}
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>End at</span>
              <input
                type="datetime-local"
                className={styles.adminInput}
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </label>
          </div>

          <button type="submit" className={styles.adminPrimaryButton} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create discount'}
          </button>

          {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
          {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
        </form>
      </section>

      {filteredDiscounts.length === 0 ? (
        <StoreEmptyState
          title={discounts.length === 0 ? 'No discounts yet' : 'No matching discounts'}
          description={
            discounts.length === 0
              ? 'Create the first discount to control product, category, or collection pricing.'
              : 'Adjust filters or search query to see matching discounts.'
          }
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredDiscounts.map((discount) => (
            <DiscountRow
              key={discount.id}
              discount={discount}
              targetOptionsByScope={targetOptionsByScope}
            />
          ))}
        </div>
      )}
    </section>
  );
}
