'use client';

import { useRef, useState, useTransition, type FormEventHandler } from 'react';
import { useRouter } from 'next/navigation';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import type { AdminCategoryOption, CategoryUpsertInput } from '@/features/admin/types';

import styles from './admin.module.css';

interface AdminCategoriesManagerProps {
  categories: AdminCategoryOption[];
}

interface CategoryEditorProps {
  category?: AdminCategoryOption;
  submitLabel: string;
  successLabel: string;
  resetOnSuccess?: boolean;
  onSubmit: (payload: CategoryUpsertInput) => Promise<{ ok: true } | { ok: false; error?: string }>;
}

interface CatalogSectionSummary {
  slug: string;
  title: string;
  description: string;
  order: number;
  visual: string | null;
  artworkUrl: string | null;
  categoriesCount: number;
}

interface CategoryDeleteButtonProps {
  categoryId: string;
  onDeleted: () => void;
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeOptionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function getSafeArtworkUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    // Ignore invalid artwork URLs in preview mode.
  }

  return null;
}

function mapAdminCategoryError(error: string | undefined): string {
  switch (error) {
    case 'not_configured':
      return 'Админ-часть временно недоступна.';
    case 'category_title_required':
      return 'Укажите название категории.';
    case 'invalid_category_slug':
      return 'Слаг категории должен содержать только строчные буквы, цифры и дефисы.';
    case 'invalid_category_sort_order':
      return 'Порядок вывода должен быть неотрицательным целым числом.';
    case 'invalid_catalog_group_slug':
      return 'Код верхнего раздела должен содержать только строчные буквы, цифры и дефисы.';
    case 'invalid_catalog_group_order':
      return 'Порядок верхнего раздела должен быть неотрицательным целым числом.';
    case 'invalid_catalog_group_artwork_url':
      return 'Укажите корректный http или https URL для изображения верхней плитки.';
    case 'slug_conflict':
      return 'Этот слаг уже используется другой категорией.';
    case 'category_not_found':
      return 'Эта категория больше недоступна.';
    case 'admin_access_denied':
      return 'У вас нет доступа к этому действию.';
    default:
      return 'Не удалось сохранить категорию. Попробуйте еще раз.';
  }
}

function buildCatalogSections(categories: AdminCategoryOption[]): CatalogSectionSummary[] {
  const sections = new Map<string, CatalogSectionSummary>();

  categories.forEach((category) => {
    if (!category.isActive || !category.catalogVisible) {
      return;
    }

    const slug = category.catalogGroupSlug?.trim() || category.slug;
    const title = category.catalogGroupTitle?.trim() || category.title;
    const description =
      category.catalogGroupDescription?.trim() ||
      category.shortText?.trim() ||
      category.description?.trim() ||
      'Подкатегории этого раздела';
    const order = category.catalogGroupOrder ?? category.sortOrder;
    const visual = category.catalogVisual?.trim() || null;
    const artworkUrl = category.catalogGroupArtworkUrl?.trim() || null;

    const current = sections.get(slug);
    if (!current) {
      sections.set(slug, { slug, title, description, order, visual, artworkUrl, categoriesCount: 1 });
      return;
    }

    current.categoriesCount += 1;
    if (order < current.order) {
      current.title = title;
      current.description = description;
      current.order = order;
      current.visual = visual;
      current.artworkUrl = artworkUrl;
    } else if (!current.visual && visual) {
      current.visual = visual;
    } else if (!current.artworkUrl && artworkUrl) {
      current.artworkUrl = artworkUrl;
    }
  });

  return [...sections.values()].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return left.title.localeCompare(right.title);
  });
}

function CategoryDeleteButton({ categoryId, onDeleted }: CategoryDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className={styles.adminActions}>
      <button
        type="button"
        className={styles.adminDangerButton}
        disabled={isPending}
        onClick={() => {
          if (!isConfirming) {
            setIsConfirming(true);
            return;
          }

          startTransition(async () => {
            setErrorMessage(null);

            try {
              const response = await fetch(`/api/admin/categories/${categoryId}`, {
                method: 'DELETE',
                credentials: 'include',
              });
              const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
              if (!response.ok || !data?.ok) {
                setErrorMessage(mapAdminCategoryError(data?.error));
                return;
              }

              onDeleted();
            } catch {
              setErrorMessage('Сетевая ошибка при удалении категории.');
            }
          });
        }}
      >
        {isPending ? 'Удаляем...' : isConfirming ? 'Подтвердить удаление' : 'Удалить категорию'}
      </button>
      {errorMessage ? <p className={styles.adminError}>{errorMessage}</p> : null}
    </div>
  );
}

function CategoryEditor({
  category,
  submitLabel,
  successLabel,
  resetOnSuccess = false,
  onSubmit,
}: CategoryEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(category?.title ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [description, setDescription] = useState(category?.description ?? '');
  const [shortText, setShortText] = useState(category?.shortText ?? '');
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [catalogGroupSlug, setCatalogGroupSlug] = useState(category?.catalogGroupSlug ?? '');
  const [catalogGroupTitle, setCatalogGroupTitle] = useState(category?.catalogGroupTitle ?? '');
  const [catalogGroupDescription, setCatalogGroupDescription] = useState(
    category?.catalogGroupDescription ?? '',
  );
  const [catalogGroupOrder, setCatalogGroupOrder] = useState(String(category?.catalogGroupOrder ?? 0));
  const [catalogVisible, setCatalogVisible] = useState(category?.catalogVisible ?? true);
  const [catalogVisual, setCatalogVisual] = useState(category?.catalogVisual ?? '');
  const [catalogGroupArtworkUrl, setCatalogGroupArtworkUrl] = useState(category?.catalogGroupArtworkUrl ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (isPending || isSubmittingRef.current) {
      return;
    }

    const parsedSortOrder = Number(sortOrder);
    const parsedCatalogGroupOrder = Number(catalogGroupOrder);

    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      setErrorMessage('Порядок вывода должен быть неотрицательным целым числом.');
      return;
    }

    if (!Number.isInteger(parsedCatalogGroupOrder) || parsedCatalogGroupOrder < 0) {
      setErrorMessage('Порядок верхнего раздела должен быть неотрицательным целым числом.');
      return;
    }

    const payload: CategoryUpsertInput = {
      title,
      slug,
      description,
      shortText,
      isActive,
      sortOrder: parsedSortOrder,
      catalogGroupSlug: normalizeOptionalText(catalogGroupSlug),
      catalogGroupTitle: normalizeOptionalText(catalogGroupTitle),
      catalogGroupDescription: normalizeOptionalText(catalogGroupDescription),
      catalogGroupOrder: parsedCatalogGroupOrder,
      catalogVisible,
      catalogVisual: normalizeOptionalText(catalogVisual),
      catalogGroupArtworkUrl: normalizeOptionalText(catalogGroupArtworkUrl),
    };

    isSubmittingRef.current = true;
    startTransition(async () => {
      setErrorMessage(null);
      setSuccessMessage(null);

      const result = await onSubmit(payload);
      if (!result.ok) {
        setErrorMessage(mapAdminCategoryError(result.error));
      } else {
        setSuccessMessage(successLabel);
        if (resetOnSuccess) {
          setTitle('');
          setSlug('');
          setDescription('');
          setShortText('');
          setSortOrder('0');
          setIsActive(true);
          setCatalogGroupSlug('');
          setCatalogGroupTitle('');
          setCatalogGroupDescription('');
          setCatalogGroupOrder('0');
          setCatalogVisible(true);
          setCatalogVisual('');
          setCatalogGroupArtworkUrl('');
        }
      }

      isSubmittingRef.current = false;
    });
  };

  return (
    <form className={styles.adminForm} onSubmit={handleSubmit} aria-busy={isPending}>
      <section className={styles.adminFormSection}>
        <div className={styles.adminFormSectionHead}>
          <h4 className={styles.adminFormSectionTitle}>Основные данные</h4>
          <p className={styles.adminFormSectionText}>Поля самой категории и её карточки в витрине.</p>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Название</span>
            <input className={styles.adminInput} value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Слаг</span>
            <div className={styles.adminInlineActionRow}>
              <input className={styles.adminInput} value={slug} onChange={(event) => setSlug(event.target.value)} required />
              <button type="button" className={styles.adminActionButton} onClick={() => setSlug(slugify(title))} disabled={!title.trim() || isPending}>
                Из названия
              </button>
            </div>
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Короткий текст</span>
            <input className={styles.adminInput} value={shortText} onChange={(event) => setShortText(event.target.value)} />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Порядок вывода</span>
            <input type="number" min="0" step="1" className={styles.adminInput} value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
          </label>
        </div>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Описание</span>
          <textarea className={styles.adminTextarea} value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>
      </section>

      <section className={styles.adminFormSection}>
        <div className={styles.adminFormSectionHead}>
          <h4 className={styles.adminFormSectionTitle}>Каталог и плитка раздела</h4>
          <p className={styles.adminFormSectionText}>Эти поля управляют верхним уровнем каталога, artwork первой плитки и переходом к листингу.</p>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Код верхнего раздела</span>
            <div className={styles.adminInlineActionRow}>
              <input className={styles.adminInput} value={catalogGroupSlug} onChange={(event) => setCatalogGroupSlug(event.target.value)} placeholder="apparel" />
              <button type="button" className={styles.adminActionButton} onClick={() => setCatalogGroupSlug(slugify(catalogGroupTitle || title))} disabled={!(catalogGroupTitle.trim() || title.trim()) || isPending}>
                Из названия
              </button>
            </div>
            <span className={styles.adminFieldHint}>Одинаковый код объединяет подкатегории в одну верхнюю плитку.</span>
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Порядок верхнего раздела</span>
            <input type="number" min="0" step="1" className={styles.adminInput} value={catalogGroupOrder} onChange={(event) => setCatalogGroupOrder(event.target.value)} />
          </label>
        </div>

        <div className={styles.adminInlineRow}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Заголовок верхней плитки</span>
            <input className={styles.adminInput} value={catalogGroupTitle} onChange={(event) => setCatalogGroupTitle(event.target.value)} placeholder="Одежда" />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Визуал плитки</span>
            <input className={styles.adminInput} value={catalogVisual} onChange={(event) => setCatalogVisual(event.target.value)} placeholder="ОД или emoji" />
          </label>
        </div>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Фоновое изображение верхней плитки</span>
          <input
            className={styles.adminInput}
            value={catalogGroupArtworkUrl}
            onChange={(event) => setCatalogGroupArtworkUrl(event.target.value)}
            placeholder="https://example.com/catalog-apparel.jpg"
            inputMode="url"
          />
          <span className={styles.adminFieldHint}>
            Это изображение используется на первом экране каталога для верхней плитки раздела.
          </span>
        </label>

        <div className={styles.adminCatalogArtworkPreview}>
          <div
            className={styles.adminCatalogArtworkPreviewMedia}
            style={
              getSafeArtworkUrl(catalogGroupArtworkUrl)
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(5, 6, 8, 0.12) 0%, rgba(5, 6, 8, 0.56) 72%, rgba(5, 6, 8, 0.84) 100%), url(${getSafeArtworkUrl(catalogGroupArtworkUrl)})`,
                  }
                : undefined
            }
          >
            <span className={styles.adminCatalogArtworkPreviewBadge}>
              {(catalogVisual || catalogGroupTitle || title || 'Раздел').slice(0, 2).toUpperCase()}
            </span>
            <div className={styles.adminCatalogArtworkPreviewCopy}>
              <p className={styles.adminCatalogArtworkPreviewTitle}>
                {catalogGroupTitle || title || 'Верхняя плитка каталога'}
              </p>
              <p className={styles.adminCatalogArtworkPreviewText}>
                {catalogGroupDescription || shortText || description || 'Превью верхней плитки каталога для storefront.'}
              </p>
            </div>
          </div>
        </div>

        <label className={styles.adminField}>
          <span className={styles.adminLabel}>Описание верхней плитки</span>
          <textarea className={styles.adminTextarea} value={catalogGroupDescription} onChange={(event) => setCatalogGroupDescription(event.target.value)} rows={2} />
        </label>

        <label className={styles.adminCheckboxRow}>
          <input type="checkbox" className={styles.adminCheckbox} checked={catalogVisible} onChange={(event) => setCatalogVisible(event.target.checked)} />
          <span className={styles.adminLabel}>Показывать категорию в каталоге</span>
        </label>
        <label className={styles.adminCheckboxRow}>
          <input type="checkbox" className={styles.adminCheckbox} checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span className={styles.adminLabel}>Категория активна</span>
        </label>
      </section>

      <button type="submit" className={category ? styles.adminActionButton : styles.adminPrimaryButton} disabled={isPending}>
        {isPending ? 'Сохраняем...' : submitLabel}
      </button>

      {errorMessage && <p className={styles.adminError}>{errorMessage}</p>}
      {successMessage && <p className={styles.adminSuccess}>{successMessage}</p>}
    </form>
  );
}

export function AdminCategoriesManager({ categories }: AdminCategoriesManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'catalog' | 'hidden'>('all');

  const filteredCategories = categories.filter((category) => {
    if (visibilityFilter === 'visible' && !category.isActive) {
      return false;
    }
    if (visibilityFilter === 'hidden' && category.isActive) {
      return false;
    }
    if (catalogFilter === 'catalog' && !category.catalogVisible) {
      return false;
    }
    if (catalogFilter === 'hidden' && category.catalogVisible) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }

    const haystack = [category.title, category.slug, category.shortText ?? '', category.catalogGroupSlug ?? '', category.catalogGroupTitle ?? ''].join(' ').toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const catalogSections = buildCatalogSections(categories);
  const linkedProductsCount = categories.reduce((total, category) => total + category.productsCount, 0);
  const catalogVisibleCount = categories.filter((category) => category.isActive && category.catalogVisible).length;

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Каталог и структура витрины</h2>
            <p className={styles.adminCardSub}>Здесь редактируются и подкатегории, и верхние плитки каталога, и логика переходов storefront.</p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{categories.length} категорий</span>
            <span className={styles.adminStatusBadge}>{catalogSections.length} разделов</span>
          </div>
        </div>

        <div className={styles.adminSummaryGrid}>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Верхние разделы</p>
            <p className={styles.adminSummaryValue}>{catalogSections.length}</p>
            <p className={styles.adminSummaryText}>Плитки первого экрана каталога.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Подкатегории в каталоге</p>
            <p className={styles.adminSummaryValue}>{catalogVisibleCount}</p>
            <p className={styles.adminSummaryText}>Участвуют в пути “плитки → список → листинг”.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Связанные товары</p>
            <p className={styles.adminSummaryValue}>{linkedProductsCount}</p>
            <p className={styles.adminSummaryText}>Показывает влияние правок на storefront.</p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>После фильтрации</p>
            <p className={styles.adminSummaryValue}>{filteredCategories.length}</p>
            <p className={styles.adminSummaryText}>Текущий рабочий список категорий.</p>
          </div>
        </div>

        <div className={styles.adminCallout}>
          <p className={styles.adminCalloutTitle}>Как управлять верхними плитками</p>
          <p className={styles.adminCalloutText}>Используйте одинаковый код верхнего раздела у нужных подкатегорий. Заголовок, описание, порядок, визуал и фоновый artwork этой плитки также задаются здесь.</p>
        </div>

        {catalogSections.length > 0 ? (
          <div className={styles.adminLinkGrid}>
            {catalogSections.map((section) => (
              <article key={section.slug} className={styles.adminLinkCard}>
                <div
                  className={styles.adminCatalogSectionPreview}
                  style={
                    getSafeArtworkUrl(section.artworkUrl)
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(5, 6, 8, 0.12) 0%, rgba(5, 6, 8, 0.56) 72%, rgba(5, 6, 8, 0.84) 100%), url(${getSafeArtworkUrl(section.artworkUrl)})`,
                        }
                      : undefined
                  }
                >
                  {section.visual ? (
                    <span className={styles.adminCatalogSectionPreviewBadge}>{section.visual}</span>
                  ) : null}
                </div>
                <p className={styles.adminLinkTitle}>{section.visual ? `${section.visual} ` : ''}{section.title}</p>
                <p className={styles.adminLinkText}>{section.description}</p>
                <div className={styles.adminMetaGrid}>
                  <div className={styles.adminMetaCell}>
                    <p className={styles.adminMetaLabel}>Код</p>
                    <p className={styles.adminMetaValue}>{section.slug}</p>
                  </div>
                  <div className={styles.adminMetaCell}>
                    <p className={styles.adminMetaLabel}>Подкатегории</p>
                    <p className={styles.adminMetaValue}>{section.categoriesCount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.adminCard}>
        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Поиск</span>
            <input className={styles.adminInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название, slug, верхний раздел" />
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Статус</span>
            <select className={styles.adminSelect} value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as 'all' | 'visible' | 'hidden')}>
              <option value="all">Все категории</option>
              <option value="visible">Только активные</option>
              <option value="hidden">Только скрытые</option>
            </select>
          </label>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Участие в каталоге</span>
            <select className={styles.adminSelect} value={catalogFilter} onChange={(event) => setCatalogFilter(event.target.value as 'all' | 'catalog' | 'hidden')}>
              <option value="all">Все</option>
              <option value="catalog">Только в каталоге</option>
              <option value="hidden">Скрытые из каталога</option>
            </select>
          </label>
        </div>

        <div className={styles.adminToolbar}>
          <p className={styles.adminToolbarMeta}>В рабочем списке <span className={styles.adminToolbarStrong}>{filteredCategories.length}</span> категорий.</p>
          {(search.trim() || visibilityFilter !== 'all' || catalogFilter !== 'all') ? (
            <button type="button" className={styles.adminSecondaryButton} onClick={() => { setSearch(''); setVisibilityFilter('all'); setCatalogFilter('all'); }}>
              Сбросить фильтры
            </button>
          ) : null}
        </div>
      </section>

      <section className={styles.adminCard}>
        <div className={styles.adminFormSectionHead}>
          <h2 className={styles.adminCardTitle}>Создать подкатегорию</h2>
          <p className={styles.adminCardSub}>Новая категория может сразу попасть в нужный верхний раздел каталога.</p>
        </div>
        <CategoryEditor
          submitLabel="Создать категорию"
          successLabel="Категория создана и готова к показу в каталоге."
          resetOnSuccess
          onSubmit={async (payload) => {
            try {
              const response = await fetch('/api/admin/categories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
              });
              const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
              if (!response.ok || !data?.ok) {
                return { ok: false as const, error: data?.error };
              }
              router.refresh();
              return { ok: true as const };
            } catch {
              return { ok: false as const, error: undefined };
            }
          }}
        />
      </section>

      {filteredCategories.length === 0 ? (
        <StoreEmptyState
          title={categories.length === 0 ? 'Категорий пока нет' : 'Совпадений не найдено'}
          description={categories.length === 0 ? 'Создайте первую категорию, чтобы управлять плитками каталога и структурой витрины.' : 'Измените фильтры или поисковый запрос.'}
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredCategories.map((category) => (
            <article key={category.id} className={styles.adminCard}>
              <div className={styles.adminCardHead}>
                <div>
                  <h3 className={styles.adminCardTitle}>{category.title}</h3>
                  <p className={styles.adminCardSub}>{category.productsCount} связанных товаров · {category.slug}</p>
                </div>
                <div className={styles.adminBadgeRow}>
                  <span className={styles.adminStatusBadge}>{category.isActive ? 'Включена' : 'Скрыта'}</span>
                  <span className={styles.adminStatusBadge}>{category.catalogVisible ? 'Есть в каталоге' : 'Скрыта из каталога'}</span>
                </div>
              </div>
              <CategoryEditor
                category={category}
                submitLabel="Сохранить"
                successLabel="Категория и настройки каталога сохранены."
                onSubmit={async (payload) => {
                  try {
                    const response = await fetch(`/api/admin/categories/${category.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(payload),
                    });
                    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
                    if (!response.ok || !data?.ok) {
                      return { ok: false as const, error: data?.error };
                    }
                    router.refresh();
                    return { ok: true as const };
                  } catch {
                    return { ok: false as const, error: undefined };
                  }
                }}
              />
              <div className={styles.adminCalloutWarn}>
                <p className={styles.adminCalloutTitle}>Удаление категории</p>
                <p className={styles.adminCalloutText}>
                  При удалении товары останутся в системе, но потеряют привязку к этой категории.
                </p>
              </div>
              <CategoryDeleteButton categoryId={category.id} onDeleted={() => router.refresh()} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
