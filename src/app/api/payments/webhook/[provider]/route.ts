import { NextResponse, type NextRequest } from 'next/server';

import { applyPaymentWebhook } from '@/features/payments';

function getStatusCode(error: string): number {
  if (error === 'unsupported_payment_provider') {
    return 404;
  }
  if (error === 'invalid_payment_webhook') {
    return 400;
  }
  if (error === 'payment_provider_mismatch') {
    return 409;
  }
  if (error === 'not_configured') {
    return 503;
  }
  return 500;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const result = await applyPaymentWebhook(provider, request);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'unknown_payment_webhook_error' },
      { status: getStatusCode(result.error ?? 'unknown_payment_webhook_error') },
    );
  }

  return NextResponse.json({ ok: true });
}
