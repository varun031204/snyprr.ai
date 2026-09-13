import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';
import { AppError } from '../middleware/error.middleware.js';

export interface UpdateProfileInput {
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
}

export class ProfilesService {
  /**
   * Fetch current authenticated user's profile, roles, and active subscription.
   */
  static async getMyProfile(supabase: SupabaseClient<Database>, userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      throw new AppError(`Failed to fetch profile: ${profileError.message}`, 500, profileError);
    }
    if (!profile) {
      throw new AppError('Profile not found for this user', 404);
    }

    // Fetch user roles — use explicit column path to avoid PostgREST relationship ambiguity
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', userId);

    if (rolesError) {
      // Non-fatal: log and continue with empty roles
      console.warn('[getMyProfile] Could not fetch user_roles:', rolesError.message);
    }

    // Fetch active subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        status,
        started_at,
        expires_at,
        plan:subscription_plans (
          id,
          name,
          billing_interval,
          price,
          currency
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    const roleNames: string[] = (userRoles ?? [])
      .map((ur: any) => ur.roles?.name)
      .filter(Boolean);

    return {
      ...profile,
      roles: roleNames,
      subscription: subscription || null,
    };
  }


  /**
   * Update current authenticated user's profile.
   */
  static async updateMyProfile(
    supabase: SupabaseClient<Database>,
    userId: string,
    input: UpdateProfileInput
  ) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
        ...(input.username !== undefined ? { username: input.username } : {}),
        ...(input.avatar_url !== undefined ? { avatar_url: input.avatar_url } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update profile: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Get trader profile by ID.
   */
  static async getTraderProfile(supabase: SupabaseClient<Database>, traderId: string) {
    const { data, error } = await supabase
      .from('trader_profiles')
      .select(`
        id,
        user_id,
        display_name,
        bio,
        is_active,
        created_at
      `)
      .eq('id', traderId)
      .single();

    if (error || !data) {
      throw new AppError(`Trader profile not found: ${error?.message || ''}`, 404, error);
    }
    return data;
  }

  /**
   * Get own trader profile.
   */
  static async getMyTraderProfile(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from('trader_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new AppError(`Failed to get trader profile: ${error.message}`, 400, error);
    }
    if (!data) {
      throw new AppError('Trader profile not found for this user account', 404);
    }
    return data;
  }

  /**
   * List all active trader profiles.
   */
  static async listTraders(supabase: SupabaseClient<Database>, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('trader_profiles')
      .select('id, user_id, display_name, bio, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(`Failed to list traders: ${error.message}`, 400, error);
    }
    return data;
  }
}
