import { supabaseAdmin } from '../config/supabaseClient.js';
import type { AccountStatus } from '../types/database.types.js';
import { AppError } from '../middleware/error.middleware.js';

export class AdminService {
  /**
   * List all user profiles with their roles and status.
   */
  static async listUsers(limit = 50, offset = 0) {
    // profiles.id -> auth.users.id; user_roles.user_id -> auth.users.id.
    // PostgREST cannot infer a direct profiles<->user_roles relationship because there
    // is no FK between those two public tables. Fetch separately and merge in memory.
    const { data: profiles, error, count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new AppError(`Failed to list users: ${error.message}`, 400, error);
    }

    // Fetch roles for all returned profile IDs in a single query
    const profileIds = profiles.map((p: any) => p.id);
    const { data: userRolesData } = profileIds.length
      ? await supabaseAdmin
          .from('user_roles')
          .select('user_id, role:roles(id, name, description)')
          .in('user_id', profileIds)
      : { data: [] };

    // Group roles by user_id
    const rolesByUser: Record<string, string[]> = {};
    for (const ur of (userRolesData ?? []) as any[]) {
      const uid = ur.user_id;
      if (!rolesByUser[uid]) rolesByUser[uid] = [];
      if (ur.role?.name) rolesByUser[uid].push(ur.role.name);
    }

    const formatted = profiles.map((p: any) => ({
      ...p,
      roles: rolesByUser[p.id] || [],
    }));

    return {
      users: formatted,
      total: count || 0,
      limit,
      offset,
    };
  }

  /**
   * Assign a role to a user.
   */
  static async assignRole(userId: string, roleName: string) {
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, name')
      .eq('name', roleName)
      .single();

    if (roleError || !role) {
      throw new AppError(`Role '${roleName}' not found`, 404);
    }

    const { error: insertError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: userId,
        role_id: role.id,
      });

    if (insertError) {
      throw new AppError(`Failed to assign role: ${insertError.message}`, 400, insertError);
    }

    // If role is trader, ensure a trader_profile row exists
    if (roleName === 'trader') {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();

      await supabaseAdmin
        .from('trader_profiles')
        .upsert({
          user_id: userId,
          display_name: profile?.full_name || 'Trading Desk Specialist',
          is_active: true,
        }, { onConflict: 'user_id' });
    }

    return { success: true, message: `Role '${roleName}' assigned to user` };
  }

  /**
   * Remove a role from a user.
   */
  static async removeRole(userId: string, roleName: string) {
    const { data: role, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single();

    if (roleError || !role) {
      throw new AppError(`Role '${roleName}' not found`, 404);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', role.id);

    if (deleteError) {
      throw new AppError(`Failed to remove role: ${deleteError.message}`, 400, deleteError);
    }

    return { success: true, message: `Role '${roleName}' removed from user` };
  }

  /**
   * Update user account status (e.g. SUSPENDED, ACTIVE, BLOCKED).
   */
  static async updateUserStatus(userId: string, status: AccountStatus) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        account_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update account status: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * System-wide platform overview statistics.
   */
  static async getPlatformStats() {
    const [
      { count: usersCount },
      { count: signalsCount },
      { count: activeSignalsCount },
      { count: tradersCount },
      { count: subscriptionsCount },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('trading_signals').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('trading_signals').select('*', { count: 'exact', head: true }).eq('status', 'PUBLISHED'),
      supabaseAdmin.from('trader_profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    ]);

    return {
      total_users: usersCount || 0,
      total_signals: signalsCount || 0,
      active_published_signals: activeSignalsCount || 0,
      registered_traders: tradersCount || 0,
      active_subscriptions: subscriptionsCount || 0,
    };
  }
}
