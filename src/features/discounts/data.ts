import 'server-only';

import {
  createSupabaseAdminClientOptional,
  getSupabaseAdminMissingEnvMessage,
} from '@/lib/supabase';
import type { Database } from '@/types/db';

import type { AdminDiscountItem } from './types';

type DiscountRow = Database['public']['Tables']['discounts']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type CollectionRow = Database['public']['Tables']['collections']['Row'];

interface AdminDiscountsResult {
  status: 'ok' | 'not_configured' | 'error';
  discounts: AdminDiscountItem[];
  message?: string;
}

function toPublicDataErrorMessage(baseMessage: string, details: string): string {
  if (process.env.NODE_ENV === 'development') {
    return `${baseMessage} Details: ${details}`;
  }
  return baseMessage;
}

function getCurrentState(row: Pick<DiscountRow, 'is_active' | 'starts_at' | 'ends_at'>): AdminDiscountItem['currentState'] {
  if (!row.is_active) {
    return 'inactive';
  }

  const now = Date.now();
  if (row.starts_at && new Date(row.starts_at).getTime() > now) {
    return 'scheduled';
  }
  if (row.ends_at && new Date(row.ends_at).getTime() < now) {
    return 'expired';
  }
  return 'live';
}

export async function getAdminDiscounts(): Promise<AdminDiscountsResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return {
      status: 'not_configured',
      discounts: [],
      message: toPublicDataErrorMessage(
        'Admin discounts are temporarily unavailable.',
        getSupabaseAdminMissingEnvMessage(),
      ),
    };
  }

  const discountsResult = await client
    .from('discounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (discountsResult.error) {
    return {
      status: 'error',
      discounts: [],
      message: toPublicDataErrorMessage(
        'Could not load discounts right now.',
        discountsResult.error.message,
      ),
    };
  }

  const discountRows = (discountsResult.data ?? []) as DiscountRow[];
  const productIds = discountRows
    .filter((row) => row.scope === 'product')
    .map((row) => row.target_id);
  const categoryIds = discountRows
    .filter((row) => row.scope === 'category')
    .map((row) => row.target_id);
  const collectionIds = discountRows
    .filter((row) => row.scope === 'collection')
    .map((row) => row.target_id);

  const [productsResult, categoriesResult, collectionsResult] = await Promise.all([
    productIds.length > 0
      ? client.from('products').select('id, title').in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? client.from('categories').select('id, title').in('id', categoryIds)
      : Promise.resolve({ data: [], error: null }),
    collectionIds.length > 0
      ? client.from('collections').select('id, title').in('id', collectionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsResult.error || categoriesResult.error || collectionsResult.error) {
    return {
      status: 'error',
      discounts: [],
      message: toPublicDataErrorMessage(
        'Could not load discount targets right now.',
        productsResult.error?.message ??
          categoriesResult.error?.message ??
          collectionsResult.error?.message ??
          'Unknown discount target error.',
      ),
    };
  }

  const targetTitles = new Map<string, string>();
  ((productsResult.data ?? []) as Array<Pick<ProductRow, 'id' | 'title'>>).forEach((row) => {
    targetTitles.set(row.id, row.title);
  });
  ((categoriesResult.data ?? []) as Array<Pick<CategoryRow, 'id' | 'title'>>).forEach((row) => {
    targetTitles.set(row.id, row.title);
  });
  ((collectionsResult.data ?? []) as Array<Pick<CollectionRow, 'id' | 'title'>>).forEach((row) => {
    targetTitles.set(row.id, row.title);
  });

  return {
    status: 'ok',
    discounts: discountRows.map((row) => ({
      id: row.id,
      scope: row.scope,
      targetId: row.target_id,
      targetTitle: targetTitles.get(row.target_id) ?? 'Missing target',
      title: row.title,
      type: row.type,
      value: Number(row.value) || 0,
      isActive: row.is_active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      currentState: getCurrentState(row),
    })),
  };
}
