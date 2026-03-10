import 'server-only';

import { createSupabaseAdminClientOptional } from '@/lib/supabase';
import type { Database, DiscountScope, DiscountType } from '@/types/db';

import type { DiscountUpsertInput } from './types';

type DiscountRow = Database['public']['Tables']['discounts']['Row'];

export interface DiscountMutationResult<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}

function normalizeText(value: string | null | undefined, maxLength: number): string {
  return (value ?? '').trim().slice(0, maxLength);
}

function normalizeTimestamp(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapDiscountError(error: string | null | undefined, fallback: string): string {
  if (!error) {
    return fallback;
  }

  if (error.includes('discounts_unique_scope_target')) {
    return 'discount_target_conflict';
  }

  return fallback;
}

function isScope(value: string): value is DiscountScope {
  return value === 'product' || value === 'category' || value === 'collection';
}

function isType(value: string): value is DiscountType {
  return value === 'fixed' || value === 'percentage';
}

function validateDiscountInput(input: DiscountUpsertInput): string | null {
  if (!isScope(input.scope)) {
    return 'invalid_discount_scope';
  }
  if (!normalizeText(input.targetId, 80)) {
    return 'discount_target_required';
  }
  if (!normalizeText(input.title, 140)) {
    return 'discount_title_required';
  }
  if (!isType(input.type)) {
    return 'invalid_discount_type';
  }
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return 'invalid_discount_value';
  }
  if (input.type === 'percentage' && input.value > 100) {
    return 'invalid_discount_percentage';
  }

  const startsAt = normalizeTimestamp(input.startsAt);
  const endsAt = normalizeTimestamp(input.endsAt);
  if (input.startsAt && !startsAt) {
    return 'invalid_discount_starts_at';
  }
  if (input.endsAt && !endsAt) {
    return 'invalid_discount_ends_at';
  }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    return 'invalid_discount_schedule';
  }

  return null;
}

async function ensureTargetExists(scope: DiscountScope, targetId: string): Promise<boolean> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return false;
  }

  const table =
    scope === 'product' ? 'products' : scope === 'category' ? 'categories' : 'collections';

  const result = await client.from(table).select('id').eq('id', targetId).maybeSingle();
  return !result.error && Boolean(result.data);
}

async function validateFixedDiscountAgainstTarget(
  scope: DiscountScope,
  targetId: string,
  value: number,
): Promise<string | null> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return 'not_configured';
  }

  if (scope === 'product') {
    const result = await client
      .from('products')
      .select('price')
      .eq('id', targetId)
      .maybeSingle();

    if (result.error || !result.data) {
      return 'discount_target_not_found';
    }

    const price = Number((result.data as { price: number }).price) || 0;
    return value > price ? 'discount_value_exceeds_target_price' : null;
  }

  if (scope === 'category') {
    const result = await client
      .from('products')
      .select('price, currency')
      .eq('category_id', targetId)
      .order('price', { ascending: true });

    if (result.error) {
      return 'discount_target_validation_failed';
    }

    const rows = (result.data ?? []) as Array<{ price: number; currency: string }>;
    if (rows.length === 0) {
      return 'discount_target_has_no_products';
    }

    const currencies = new Set(rows.map((row) => row.currency));
    if (currencies.size > 1) {
      return 'discount_target_mixed_currency';
    }

    const lowestPrice = Number(rows[0]?.price ?? 0);
    if (!lowestPrice) {
      return 'discount_target_has_no_products';
    }

    return value > lowestPrice ? 'discount_value_exceeds_target_price' : null;
  }

  const result = await client
    .from('collection_items')
    .select('products!inner(price, currency)')
    .eq('collection_id', targetId);

  if (result.error) {
    return 'discount_target_validation_failed';
  }

  const linkedPrices = (result.data ?? [])
    .map((row) => {
      const products = (row as { products?: { price?: number } | Array<{ price?: number }> }).products;
      if (Array.isArray(products)) {
        return {
          price: Number(products[0]?.price ?? 0),
          currency: (products[0] as { currency?: string } | undefined)?.currency ?? null,
        };
      }
      return {
        price: Number(products?.price ?? 0),
        currency: (products as { currency?: string } | undefined)?.currency ?? null,
      };
    })
    .filter((entry) => Number.isFinite(entry.price) && entry.price > 0);

  if (linkedPrices.length === 0) {
    return 'discount_target_has_no_products';
  }

  const currencies = new Set(linkedPrices.map((entry) => entry.currency).filter(Boolean));
  if (currencies.size > 1) {
    return 'discount_target_mixed_currency';
  }

  const minimumPrice = Math.min(...linkedPrices.map((entry) => entry.price));
  return value > minimumPrice ? 'discount_value_exceeds_target_price' : null;
}

async function validateTargetRules(input: DiscountUpsertInput): Promise<string | null> {
  const targetExists = await ensureTargetExists(input.scope, input.targetId);
  if (!targetExists) {
    return 'discount_target_not_found';
  }

  if (input.type === 'fixed') {
    return validateFixedDiscountAgainstTarget(input.scope, input.targetId, input.value);
  }

  return null;
}

export async function createDiscount(
  input: DiscountUpsertInput,
): Promise<DiscountMutationResult<{ id: string }>> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateDiscountInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const targetValidationError = await validateTargetRules(input);
  if (targetValidationError) {
    return { ok: false, error: targetValidationError };
  }

  const result = await client
    .from('discounts')
    .insert(
      {
        scope: input.scope,
        target_id: input.targetId,
        title: normalizeText(input.title, 140),
        type: input.type,
        value: input.value,
        is_active: input.isActive,
        starts_at: normalizeTimestamp(input.startsAt),
        ends_at: normalizeTimestamp(input.endsAt),
      } as never,
    )
    .select('id')
    .single();

  const typedResult = result as {
    data: Pick<DiscountRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDiscountError(typedResult.error?.message, 'create_discount_failed'),
    };
  }

  return { ok: true, data: { id: typedResult.data.id } };
}

export async function updateDiscount(
  discountId: string,
  input: DiscountUpsertInput,
): Promise<DiscountMutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const validationError = validateDiscountInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const targetValidationError = await validateTargetRules(input);
  if (targetValidationError) {
    return { ok: false, error: targetValidationError };
  }

  const result = await client
    .from('discounts')
    .update(
      {
        scope: input.scope,
        target_id: input.targetId,
        title: normalizeText(input.title, 140),
        type: input.type,
        value: input.value,
        is_active: input.isActive,
        starts_at: normalizeTimestamp(input.startsAt),
        ends_at: normalizeTimestamp(input.endsAt),
      } as never,
    )
    .eq('id', discountId)
    .select('id')
    .maybeSingle();

  const typedResult = result as {
    data: Pick<DiscountRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return {
      ok: false,
      error: mapDiscountError(typedResult.error?.message, 'discount_not_found'),
    };
  }

  return { ok: true };
}

export async function deleteDiscount(discountId: string): Promise<DiscountMutationResult> {
  const client = createSupabaseAdminClientOptional();
  if (!client) {
    return { ok: false, error: 'not_configured' };
  }

  const result = await client
    .from('discounts')
    .delete()
    .eq('id', discountId)
    .select('id')
    .maybeSingle();

  const typedResult = result as {
    data: Pick<DiscountRow, 'id'> | null;
    error: { message: string } | null;
  };

  if (typedResult.error || !typedResult.data) {
    return { ok: false, error: typedResult.error?.message || 'discount_not_found' };
  }

  return { ok: true };
}
