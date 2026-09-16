/**
 * adminService.ts
 * Real HTTP implementation of IAdminApi — backed by /api/admin
 */

import type { AuditLogEntry, TraderProfile, User, UserRole } from '../../types';
import type { IAdminApi } from './apiClient';
import type { ApiResponse } from './types';
import { httpDelete, httpGet, httpPatch, httpPost } from './httpClient';

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
  roles?: string[];
}

interface BackendTraderProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

function toFrontendUser(p: BackendProfile): User {
  const roles = p.roles ?? [];
  const role: UserRole = roles.includes('admin') ? 'ADMIN' : roles.includes('trader') ? 'TRADER' : 'USER';
  return {
    id: p.id,
    email: p.email ?? '',
    name: p.full_name ?? p.username ?? 'User',
    avatar: p.avatar_url ?? undefined,
    role,
    isVerified: p.account_status === 'ACTIVE',
    twoFactorEnabled: false,
    createdAt: p.created_at,
    permissions: [],
  };
}

function toFrontendTrader(t: BackendTraderProfile): TraderProfile {
  return {
    id: t.id,
    userId: t.user_id,
    displayName: t.display_name,
    handle: `@${t.display_name.toLowerCase().replace(/\s+/g, '')}`,
    avatar: '/snyprr-logo.png',
    bio: t.bio ?? '',
    verifiedBadge: true,
    joinedDate: t.created_at,
    followersCount: 0,
    subscribersCount: 0,
    totalPredictions: 0,
    winRate: 0,
    avgRiskReward: 0,
    featuredMarkets: [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class AdminApiService implements IAdminApi {
  async getUsers(): Promise<ApiResponse<User[]>> {
    const raw = await httpGet<{ users: BackendProfile[]; total: number }>('/api/admin/users');
    return {
      success: true,
      data: (raw.users ?? []).map(toFrontendUser),
      timestamp: new Date().toISOString(),
    };
  }

  async getTraders(): Promise<ApiResponse<TraderProfile[]>> {
    const raw = await httpGet<{ data: BackendTraderProfile[] }>('/api/profiles/traders');
    return {
      success: true,
      data: (raw.data ?? []).map(toFrontendTrader),
      timestamp: new Date().toISOString(),
    };
  }

  async getAuditLogs(): Promise<ApiResponse<AuditLogEntry[]>> {
    // Audit log endpoint not yet implemented — returns empty until backend is ready
    return {
      success: true,
      data: [],
      timestamp: new Date().toISOString(),
    };
  }

  async getPlatformStats(): Promise<ApiResponse<{
    total_users: number;
    total_signals: number;
    active_published_signals: number;
    registered_traders: number;
    active_subscriptions: number;
  }>> {
    const raw = await httpGet<{
      total_users: number;
      total_signals: number;
      active_published_signals: number;
      registered_traders: number;
      active_subscriptions: number;
    }>('/api/admin/stats');
    return { success: true, data: raw, timestamp: new Date().toISOString() };
  }

  async updateUserRole(userId: string, role: UserRole): Promise<ApiResponse<User>> {
    const roleName = role.toLowerCase();
    await httpPost(`/api/admin/users/${userId}/roles`, { role: roleName });
    // Fetch updated user
    const usersRaw = await httpGet<{ users: BackendProfile[] }>('/api/admin/users');
    const updated = usersRaw.users?.find((u) => u.id === userId);
    if (updated) {
      return { success: true, data: toFrontendUser(updated), timestamp: new Date().toISOString() };
    }
    return { success: true, data: { id: userId } as User, timestamp: new Date().toISOString() };
  }

  async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED'): Promise<ApiResponse<void>> {
    await httpPatch(`/api/admin/users/${userId}/status`, { status });
    return { success: true, data: undefined, timestamp: new Date().toISOString() };
  }

  async removeUserRole(userId: string, role: UserRole): Promise<ApiResponse<void>> {
    const roleName = role.toLowerCase();
    await httpDelete(`/api/admin/users/${userId}/roles?role=${roleName}`);
    return { success: true, data: undefined, timestamp: new Date().toISOString() };
  }
}

export const adminApiService = new AdminApiService();
