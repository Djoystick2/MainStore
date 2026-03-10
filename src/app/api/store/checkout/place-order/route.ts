import { NextResponse, type NextRequest } from 'next/server';

import { getRequestUserContext } from '@/features/auth';
import { startCheckoutPaymentForProfile, type CheckoutPayload } from '@/features/payments';

function getStatusCode(status: string): number {
  if (status === 'unauthorized') {
    return 401;
  }
  if (status === 'not_configured') {
    return 503;
  }
  if (status === 'payment_provider_not_supported') {
    return 503;
  }
  if (status === 'invalid_input') {
    return 400;
  }
  if (
    status === 'empty_cart' ||
    status === 'unavailable_items' ||
    status === 'mixed_currency' ||
    status === 'order_cancelled' ||
    status === 'already_paid'
  ) {
    return 409;
  }
  return 500;
}

export async function POST(request: NextRequest) {
  const { profile } = await getRequestUserContext(request);
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  let payload: CheckoutPayload;
  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'invalid_request' },
      { status: 400 },
    );
  }

  const result = await startCheckoutPaymentForProfile(profile.id, payload, {
    appOrigin: request.nextUrl.origin,
    idempotencyKey: (payload as CheckoutPayload & { idempotencyKey?: string | null }).idempotencyKey,
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
