import { NextResponse, type NextRequest } from 'next/server';

import { getRequestUserContext } from '@/features/auth';
import { repeatOrderForProfile } from '@/features/orders/data';

function getStatusCode(error: string): number {
  if (error === 'unauthorized') {
    return 401;
  }
  if (error === 'not_configured') {
    return 503;
  }
  if (error === 'order_not_found') {
    return 404;
  }
  if (error === 'no_reorderable_items') {
    return 409;
  }

  return 500;
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const { profile } = await getRequestUserContext(_request);
  if (!profile) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { orderId } = await context.params;
  const result = await repeatOrderForProfile(profile.id, orderId);

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? 'reorder_failed' },
      { status: getStatusCode(result.error ?? 'reorder_failed') },
    );
  }

  return NextResponse.json({
    ok: true,
    addedItemsCount: result.addedItemsCount ?? 0,
    unavailableItemsCount: result.unavailableItemsCount ?? 0,
  });
}
