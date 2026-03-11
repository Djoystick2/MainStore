import type { Database } from '@/types/db';
import type { AppliedDiscountSummary } from '@/features/pricing';

export type ProductStatus = Database['public']['Enums']['product_status'];
export type OrderStatus = Database['public']['Enums']['order_status'];
export type PaymentStatus = Database['public']['Enums']['payment_status'];
export type PaymentProvider = Database['public']['Enums']['payment_provider'];

export interface AdminCategoryOption {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortText: string | null;
  isActive: boolean;
  sortOrder: number;
  productsCount: number;
  catalogGroupSlug: string | null;
  catalogGroupTitle: string | null;
  catalogGroupDescription: string | null;
  catalogGroupOrder: number;
  catalogVisible: boolean;
  catalogVisual: string | null;
  catalogGroupArtworkUrl: string | null;
}

export interface AdminCollectionOption {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortText: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  productsCount: number;
}

export interface AdminProductCollectionAssignment {
  collectionId: string;
  title: string;
  slug: string;
  sortOrder: number;
}

export interface AdminProductListItem {
  id: string;
  slug: string;
  title: string;
  status: ProductStatus;
  isFeatured: boolean;
  basePrice: number;
  price: number;
  displayCompareAtPrice: number | null;
  discountAmount: number;
  appliedDiscount: AppliedDiscountSummary | null;
  compareAtPrice: number | null;
  currency: string;
  stockQuantity: number;
  categoryId: string | null;
  categoryTitle: string | null;
  updatedAt: string;
  primaryImageUrl: string | null;
}

export interface AdminProductImageItem {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface AdminProductDetail extends AdminProductListItem {
  shortDescription: string | null;
  description: string | null;
  images: AdminProductImageItem[];
  collectionTitles: string[];
  collectionAssignments: AdminProductCollectionAssignment[];
  collectionsCount: number;
  imagesCount: number;
  favoritesCount: number;
  cartItemsCount: number;
  orderItemsCount: number;
}

export interface AdminOrderListItem {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  totalAmount: number;
  currency: string;
  customerDisplayName: string | null;
  customerUsername: string | null;
  createdAt: string;
  itemsCount: number;
  latestPaymentAttemptId: string | null;
}

export interface AdminOrderDetailItem {
  id: string;
  quantity: number;
  productTitle: string;
  productSlug: string | null;
  productImageUrl: string | null;
  unitPrice: number;
  lineTotal: number;
  currency: string;
}

export interface AdminOrderDetail {
  id: string;
  userId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  paymentCompletedAt: string | null;
  paymentLastError: string | null;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  customerDisplayName: string | null;
  customerUsername: string | null;
  customerPhone: string | null;
  shippingAddress: {
    city: string | null;
    addressLine: string | null;
    postalCode: string | null;
  };
  notes: string | null;
  createdAt: string;
  items: AdminOrderDetailItem[];
  paymentAttempts: Array<{
    id: string;
    provider: PaymentProvider;
    status: PaymentStatus;
    amount: number;
    currency: string;
    checkoutUrl: string | null;
    expiresAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
}

export interface AdminDashboardData {
  productsCount: number;
  activeProductsCount: number;
  draftProductsCount: number;
  archivedProductsCount: number;
  categoriesCount: number;
  collectionsCount: number;
  discountsCount: number;
  liveDiscountsCount: number;
  scheduledDiscountsCount: number;
  ordersCount: number;
  pendingOrdersCount: number;
  awaitingPaymentOrdersCount: number;
  paidOrdersCount: number;
}

export interface ProductUpsertInput {
  slug: string;
  title: string;
  shortDescription?: string | null;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  status: ProductStatus;
  isFeatured: boolean;
  stockQuantity: number;
  categoryId?: string | null;
}

export interface ProductImageUpsertInput {
  url: string;
  alt?: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface CategoryUpsertInput {
  title: string;
  slug: string;
  description?: string | null;
  shortText?: string | null;
  isActive: boolean;
  sortOrder: number;
  catalogGroupSlug?: string | null;
  catalogGroupTitle?: string | null;
  catalogGroupDescription?: string | null;
  catalogGroupOrder?: number;
  catalogVisible?: boolean;
  catalogVisual?: string | null;
  catalogGroupArtworkUrl?: string | null;
}

export interface CollectionUpsertInput {
  title: string;
  slug: string;
  description?: string | null;
  shortText?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}
