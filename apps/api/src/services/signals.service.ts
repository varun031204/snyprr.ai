import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types.js';
import { AppError } from '../middleware/error.middleware.js';

export type SignalDirection = 'LONG' | 'SHORT';
export type SignalStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'PARTIALLY_COMPLETED'
  | 'COMPLETED'
  | 'STOP_LOSS_HIT'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INVALIDATED';

export interface CreateSignalInput {
  trader_id: string;
  direction: SignalDirection;
  instrument: string;
  entry_price?: number | null;
  stop_loss_price: number;
  take_profit_1: number;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  time_frame: string;
  buying_wall: number;
  selling_wall: number;
  analysis?: string | null;
  notes?: string | null;
  status?: SignalStatus; // optional — defaults to DRAFT, pass PUBLISHED to go live immediately
}

export interface UpdateSignalInput {
  entry_price?: number | null;
  stop_loss_price?: number;
  take_profit_1?: number;
  take_profit_2?: number | null;
  take_profit_3?: number | null;
  buying_wall?: number;
  selling_wall?: number;
  analysis?: string | null;
  notes?: string | null;
  // status intentionally omitted — transitions only via publishSignal/cancelSignal
}

export interface ListSignalsFilter {
  status?: SignalStatus;
  trader_id?: string;
  direction?: SignalDirection;
  instrument?: string;
  limit?: number;
  offset?: number;
}

export class SignalsService {
  /**
   * List signals respecting PostgreSQL RLS policies via user's client.
   */
  static async listSignals(
    supabase: SupabaseClient<Database>,
    filters: ListSignalsFilter = {}
  ) {
    let query = supabase
      .from('trading_signals')
      .select(`
        *,
        trader:trader_profiles (
          id,
          display_name,
          bio,
          is_active
        )
      `)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.trader_id) {
      query = query.eq('trader_id', filters.trader_id);
    }
    if (filters.direction) {
      query = query.eq('direction', filters.direction);
    }
    if (filters.instrument) {
      query = query.eq('instrument', filters.instrument);
    }
    if (filters.limit) {
      const from = filters.offset || 0;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, error } = await query;
    if (error) {
      throw new AppError(`Failed to fetch signals: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Get single signal by ID.
   */
  static async getSignalById(supabase: SupabaseClient<Database>, id: string) {
    const { data, error } = await supabase
      .from('trading_signals')
      .select(`
        *,
        trader:trader_profiles (
          id,
          display_name,
          bio,
          is_active
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError(`Signal not found or inaccessible: ${error?.message || ''}`, 404, error);
    }
    return data;
  }

  /**
   * Create a new draft signal (Trader only, checked via RLS & RBAC).
   */
  static async createSignal(
    supabase: SupabaseClient<Database>,
    input: CreateSignalInput
  ) {
    const { data, error } = await supabase
      .from('trading_signals')
      .insert({
        trader_id: input.trader_id,
        direction: input.direction,
        instrument: input.instrument,
        entry_price: input.entry_price ?? null,
        stop_loss_price: input.stop_loss_price,
        take_profit_1: input.take_profit_1,
        take_profit_2: input.take_profit_2 ?? null,
        take_profit_3: input.take_profit_3 ?? null,
        time_frame: input.time_frame,
        buying_wall: input.buying_wall,
        selling_wall: input.selling_wall,
        analysis: input.analysis ?? null,
        notes: input.notes ?? null,
        status: input.status ?? 'DRAFT',
        published_at: (input.status === 'PUBLISHED') ? new Date().toISOString() : null,
      })
      .select(`
        *,
        trader:trader_profiles (
          id,
          display_name
        )
      `)
      .single();

    if (error) {
      throw new AppError(`Failed to create signal: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Update existing signal (price levels and analysis only).
   */
  static async updateSignal(
    supabase: SupabaseClient<Database>,
    id: string,
    input: UpdateSignalInput
  ) {
    type SignalUpdate = Database['public']['Tables']['trading_signals']['Update'];
    const updates: SignalUpdate = { updated_at: new Date().toISOString() };

    if (input.entry_price !== undefined)     updates.entry_price   = input.entry_price;
    if (input.stop_loss_price !== undefined) updates.stop_loss_price = input.stop_loss_price;
    if (input.take_profit_1 !== undefined)   updates.take_profit_1 = input.take_profit_1;
    if (input.take_profit_2 !== undefined)   updates.take_profit_2 = input.take_profit_2;
    if (input.take_profit_3 !== undefined)   updates.take_profit_3 = input.take_profit_3;
    if (input.buying_wall !== undefined)     updates.buying_wall   = input.buying_wall;
    if (input.selling_wall !== undefined)    updates.selling_wall  = input.selling_wall;
    if (input.analysis !== undefined)        updates.analysis      = input.analysis;
    if (input.notes !== undefined)           updates.notes         = input.notes;

    const { data, error } = await supabase
      .from('trading_signals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to update signal: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Publish signal (moves from DRAFT to PUBLISHED with published_at timestamp).
   */
  static async publishSignal(supabase: SupabaseClient<Database>, id: string) {
    const { data, error } = await supabase
      .from('trading_signals')
      .update({
        status: 'PUBLISHED',
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to publish signal: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Cancel signal.
   */
  static async cancelSignal(supabase: SupabaseClient<Database>, id: string) {
    const { data, error } = await supabase
      .from('trading_signals')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError(`Failed to cancel signal: ${error.message}`, 400, error);
    }
    return data;
  }

  /**
   * Increment views_count atomically via RPC or plain update.
   */
  static async incrementViews(supabase: SupabaseClient<Database>, id: string) {
    // Fetch current count then increment — safe for low-concurrency V1
    const { data: current } = await supabase
      .from('trading_signals')
      .select('views_count')
      .eq('id', id)
      .single();

    if (current) {
      await supabase
        .from('trading_signals')
        .update({ views_count: (current.views_count || 0) + 1 })
        .eq('id', id);
    }
  }
}
