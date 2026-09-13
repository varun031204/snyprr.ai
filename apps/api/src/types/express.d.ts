import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      supabase?: SupabaseClient<Database>;
      token?: string;
    }
  }
}

export {};
