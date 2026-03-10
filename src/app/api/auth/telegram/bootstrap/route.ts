import { NextResponse } from 'next/server';

import {
  getSessionFeatureMissingEnvMessage,
  getTelegramVerificationMissingEnvMessage,
  isSessionFeatureConfigured,
  isTelegramVerificationConfigured,
  setSessionCookie,
  upsertProfileFromTelegramIdentity,
  verifyTelegramInitData,
} from '@/features/auth';
import { getSupabaseAdminMissingEnvMessage } from '@/lib/supabase';

interface BootstrapBody {
  initDataRaw?: string;
}

export async function POST(request: Request) {
  if (!isTelegramVerificationConfigured() || !isSessionFeatureConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'bootstrap_not_configured',
        error: 'Server session bootstrap is not configured.',
        details: [
          getTelegramVerificationMissingEnvMessage(),
          getSessionFeatureMissingEnvMessage(),
        ],
      },
      { status: 503 },
    );
  }

  let body: BootstrapBody;
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'invalid_request_body', error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const initDataRaw = body.initDataRaw;
  if (!initDataRaw) {
    return NextResponse.json(
      { ok: false, reason: 'init_data_missing', error: 'initDataRaw is required.' },
      { status: 400 },
    );
  }

  const verification = verifyTelegramInitData(initDataRaw);
  if (!verification.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: verification.reason,
        error: `Telegram init data verification failed: ${verification.reason}`,
      },
      { status: 401 },
    );
  }

  const upsertResult = await upsertProfileFromTelegramIdentity(verification.user);
  if (!upsertResult.ok) {
    const statusCode =
      upsertResult.reason === 'supabase_service_role_missing' ? 503 : 500;
    const details =
      upsertResult.reason === 'supabase_service_role_missing'
        ? [getSupabaseAdminMissingEnvMessage()]
        : upsertResult.details;

    console.error('[MainStore] Telegram bootstrap profile upsert failed', {
      reason: upsertResult.reason,
      details: upsertResult.details ?? [],
    });

    return NextResponse.json(
      {
        ok: false,
        reason: upsertResult.reason,
        error: `Profile upsert failed: ${upsertResult.reason}`,
        details,
      },
      { status: statusCode },
    );
  }

  const profile = upsertResult.profile;
  const response = NextResponse.json({
    ok: true,
    profile: {
      id: profile.id,
      role: profile.role,
      displayName: profile.displayName,
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    },
  });

  setSessionCookie(response, {
    profileId: profile.id,
    telegramUserId: profile.telegramUserId ?? verification.user.id,
    role: profile.role,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
  });

  return response;
}
