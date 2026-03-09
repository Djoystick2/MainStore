'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/db';

import { getSupabaseConfig } from './env';

let browserClient: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabaseConfig();

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return browserClient;
}
