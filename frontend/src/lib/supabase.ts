import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Snyprr] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in frontend/.env — auth and API calls will not work.'
  );
}

/**
 * Public Supabase client — uses the anon key.
 * Row-Level Security is enforced server-side; never put the service_role key here.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Convenience: get the current JWT access token for Authorization headers.
 * Returns null if the user is not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
