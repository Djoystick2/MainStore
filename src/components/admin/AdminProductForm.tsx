'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import type {
  AdminCategoryOption,
  AdminProductDetail,
  ProductStatus,
} from '@/features/admin/types';

import styles from './admin.module.css';

const statusOptions: ProductStatus[] = ['draft', 'active', 'archived'];

function toNullableNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatProductStatus(status: ProductStatus): string {
  switch (status) {
    case 'draft':
      return 'Черновик';
    case 'active':
      return 'Активен';
    case 'archived':
      return 'Архив';
    default:
      return status;
  }
}

function mapAdminProductError(error: string | undefined): string {
  if (!error) {
    return 'Не удалось сохранить товар.';
  }

  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'invalid_slug':
      return 'Слаг должен содержать только строчные буквы, цифры и дефисы.';
    case 'slug_conflict':
      return 'Этот слаг уже используется другим товаром.';
    case 'title_required':
      return 'Укажите название товара.';
    case 'invalid_status':
      return 'Выбран некорректный статус.';
    case 'currency_required':
      return 'Укажите валюту.';
    case 'invalid_currency':
      return 'Валюта должна быть в 3-буквенном коде, например USD.';
    case 'invalid_price':
      return 'Цена должна быть корректным неотрицательным числом.';
    case 'compare_at_price_less_than_price':
      return 'Старая цена должна быть больше или равна текущей.';
    case 'invalid_stock_quantity':
      return 'Остаток должен быть корректным неотрицательным целым числом.';
    case 'invalid_category':
      return 'Выбранная категория больше недоступна.';
    case 'product_not_found':
      return 'Этот товар больше недоступен.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось сохранить товар. Попробуйте еще раз.';
  }
}

export function AdminProductForm({
  mode,
  product,
  categories,
}: {
  mode: 'create' | 'edit';
  product?: AdminProductDetail | null;
  categories: AdminCategoryOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [slug, setSlug] = useState(product?.slug ?? '');
  const [title, setTitle] = useState(product?.title ?? '');
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product?.price !== undefined ? String(product.price) : '');
  const [compareAtPrice, setCompareAtPrice] = useState(
    product?.compareAtPrice !== null && product?.compareAtPrice !== undefined
      ? String(product.compareAtPrice)
      : '',
  );
  const [currency, setCurrency] = useState(product?.currency ?? 'USD');
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'draft');
  const [stockQuantity, setStockQuantity] = useState(
    product?.stockQuantity !== undefined ? String(product.stockQuantity) : '0',
  );
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const isSubmittingRef = useRef(false);

  const heading = mode === 'create' ? 'Создание товара' : 'Редактирование товара';
  const primaryActionLabel =
    mode === 'create'
      ? isPending
        ? 'Создаем...'
        : 'Создать товар'
      : isPending
        ? 'Сохраняем...'
        : 'Сохранить изменения';

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isPending || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const parsedPrice = Number(price);
      const parsedStock = Number(stockQuantity);
      const parsedCompareAtPrice = toNullableNumber(compareAtPrice);

      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setErrorMessage('Цена должна быть корректным неотрицательным числом.');
        isSubmittingRef.current = false;
        return;
      }

      if (!Number.isInteger(parsedStock) || parsedStock < 0) {
        setErrorMessage('Остаток должен быть неотрицательным целым числом.');
        isSubmittingRef.current = false;
        return;
      }

      if (parsedCompareAtPrice !== null && parsedCompareAtPrice < parsedPrice) {
        setErrorMessage('Старая цена должна быть больше или равна текущей.');
        isSubmittingRef.current = false;
        return;
      }

      const payload = {
        slug,
        title,
        shortDescription,
        description,
        price: parsedPrice,
        compareAtPrice: parsedCompareAtPrice,
        currency,
        status,
        isFeatured,
        stockQuantity: parsedStock,
        categoryId: categoryId || null,
      };

      const endpoint = mode === 'create' ? '/api/admin/products' : `/api/admin/products/${product?.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      try {
        const response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | { ok: true; id?: string }
          | { ok: false; error?: string }
          | null;

        if (!response.ok || !data || !data.ok) {
          const errorCode = data && !data.ok ? data.error : undefined;
          setErrorMessage(mapAdminProductError(errorCode));
          return;
        }

        if (mode === 'create' && data.id) {
          router.push(`/admin/products/${data.id}/edit`);
          return;
        }

        setSuccessMessage('Карточка товара обновлена.');
        router.refresh();
      } catch {
        setErrorMessage('Сетевая ошибка при сохранении товара.');
      } finally {
        isSubmittingRef.current = false;
      }
    });
  };

  return (
    <section className={styles.adminCard}>
      <div className={styles.adminCardHead}>
        <div>
          <h2 className={styles.adminCardTitle}>{heading}</h2>
          <p className={styles.adminCardSub}>
            Цена, публикация, тексты и наличие собраны в одной форме.
          </p>
        </div>
        <span className={styles.adminStatusBadge}>{formatProductStatus(status)}</span>
      </div>

      <form className={styles.adminForm} onSubmit={handleSubmit} aria-busy={isPending}>
        <section className={styles.adminFormSection}>
          <div className={styles.adminFormSectionHead}>
            <h3 className={styles.adminFormSectionTitle}>Основа карточки</h3>
            <p className={styles.adminFormSectionText}>
              Название и адрес карточки определяют, как товар будет выглядеть и открываться на
              витрине.
            </p>
          </div>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Название</span>
            <input
              className={styles.adminInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Адрес карточки</span>
            <div className={styles.adminInlineActionRow}>
              <input
                className={styles.adminInput}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                required
              />
              <button
                type="button"
                className={styles.adminActionButton}
                onClick={() => setSlug(slugify(title))}
                disabled={!title.trim() || isPending}
                aria-label="Сгенерировать слаг из названия"
              >
                Из названия
              </button>
            </div>
            <span className={styles.adminFieldHint}>
              Используйте только строчные латинские буквы, цифры и дефисы.
            </span>
          </label>
        </section>

        <section className={styles.adminFormSection}>
          <div className={styles.adminFormSectionHead}>
            <h3 className={styles.adminFormSectionTitle}>Цена и наличие</h3>
            <p className={styles.adminFormSectionText}>
              Здесь управляются текущая цена, старая цена и количество товара в наличии.
            </p>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Цена</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.adminInput}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                required
              />
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Старая цена</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className={styles.adminInput}
                value={compareAtPrice}
                onChange={(event) => setCompareAtPrice(event.target.value)}
              />
              <span className={styles.adminFieldHint}>
                Оставьте пустым, если товар продается без перечеркнутой цены.
              </span>
            </label>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Валюта</span>
              <input
                className={styles.adminInput}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
                maxLength={3}
                required
              />
              <span className={styles.adminFieldHint}>
                Трехбуквенный код валюты, например `USD`.
              </span>
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Остаток</span>
              <input
                type="number"
                min="0"
                step="1"
                className={styles.adminInput}
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                required
              />
            </label>
          </div>
        </section>

        <section className={styles.adminFormSection}>
          <div className={styles.adminFormSectionHead}>
            <h3 className={styles.adminFormSectionTitle}>Публикация</h3>
            <p className={styles.adminFormSectionText}>
              Определите, виден ли товар покупателям, и нужно ли выделять его на витрине.
            </p>
          </div>

          <div className={styles.adminInlineRow}>
            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Статус</span>
              <select
                className={styles.adminSelect}
                value={status}
                onChange={(event) => setStatus(event.target.value as ProductStatus)}
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatProductStatus(option)}
                  </option>
                ))}
              </select>
              <span className={styles.adminFieldHint}>
                Черновик скрыт, активный товар виден, архив убирает карточку из рабочего потока.
              </span>
            </label>

            <label className={styles.adminField}>
              <span className={styles.adminLabel}>Категория</span>
              <select
                className={styles.adminSelect}
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">Без категории</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              className={styles.adminCheckbox}
              checked={isFeatured}
              onChange={(event) => setIsFeatured(event.target.checked)}
            />
            <span className={styles.adminLabel}>Показывать как рекомендуемый</span>
          </label>
        </section>

        <section className={styles.adminFormSection}>
          <div className={styles.adminFormSectionHead}>
            <h3 className={styles.adminFormSectionTitle}>Описания</h3>
            <p className={styles.adminFormSectionText}>
              Короткий текст используется в карточке и списках, полный текст нужен для страницы
              товара.
            </p>
          </div>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Короткое описание</span>
            <textarea
              className={styles.adminTextarea}
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              rows={3}
            />
            <span className={styles.adminFieldHint}>
              Подходит для быстрых подборок, карточек каталога и витринных блоков.
            </span>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Полное описание</span>
            <textarea
              className={styles.adminTextarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
            />
            <span className={styles.adminFieldHint}>
              Здесь удобно хранить развернутый текст, характеристики и детали для страницы товара.
            </span>
          </label>
        </section>

        <div className={styles.adminFormActions}>
          <button
            type="submit"
            className={styles.adminPrimaryButton}
            disabled={isPending}
            aria-label={mode === 'create' ? 'Создать товар' : 'Сохранить товар'}
          >
            {primaryActionLabel}
          </button>
        </div>

        {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
        {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
      </form>
    </section>
  );
}
