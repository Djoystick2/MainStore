import 'server-only';

import { createHash } from 'node:crypto';

import { createSupabaseAdminClientOptional } from '@/lib/supabase';
import type { Database } from '@/types/db';

import type { AppSession, CurrentProfile, TelegramIdentity } from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

function toUuidFromTelegramId(telegramUserId: number): string {
  const hex = createHash('sha256')
    .update(`telegram:${telegramUserId}`)
    .digest('hex')
    .slice(0, 32)
    .split('');

  hex[12] = '4';
  const variantNibble = parseInt(hex[16], 16);
  hex[16] = ((variantNibble & 0x3) | 0x8).toString(16);

  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

function normalizeDisplayName(user: TelegramIdentity): string | null {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || null;
}

function profileRowToCurrentProfile(row: ProfileRow): CurrentProfile {
  return {
    id: row.id,
    role: row.role,
    telegramUserId: row.telegram_user_id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

export type UpsertTelegramProfileResult =
  | { ok: true; profile: CurrentProfile }
  | { ok: false; reason: string; details?: string[] };

export async function upsertProfileFromTelegramIdentity(
  user: TelegramIdentity,
): Promise<UpsertTelegramProfileResult> {
  const adminClient = createSupabaseAdminClientOptional();
  if (!adminClient) {
    return { ok: false, reason: 'supabase_service_role_missing' };
  }

  const telegramUserId = user.id;
  const displayName = normalizeDisplayName(user);
  const username = user.username ?? null;
  const avatarUrl = user.photo_url ?? null;

  const existingProfileResult = await adminClient
    .from('profiles')
    .select('id, role, telegram_user_id, display_name, username, avatar_url')
    .eq('telegram_user_id', telegramUserId)
    .maybeSingle();

  if (existingProfileResult.error) {
    return {
      ok: false,
      reason: 'profile_lookup_failed',
      details: [existingProfileResult.error.message],
    };
  }

  const existingProfile = existingProfileResult.data as ProfileRow | null;
  const profileId = existingProfile?.id ?? toUuidFromTelegramId(telegramUserId);

  if (!existingProfile) {
    const email = `tg-${telegramUserId}@mainstore.example.com`;
    const authCreateResult = await adminClient.auth.admin.createUser({
      id: profileId,
      email,
      email_confirm: true,
      user_metadata: {
        telegram_user_id: telegramUserId,
        username,
        display_name: displayName,
      },
      app_metadata: {
        provider: 'telegram-mini-app',
      },
    });

    if (authCreateResult.error) {
      const isAlreadyRegistered =
        authCreateResult.error.message.includes('already') ||
        authCreateResult.error.message.includes('exists');

      if (!isAlreadyRegistered) {
        return {
          ok: false,
          reason: 'auth_user_create_failed',
          details: [authCreateResult.error.message],
        };
      }
    }
  }

  const profilePayload: ProfileInsert = {
    id: profileId,
    role: existingProfile?.role ?? 'user',
    telegram_user_id: telegramUserId,
    display_name: displayName,
    username,
    avatar_url: avatarUrl,
  };
  const profileUpdatePayload: ProfileUpdate = {
    display_name: profilePayload.display_name,
    username: profilePayload.username,
    avatar_url: profilePayload.avatar_url,
  };

  const upsertResult = existingProfile
    ? await adminClient
        .from('profiles')
        .update(profileUpdatePayload as never)
        .eq('id', profileId)
        .select('id, role, telegram_user_id, display_name, username, avatar_url')
        .single()
    : await adminClient
        .from('profiles')
        .insert(profilePayload as never)
        .select('id, role, telegram_user_id, display_name, username, avatar_url')
        .single();
  const typedUpsertResult = upsertResult as {
    data: ProfileRow | null;
    error: { message: string } | null;
  };

  if (typedUpsertResult.error || !typedUpsertResult.data) {
    return {
      ok: false,
      reason: 'profile_upsert_failed',
      details: typedUpsertResult.error?.message
        ? [typedUpsertResult.error.message]
        : undefined,
    };
  }

  return {
    ok: true,
    profile: profileRowToCurrentProfile(typedUpsertResult.data),
  };
}

export async function getProfileBySession(
  session: AppSession | null,
): Promise<CurrentProfile | null> {
  if (!session) {
    return null;
  }

  const adminClient = createSupabaseAdminClientOptional();
  if (!adminClient) {
    return {
      id: session.profileId,
      role: session.role,
      telegramUserId: session.telegramUserId,
      displayName: session.displayName,
      username: session.username,
      avatarUrl: session.avatarUrl,
    };
  }

  const result = await adminClient
    .from('profiles')
    .select('id, role, telegram_user_id, display_name, username, avatar_url')
    .eq('id', session.profileId)
    .maybeSingle();

  if (result.error || !result.data) {
    return {
      id: session.profileId,
      role: session.role,
      telegramUserId: session.telegramUserId,
      displayName: session.displayName,
      username: session.username,
      avatarUrl: session.avatarUrl,
    };
  }

  return profileRowToCurrentProfile(result.data as ProfileRow);
}
