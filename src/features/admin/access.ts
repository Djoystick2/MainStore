import 'server-only';

import type { NextRequest } from 'next/server';

import { getCurrentUserContext, getRequestUserContext } from '@/features/auth';

export type AdminAccessReason = 'no_session' | 'forbidden';

export interface AdminAccessResult {
  ok: boolean;
  reason?: AdminAccessReason;
}

export function hasAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

export async function getAdminPageAccess(): Promise<AdminAccessResult> {
  const { profile } = await getCurrentUserContext();

  if (!profile) {
    return { ok: false, reason: 'no_session' };
  }

  if (!hasAdminRole(profile.role)) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true };
}

export async function getAdminRequestAccess(
  request: NextRequest,
): Promise<AdminAccessResult> {
  const { profile } = await getRequestUserContext(request);

  if (!profile) {
    return { ok: false, reason: 'no_session' };
  }

  if (!hasAdminRole(profile.role)) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true };
}
