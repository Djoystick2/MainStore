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
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

interface AdminProductsCatalogManagerProps {
  products: AdminProductListItem[];
  categories: AdminCategoryOption[];
}

export function AdminProductsCatalogManager({
  products,
  categories,
}: AdminProductsCatalogManagerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'standard'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  const searchValue = search.trim().toLowerCase();
  const filteredProducts = products.filter((product) => {
    if (searchValue) {
      const haystack = [
        product.title,
        product.slug,
        product.categoryTitle ?? '',
      ]
        .join(' ')
        .toLowerCase();

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
  const featuredProductsCount = products.filter((product) => product.isFeatured).length;
  const outOfStockCount = products.filter((product) => product.stockQuantity <= 0).length;

  return (
    <section className={styles.adminSectionStack}>
      <section className={styles.adminCard}>
        <div className={styles.adminCardHead}>
          <div>
            <h2 className={styles.adminCardTitle}>Catalog overview</h2>
            <p className={styles.adminCardSub}>
              Search, filter, publish, feature, and duplicate products from one place.
            </p>
          </div>
          <div className={styles.adminBadgeRow}>
            <span className={styles.adminStatusBadge}>{products.length} total</span>
            <span className={styles.adminFeatureBadge}>{featuredProductsCount} featured</span>
            <span className={styles.adminAvailabilityBadge}>{outOfStockCount} out of stock</span>
          </div>
        </div>

        <div className={styles.adminMetaGrid}>
          <div className={styles.adminMetaCell}>
            <p className={styles.adminMetaLabel}>Active</p>
            <p className={styles.adminMetaValue}>{activeProductsCount}</p>
          </div>
          <div className={styles.adminMetaCell}>
            <p className={styles.adminMetaLabel}>Draft + archived</p>
            <p className={styles.adminMetaValue}>{products.length - activeProductsCount}</p>
          </div>
          <div className={styles.adminMetaCell}>
            <p className={styles.adminMetaLabel}>Filtered results</p>
            <p className={styles.adminMetaValue}>{filteredProducts.length}</p>
          </div>
          <div className={styles.adminMetaCell}>
            <p className={styles.adminMetaLabel}>Categories</p>
            <p className={styles.adminMetaValue}>{categories.length}</p>
          </div>
        </div>

        <div className={styles.adminFiltersGrid}>
          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Search</span>
            <input
              className={styles.adminInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Title, slug, category"
              aria-label="Search products"
            />
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Status</span>
            <select
              className={styles.adminSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | ProductStatus)}
            >
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Category</span>
            <select
              className={styles.adminSelect}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Featured</span>
            <select
              className={styles.adminSelect}
              value={featuredFilter}
              onChange={(event) =>
                setFeaturedFilter(event.target.value as 'all' | 'featured' | 'standard')
              }
            >
              <option value="all">All products</option>
              <option value="featured">Featured only</option>
              <option value="standard">Standard only</option>
            </select>
          </label>

          <label className={styles.adminField}>
            <span className={styles.adminLabel}>Availability</span>
            <select
              className={styles.adminSelect}
              value={availabilityFilter}
              onChange={(event) =>
                setAvailabilityFilter(
                  event.target.value as 'all' | 'in_stock' | 'out_of_stock',
                )
              }
            >
              <option value="all">All availability</option>
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
        </div>
      </section>

      {filteredProducts.length === 0 ? (
        <StoreEmptyState
          title={products.length === 0 ? 'No products yet' : 'No matches found'}
          description={
            products.length === 0
              ? 'Create the first product to start managing the catalog.'
              : 'Adjust filters or search query to see matching products.'
          }
        />
      ) : (
        <div className={styles.adminCardList}>
          {filteredProducts.map((product) => {
            const stockLabel = product.stockQuantity > 0 ? 'In stock' : 'Out of stock';

            return (
              <article key={product.id} className={styles.adminCard}>
                <div className={styles.adminProductListRow}>
                  <div className={styles.adminProductListMedia}>
                    {product.primaryImageUrl ? (
                      <div
                        className={styles.adminProductListImage}
                        style={{
                          backgroundImage: `linear-gradient(rgba(12, 18, 31, 0.12), rgba(12, 18, 31, 0.12)), url(${product.primaryImageUrl})`,
                        }}
                      />
                    ) : (
                      <div className={styles.adminProductListPlaceholder}>No image</div>
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
                          {product.status}
                        </span>
                        {product.appliedDiscount && (
                          <span className={styles.adminFeatureBadge}>
                            {product.appliedDiscount.badgeText}
                          </span>
                        )}
                        {product.isFeatured && (
                          <span className={styles.adminFeatureBadge}>Featured</span>
                        )}
                        <span className={styles.adminAvailabilityBadge}>{stockLabel}</span>
                      </div>
                    </div>

                    <div className={styles.adminMetaGrid}>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Price</p>
                        <p className={styles.adminMetaValue}>
                          {formatPrice(product.price, product.currency)}
                        </p>
                        {product.displayCompareAtPrice &&
                          product.displayCompareAtPrice > product.price && (
                            <p className={styles.adminCardSub}>
                              Was {formatPrice(product.displayCompareAtPrice, product.currency)}
                            </p>
                          )}
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Stock</p>
                        <p className={styles.adminMetaValue}>{product.stockQuantity}</p>
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Updated</p>
                        <p className={styles.adminMetaValue}>
                          {new Date(product.updatedAt).toLocaleDateString('en-US')}
                        </p>
                      </div>
                      <div className={styles.adminMetaCell}>
                        <p className={styles.adminMetaLabel}>Discount</p>
                        <p className={styles.adminMetaValue}>
                          {product.appliedDiscount
                            ? `${product.appliedDiscount.targetTitle} · ${product.appliedDiscount.scope}`
                            : 'No active discount'}
                        </p>
                      </div>
                    </div>

                    <div className={styles.adminStackActions}>
                      <AdminProductStatusControl
                        productId={product.id}
                        initialStatus={product.status}
                      />
                      <AdminProductFeatureToggle
                        productId={product.id}
                        initialIsFeatured={product.isFeatured}
                      />
                      <div className={styles.adminActions}>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className={styles.adminActionLink}
                          aria-label={`Open ${product.title}`}
                        >
                          Open card
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
