/**
 * subscriptionsService.ts
 * Real HTTP implementation of ISubscriptionApi — backed by /api/subscriptions
 */

import type { SubscriptionPlan, UserSubscription } from '../../types';
import type { ISubscriptionApi } from './apiClient';
import type { ApiResponse } from './types';
import { httpGet } from './httpClient';
import { httpGetPublic } from './httpClient';

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  is_active: boolean;
  created_at: string;
}

interface BackendSubscription {
  id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  created_at: string;
  plan: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    currency: string;
    billing_interval: string;
  } | null;
}

// ─── Local plan definitions (authoritative until payment gateway is live) ─────
// Prices in ₹. These mirror the SubscriptionsPage pricing section.
// When the payment gateway is integrated, replace with live backend data.

const FREE_TRIAL_PLAN: SubscriptionPlan = {
  id: 'free-trial',
  name: '14-Day Free Trial',
  description: 'Try the full platform free for 14 days — no card required',
  priceMonthly: 0,
  priceYearly: 0,
  badge: 'Free',
  isPopular: false,
  features: [
    'Chart Analysis with Explanation',
    'Access to Copilot / AI Assistant',
    'Paper Trading Simulation',
    'Real-time Market Data',
    'Historical Setup Outcomes',
    'Community Access',
    'Full PRO Access for 14 Days',
    'No Credit Card Required',
  ],
};

const LOCAL_PLANS: SubscriptionPlan[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Perfect for individual traders learning market analysis',
    priceMonthly: 999,
    priceYearly: 10999,
    badge: undefined,
    isPopular: false,
    features: [
      'Chart Analysis with Explanation',
      'Access to Copilot / AI Assistant',
      'Paper Trading Simulation',
      'Real-time Market Data',
      'Historical Setup Outcomes',
      'Community Access',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Advanced features for serious traders',
    priceMonthly: 1499,
    priceYearly: 15999,
    badge: 'Most Popular',
    isPopular: true,
    features: [
      'Everything in Standard',
      '1-on-1 Educational Slot Booking',
      'Master Trader Sessions',
      '24/7 Priority Support',
      'Advanced AI Analytics',
      'Custom Alerts & Notifications',
      'Export & Download Reports',
    ],
  },
];

export { FREE_TRIAL_PLAN };

// ─── Adapters ─────────────────────────────────────────────────────────────────

function toFrontendSubscription(s: BackendSubscription): UserSubscription {
  return {
    id: s.id,
    userId: '',
    planId: s.plan?.id ?? '',
    planName: s.plan?.name ?? 'Unknown Plan',
    status: s.status as UserSubscription['status'],
    currentPeriodEnd: s.expires_at ?? '',
    subscribedTraderIds: [],
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class SubscriptionsService implements ISubscriptionApi {
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    // Try backend first; fall back to local definitions if unavailable or empty
    try {
      const raw = await httpGetPublic<{ data: BackendPlan[] }>('/api/subscriptions/plans');
      const backendPlans = raw.data ?? [];
      // Backend returns plans without features or ₹ pricing — use local definitions
      if (backendPlans.length === 0) {
        return { success: true, data: LOCAL_PLANS, timestamp: new Date().toISOString() };
      }
      // Merge backend plan IDs with local feature/pricing data
      const merged = LOCAL_PLANS.map((local) => {
        const backend = backendPlans.find(
          (b) => b.name.toLowerCase() === local.name.toLowerCase(),
        );
        return backend ? { ...local, id: backend.id } : local;
      });
      return { success: true, data: merged, timestamp: new Date().toISOString() };
    } catch {
      // Backend unreachable — serve local plans
      return { success: true, data: LOCAL_PLANS, timestamp: new Date().toISOString() };
    }
  }

  async getMySubscriptions(): Promise<ApiResponse<UserSubscription[]>> {
    const raw = await httpGet<{ data: BackendSubscription[] }>('/api/subscriptions/me');
    return {
      success: true,
      data: (raw.data ?? []).map(toFrontendSubscription),
      timestamp: new Date().toISOString(),
    };
  }

  async subscribeToPlan(_planId: string): Promise<ApiResponse<{ subscriptionId: string; status: string }>> {
    // Payment gateway integration is out of V1 scope
    return {
      success: false,
      data: { subscriptionId: '', status: 'PENDING' },
      message: 'Payment gateway not yet configured. Contact support.',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Activate the 14-day free trial for the current user.
   * Trial state is computed client-side from createdAt via useTrialStore.
   * This call records intent on the backend when the endpoint is ready.
   */
  async activateTrial(): Promise<ApiResponse<{ activated: boolean }>> {
    // Trial is auto-activated on account creation via useTrialStore (createdAt-based).
    // No separate backend call is needed in V1 — trial state derives from createdAt.
    return {
      success: true,
      data: { activated: true },
      timestamp: new Date().toISOString(),
    };
  }
}

export const subscriptionsService = new SubscriptionsService();
