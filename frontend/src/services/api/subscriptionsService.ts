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
// Prices in ₹. These mirror the LandingPage pricing section.
// When the payment gateway is integrated, replace with live backend data.

const FREE_TRIAL_PLAN: SubscriptionPlan = {
  id: 'free_trial',
  name: '15-Day Free Trial',
  description: 'Try the full platform for 15 days at zero cost',
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

      if (backendPlans.length === 0) {
        return { success: true, data: [FREE_TRIAL_PLAN, ...LOCAL_PLANS], timestamp: new Date().toISOString() };
      }

      // Build merged plans: group by display name (Standard / Premium),
      // combining monthly + yearly pricing from the DB into one card each.
      const findPlan = (keyword: string, interval: string) =>
        backendPlans.find(b =>
          b.name.toLowerCase().includes(keyword.toLowerCase()) &&
          b.billing_interval === interval
        );

      const freeTrial = backendPlans.find(b => b.billing_interval === 'FREE_TRIAL');

      const buildPlan = (
        local: SubscriptionPlan,
        monthlyPlan: BackendPlan | undefined,
        yearlyPlan: BackendPlan | undefined
      ): SubscriptionPlan => ({
        ...local,
        id: monthlyPlan?.id ?? local.id,
        priceMonthly: monthlyPlan?.price ?? local.priceMonthly,
        priceYearly: yearlyPlan?.price ?? local.priceYearly,
      });

      const merged: SubscriptionPlan[] = LOCAL_PLANS.map(local => {
        const keyword = local.name; // 'Standard' or 'Premium'
        const monthlyPlan = findPlan(keyword, 'MONTHLY');
        const yearlyPlan = findPlan(keyword, 'YEARLY');
        return buildPlan(local, monthlyPlan, yearlyPlan);
      });

      const freePlan: SubscriptionPlan = freeTrial
        ? { ...FREE_TRIAL_PLAN, id: freeTrial.id }
        : FREE_TRIAL_PLAN;

      return { success: true, data: [freePlan, ...merged], timestamp: new Date().toISOString() };
    } catch {
      // Backend unreachable — serve local plans
      return { success: true, data: [FREE_TRIAL_PLAN, ...LOCAL_PLANS], timestamp: new Date().toISOString() };
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
}

export const subscriptionsService = new SubscriptionsService();
