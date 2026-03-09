import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/db';

import { getSupabaseConfig } from './env';

export function createSupabaseServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabaseConfig();

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
