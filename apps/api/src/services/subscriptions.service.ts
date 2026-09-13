import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';
import { AppError } from '../middleware/error.middleware.js';

export class SubscriptionsService {
  /**
   * List all active subscription plans (Public/Subscriber access).
   */
  static async getPlans(supabase: SupabaseClient<Database>) {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      throw new AppError(`Failed to fetch subscription plans: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Get all subscriptions for current user.
   */
  static async getMySubscriptions(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        plan:subscription_plans (
          id,
          name,
          description,
          price,
          currency,
          billing_interval
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch user subscriptions: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Get payment records for current user.
   */
  static async getMyPayments(supabase: SupabaseClient<Database>, userId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new AppError(`Failed to fetch payment records: ${error.message}`, 400, error);
    }
    return data;
  }
}
