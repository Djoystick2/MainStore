'use client';

import Link from 'next/link';
import { useState } from 'react';

import { StoreEmptyState } from '@/components/store/StoreEmptyState';
import { classNames } from '@/css/classnames';
import type { AdminCategoryOption, AdminProductListItem, ProductStatus } from '@/features/admin/types';
import storeStyles from '@/components/store/store.module.css';

import { AdminProductDuplicateButton } from './AdminProductDuplicateButton';
import { AdminProductFeatureToggle } from './AdminProductFeatureToggle';
import { AdminProductStatusControl } from './AdminProductStatusControl';
import styles from './admin.module.css';

const statusFilterOptions: Array<{ value: 'all' | ProductStatus; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'draft', label: 'Черновики' },
  { value: 'archived', label: 'Архив' },
];

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatProductStatus(status: ProductStatus): string {
  switch (status) {
    case 'active':
      return 'Активен';
    case 'draft':
      return 'Черновик';
    case 'archived':
      return 'Архив';
    default:
      return status;
  }
}

export function AdminProductsCatalogManager({ products, categories }: { products: AdminProductListItem[]; categories: AdminCategoryOption[]; }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  const searchValue = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (searchValue) {
      const haystack = [product.title, product.slug, product.categoryTitle ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(searchValue)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && product.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) {
      return false;
    }
    if (featuredFilter === 'featured' && !product.isFeatured) {
      return false;
    }
    if (featuredFilter === 'standard' && product.isFeatured) {
      return false;
    }
    if (availabilityFilter === 'in_stock' && product.stockQuantity <= 0) {
      return false;
    }
    if (availabilityFilter === 'out_of_stock' && product.stockQuantity > 0) {
      return false;
    }
    return true;
  });

  const activeProductsCount = products.filter((product) => product.status === 'active').length;
  const draftProductsCount = products.filter((product) => product.status === 'draft').length;
  const featuredProductsCount = products.filter((product) => product.isFeatured).length;
  const outOfStockCount = products.filter((product) => product.stockQuantity <= 0).length;
  const withoutCategoryCount = products.filter((product) => !product.categoryId).length;
  const discountedCount = products.filter((product) => Boolean(product.appliedDiscount)).length;

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Обзор каталога</h2>
            <p className={styles.adminCardSub}>
              Ищите, фильтруйте, публикуйте, выделяйте и дублируйте товары из одного места.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{products.length} всего</span>
            <span className={styles.adminFeatureBadge}>{featuredProductsCount} рекомендуемых</span>
            <span className={styles.adminAvailabilityBadge}>{outOfStockCount} без остатка</span>
          </div>
        </div>

        <div className={styles.adminSummaryGrid}>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Активные товары</p>
            <p className={styles.adminSummaryValue}>{activeProductsCount}</p>
            <p className={styles.adminSummaryText}>
              {draftProductsCount} черновиков ждут публикации или доработки.
            </p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Рекомендуемые и со скидкой</p>
            <p className={styles.adminSummaryValue}>
              {featuredProductsCount + discountedCount}
            </p>
            <p className={styles.adminSummaryText}>
              {featuredProductsCount} рекомендуемых и {discountedCount} с активной скидкой.
            </p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>Требуют внимания</p>
            <p className={styles.adminSummaryValue}>{outOfStockCount + withoutCategoryCount}</p>
            <p className={styles.adminSummaryText}>
              {outOfStockCount} без остатка и {withoutCategoryCount} без категории.
            </p>
          </div>
          <div className={styles.adminSummaryCard}>
            <p className={styles.adminSummaryLabel}>После фильтрации</p>
            <p className={styles.adminSummaryValue}>{filteredProducts.length}</p>
            <p className={styles.adminSummaryText}>
              {categories.length} категорий доступны для навигации и разбивки каталога.
            </p>
          </div>
        </div>

        <div className={styles.adminCallout}>
          <p className={styles.adminCalloutTitle}>Операционный фокус</p>
          <p className={styles.adminCalloutText}>
            Быстрые фильтры подходят для ежедневной работы. Массовые обновления цен, остатков и
            контента безопаснее проводить через Excel import с preview-first проверкой.
          </p>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Поиск</span>
            <input className={styles.adminInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Название, slug, категория" aria-label="Поиск товаров" />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Статус</span>
            <select className={styles.adminSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | ProductStatus)}>
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Категория</span>
            <select className={styles.adminSelect} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.title}</option>
              ))}
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Рекомендация</span>
            <select className={styles.adminSelect} value={featuredFilter} onChange={(event) => setFeaturedFilter(event.target.value as 'all' | 'featured' | 'standard')}>
              <option value="all">Все товары</option>
              <option value="featured">Только рекомендуемые</option>
              <option value="standard">Без рекомендации</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Наличие</span>
            <select className={styles.adminSelect} value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value as 'all' | 'in_stock' | 'out_of_stock')}>
              <option value="all">Все</option>
              <option value="in_stock">В наличии</option>
              <option value="out_of_stock">Нет в наличии</option>
            </select>
          </label>
        </div>
      </section>

      {filteredProducts.length === 0 ? (
        <StoreEmptyState
          title={products.length === 0 ? 'Товаров пока нет' : 'Совпадений не найдено'}
          description={products.length === 0 ? 'Создайте первый товар, чтобы начать управлять каталогом.' : 'Измените фильтры или поисковый запрос.'}
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredProducts.map((product) => {
            const stockLabel = product.stockQuantity > 0 ? 'В наличии' : 'Нет в наличии';

            return (
              <article key={product.id} className={styles.adminCard}>
                <div className={styles.adminProductListRow}>
                  <div className={styles.adminProductListMedia}>
                    {product.primaryImageUrl ? (
                      <div className={styles.adminProductListImage} style={{ backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.12), rgba(12, 18, 31, 0.12)), url(${product.primaryImageUrl})` }} />
                    ) : (
                      <div className={styles.adminProductListPlaceholder}>Нет изображения</div>
                    )}
                  </div>

                  <div className={styles.adminProductListContent}>
                    <div className={styles.adminCardHead}>
                      <div>
                        <h3 className={styles.adminCardTitle}>{product.title}</h3>
                        <p className={styles.adminCardSub}>
                          {product.slug}
                          {product.categoryTitle ? ` | ${product.categoryTitle}` : ''}
                        </p>
                      </div>
                      <div className={styles.adminBadgeRow}>
                        <span className={classNames(storeStyles.orderStatusBadge, styles.adminCompactBadge)}>
                          {formatProductStatus(product.status)}
                        </span>
                        {product.appliedDiscount && (
                          <span className={styles.adminFeatureBadge}>{product.appliedDiscount.badgeText}</span>
                        )}
                        {product.isFeatured && <span className={styles.adminFeatureBadge}>Рекомендуемый</span>}
                        <span className={styles.adminAvailabilityBadge}>{stockLabel}</span>
                      </div>
                    </div>

                    <div className={styles.adminMetaGrid}>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Цена</p>
                        <p className={styles.adminMetaValue}>{formatPrice(product.price, product.currency)}</p>
                        {product.displayCompareAtPrice && product.displayCompareAtPrice > product.price && (
                          <p className={styles.adminCardSub}>Было {formatPrice(product.displayCompareAtPrice, product.currency)}</p>
                        )}
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Остаток</p>
                        <p className={styles.adminMetaValue}>{product.stockQuantity}</p>
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Обновлен</p>
                        <p className={styles.adminMetaValue}>{new Date(product.updatedAt).toLocaleDateString('ru-RU')}</p>
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Скидка</p>
                        <p className={styles.adminMetaValue}>
                          {product.appliedDiscount
                            ? `${product.appliedDiscount.targetTitle} · ${product.appliedDiscount.scope}`
                            : 'Нет активной скидки'}
                        </p>
                      </div>
                    </div>

                    <div className={styles.adminStackActions}>
                      <AdminProductStatusControl productId={product.id} initialStatus={product.status} />
                      <AdminProductFeatureToggle productId={product.id} initialIsFeatured={product.isFeatured} />
                      <div className={styles.adminActions}>
                        <Link href={`/admin/products/${product.id}/edit`} className={styles.adminActionLink} aria-label={`Открыть товар ${product.title}`}>
                          Открыть
                        </Link>
                        <AdminProductDuplicateButton productId={product.id} />
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

