import { NextResponse, type NextRequest } from 'next/server';

import { getRequestUserContext } from '@/features/auth';
import { startCheckoutPaymentForProfile, type CheckoutPayload } from '@/features/payments';

function getStatusCode(error: string): number {
  if (error === 'unauthorized') {
    return 401;
  }
  if (error === 'not_configured') {
    return 503;
  }
  if (error === 'payment_provider_not_supported') {
    return 503;
  }
  if (
    error === 'invalid_input' ||
    error === 'full_name_required' ||
    error === 'full_name_too_short' ||
    error === 'phone_required' ||
    error === 'phone_invalid' ||
    error === 'city_required' ||
    error === 'city_too_short' ||
    error === 'address_required' ||
    error === 'address_too_short' ||
    error === 'postal_code_invalid'
  ) {
    return 400;
  }
  if (
    ['empty_cart', 'unavailable_items', 'mixed_currency', 'order_cancelled', 'already_paid'].includes(
      error,
    )
  ) {
    return 409;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  const { profile } = await getRequestUserContext(request);
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let payload: CheckoutPayload & { idempotencyKey?: string | null };
  try {
    payload = (await request.json()) as CheckoutPayload & { idempotencyKey?: string | null };
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_request' }, { status: 400 });
  }

  const result = await startCheckoutPaymentForProfile(profile.id, payload, {
    appOrigin: request.nextUrl.origin,
    idempotencyKey: payload.idempotencyKey,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'unknown_payment_start_error' },
      { status: getStatusCode(result.error ?? 'unknown_payment_start_error') },
    );
  }

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    paymentAttemptId: result.paymentAttemptId,
    paymentStatus: result.paymentStatus,
    paymentProvider: result.paymentProvider,
    checkoutUrl: result.checkoutUrl,
    totalCents: result.totalCents,
    currency: result.currency,
  });
}
