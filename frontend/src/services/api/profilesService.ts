/**
 * profilesService.ts
 * Real HTTP implementation of IUserApi and ITraderApi — backed by /api/profiles
 */

import type { TraderProfile, User } from '../../types';
import type { ITraderApi, IUserApi } from './apiClient';
import type { ApiResponse } from './types';
import { httpGet, httpPatch } from './httpClient';

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
  roles?: string[];
  subscription?: {
    id: string;
    status: string;
    started_at: string;
    expires_at: string | null;
    plan: {
      id: string;
      name: string;
      billing_interval: string;
      price: number;
      currency: string;
    } | null;
  } | null;
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
  const role = roles.includes('admin') ? 'ADMIN' : roles.includes('trader') ? 'TRADER' : 'USER';

  return {
    id: p.id,
    email: p.email ?? '',
    name: p.full_name ?? p.username ?? 'User',
    avatar: p.avatar_url ?? undefined,
    role,
    subscriptionTier: p.subscription?.plan?.name?.toUpperCase() as User['subscriptionTier'],
    bio: undefined,
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

// ─── Services ─────────────────────────────────────────────────────────────────

class ProfilesUserService implements IUserApi {
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const raw = await httpGet<{ data: BackendProfile }>('/api/profiles/me');
    return {
      success: true,
      data: toFrontendUser(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async getWatchlist(): Promise<ApiResponse<import('../../types').Prediction[]>> {
    // No backend endpoint yet — return empty
    return { success: true, data: [], timestamp: new Date().toISOString() };
  }

  async toggleWatchlist(_predictionId: string): Promise<ApiResponse<{ isSaved: boolean }>> {
    // No backend endpoint yet
    return { success: true, data: { isSaved: false }, timestamp: new Date().toISOString() };
  }

  async updateProfile(data: { full_name?: string; username?: string; avatar_url?: string | null }): Promise<ApiResponse<User>> {
    const raw = await httpPatch<{ data: BackendProfile }>('/api/profiles/me', data);
    return {
      success: true,
      data: toFrontendUser(raw.data),
      timestamp: new Date().toISOString(),
    };
  }
}

class TradersService implements ITraderApi {
  async getTraders(search?: string): Promise<ApiResponse<TraderProfile[]>> {
    const raw = await httpGet<{ data: BackendTraderProfile[]; count: number }>('/api/profiles/traders');
    let traders = (raw.data ?? []).map(toFrontendTrader);
    if (search) {
      const q = search.toLowerCase();
      traders = traders.filter(
        (t) => t.displayName.toLowerCase().includes(q) || t.handle.toLowerCase().includes(q)
      );
    }
    return {
      success: true,
      data: traders,
      timestamp: new Date().toISOString(),
    };
  }

  async getTraderById(id: string): Promise<ApiResponse<TraderProfile>> {
    const raw = await httpGet<{ data: BackendTraderProfile }>(`/api/profiles/traders/${id}`);
    return {
      success: true,
      data: toFrontendTrader(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async followTrader(_traderId: string): Promise<ApiResponse<{ success: boolean; isFollowing: boolean }>> {
    // No backend endpoint yet
    return {
      success: true,
      data: { success: true, isFollowing: true },
      timestamp: new Date().toISOString(),
    };
  }
}

export const profilesUserService = new ProfilesUserService();
export const tradersService = new TradersService();
