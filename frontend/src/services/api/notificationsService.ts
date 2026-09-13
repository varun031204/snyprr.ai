/**
 * notificationsService.ts
 * Real Supabase-backed implementation of INotificationApi.
 * Queries the `notifications` table directly via the RLS-scoped client.
 */

import type { NotificationItem } from '../../types';
import type { INotificationApi } from '../api/apiClient';
import type { ApiResponse } from './types';
import { supabase } from '../../lib/supabase';

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata?: Record<string, unknown> | null;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

function toFrontendNotification(n: BackendNotification): NotificationItem {
  const validTypes: NotificationItem['type'][] = [
    'PREDICTION_PUBLISHED',
    'PREDICTION_STATUS_CHANGE',
    'NEW_FOLLOWER',
    'SUBSCRIPTION_UPDATE',
    'SYSTEM',
  ];
  const type: NotificationItem['type'] = validTypes.includes(n.type as NotificationItem['type'])
    ? (n.type as NotificationItem['type'])
    : 'SYSTEM';

  return {
    id: n.id,
    userId: n.user_id,
    type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class NotificationsApiService implements INotificationApi {
  async getNotifications(): Promise<ApiResponse<NotificationItem[]>> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // If table doesn't exist yet or RLS blocks, return empty gracefully
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }

    return {
      success: true,
      data: (data ?? []).map(toFrontendNotification),
      timestamp: new Date().toISOString(),
    };
  }

  async markAsRead(id: string): Promise<ApiResponse<void>> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      // Non-fatal — optimistic UI already updated
      console.warn('[notificationsService] markAsRead failed:', error.message);
    }

    return { success: true, data: undefined, timestamp: new Date().toISOString() };
  }

  async markAllAsRead(): Promise<ApiResponse<void>> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false);

    if (error) {
      console.warn('[notificationsService] markAllAsRead failed:', error.message);
    }

    return { success: true, data: undefined, timestamp: new Date().toISOString() };
  }
}

export const notificationsApiService = new NotificationsApiService();
