import { NextResponse, type NextRequest } from 'next/server';

import { getRequestUserContext } from '@/features/auth';
import { retryOrderPaymentForProfile } from '@/features/payments';

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
  if (['order_not_found', 'payment_attempt_not_found'].includes(error)) {
    return 404;
  }
  if (['order_cancelled', 'already_paid'].includes(error)) {
    return 409;
  }

  return 500;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { profile } = await getRequestUserContext(request);
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  const payload = (await request.json().catch(() => null)) as
    | { idempotencyKey?: string | null }
    | null;

  const result = await retryOrderPaymentForProfile(profile.id, orderId, {
    appOrigin: request.nextUrl.origin,
    idempotencyKey: payload?.idempotencyKey ?? null,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'unknown_retry_payment_error' },
      { status: getStatusCode(result.error ?? 'unknown_retry_payment_error') },
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
