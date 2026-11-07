import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Detect placeholder credentials — used to skip real Supabase calls in dev
export const isSupabasePlaceholder =
  !supabaseUrl ||
  supabaseUrl.includes('placeholder') ||
  supabaseUrl.includes('<your') ||
  !supabaseAnonKey ||
  supabaseAnonKey.includes('<your');

if (isSupabasePlaceholder) {
  console.warn(
    '[Snyprr] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env — auth and API calls will not work. Dev bypass active.'
  );
}

/**
 * Public Supabase client — uses the anon key.
 * Row-Level Security is enforced server-side; never put the service_role key here.
 *
 * When credentials are placeholders, we still create the client (Supabase requires
 * it at import time) but all real auth calls are skipped by the dev bypass in
 * useAuthStore.initialize().
 */
export const supabase = createClient(
  isSupabasePlaceholder ? 'https://example.supabase.co' : supabaseUrl,
  isSupabasePlaceholder ? 'placeholder-anon-key' : supabaseAnonKey,
  {
    auth: {
      persistSession: !isSupabasePlaceholder,
      autoRefreshToken: !isSupabasePlaceholder,
      detectSessionInUrl: true,
    },
  },
);

/**
 * Convenience: get the current JWT access token for Authorization headers.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  if (isSupabasePlaceholder) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
