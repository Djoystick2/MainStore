import { NextResponse, type NextRequest } from 'next/server';

import { getAdminRequestAccess } from '@/features/admin';
import { createDiscount, type DiscountUpsertInput } from '@/features/discounts';
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

export async function POST(request: NextRequest) {
  const access = await getAdminRequestAccess(request);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: 'admin_access_denied' },
      { status: getAccessStatusCode(access.reason ?? 'forbidden') },
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

  const result = await createDiscount(payload);
  if (!result.ok) {
    const status =
      result.error === 'not_configured'
        ? 503
        : result.error === 'discount_target_not_found'
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

  return NextResponse.json({ ok: true, id: result.data?.id });
}
