import { NextResponse, type NextRequest } from 'next/server';

import { getAdminRequestAccess } from '@/features/admin';
import { deleteDiscount, type DiscountUpsertInput, updateDiscount } from '@/features/discounts';
import { getSupabaseAdminMissingEnvMessage } from '@/lib/supabase';

function getAccessStatusCode(reason: string): number {
  return reason === 'no_session' ? 401 : 403;
}

function isDiscountPayload(value: unknown): value is DiscountUpsertInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.scope === 'string' &&
    typeof record.targetId === 'string' &&
    typeof record.title === 'string' &&
    typeof record.type === 'string' &&
    typeof record.value === 'number' &&
    typeof record.isActive === 'boolean'
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ discountId: string }> },
) {
  const access = await getAdminRequestAccess(request);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: 'admin_access_denied' },
      { status: getAccessStatusCode(access.reason ?? 'forbidden') },
    );
  }

  const { discountId } = await params;
  if (!discountId) {
    return NextResponse.json(
      { ok: false, error: 'discount_id_required' },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_request_body' },
      { status: 400 },
    );
  }

  if (!isDiscountPayload(payload)) {
    return NextResponse.json(
      { ok: false, error: 'invalid_discount_payload' },
      { status: 400 },
    );
  }

  const result = await updateDiscount(discountId, payload);
  if (!result.ok) {
    const status =
      result.error === 'not_configured'
        ? 503
        : result.error === 'discount_not_found' || result.error === 'discount_target_not_found'
          ? 404
          : 400;

    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        details: status === 503 ? [getSupabaseAdminMissingEnvMessage()] : undefined,
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ discountId: string }> },
) {
  const access = await getAdminRequestAccess(request);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: 'admin_access_denied' },
      { status: getAccessStatusCode(access.reason ?? 'forbidden') },
    );
  }

  const { discountId } = await params;
  if (!discountId) {
    return NextResponse.json(
      { ok: false, error: 'discount_id_required' },
      { status: 400 },
    );
  }

  const result = await deleteDiscount(discountId);
  if (!result.ok) {
    const status = result.error === 'not_configured' ? 503 : result.error === 'discount_not_found' ? 404 : 400;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        details: status === 503 ? [getSupabaseAdminMissingEnvMessage()] : undefined,
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}
