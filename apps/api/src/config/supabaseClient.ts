import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';
import type { Database } from '../types/database.types.js';

const SUPABASE_URL = env.SUPABASE_URL;
const ANON_KEY = env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Trusted server-side operations only.
 * Bypasses row-level security. Never expose to frontend.
 */
export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Forwards the caller's JWT so PostgreSQL RLS policies apply per request.
 * Every user query uses this client to strictly obey PostgreSQL Row Level Security.
 * When no token is provided (unauthenticated/public requests), uses anon key auth
 * without an Authorization override — sending an empty Bearer header is rejected by
 * Supabase's PostgREST with PGRST301.
 */
export function supabaseForUser(accessToken: string): SupabaseClient<Database> {
  if (!accessToken) {
    // Unauthenticated: use anon key, no Authorization header override.
    // RLS policies that allow `true` (public read) will pass; private rows are filtered out.
    return createClient<Database>(SUPABASE_URL, ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
