import React from 'react';
import { CreditCard, TrendingUp, Users, DollarSign } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionsQuery';
import { useAdminStats } from '../../hooks/useAdminQuery';

export default function AdminSubscriptionsPage() {
  const { data: plansData, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: statsData } = useAdminStats();
  const plans = plansData?.data ?? [];
  const stats = statsData?.data;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Subscription Revenue & Plans</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Monitor subscriber tiers, recurring run rates, and active subscriber rosters.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Subscribers" value={stats?.active_subscriptions ?? 0} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Registered Traders" value={stats?.registered_traders ?? 0} icon={<CreditCard className="w-5 h-5" />} />
        <StatCard title="Total Signals" value={stats?.total_signals ?? 0} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Total Users" value={stats?.total_users ?? 0} icon={<DollarSign className="w-5 h-5" />} />
      </div>

      {/* Plan Tiers */}
      {plansLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <GlassCard hoverEffect={false}>
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No subscription plans configured yet.</p>
        </GlassCard>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((p) => (
            <GlassCard key={p.id} hoverEffect={false} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{p.name}</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{p.description || '—'}</p>
                </div>
                <span className="text-lg font-extrabold tabular-nums text-[var(--brand-primary)] flex-shrink-0">
                  ₹{p.priceMonthly}/mo
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Billing Interval</span>
                  <span className="font-semibold text-[var(--text-primary)] uppercase">{p.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[var(--text-muted)]">Yearly Price</span>
                  <span className="font-semibold text-[var(--text-primary)] tabular-nums">₹{p.priceYearly}/yr</span>
                </div>
                {p.features.length > 0 && (
                  <div className="pt-1 border-t border-[var(--border-subtle)] space-y-1">
                    {p.features.slice(0, 3).map((f, i) => (
                      <p key={i} className="text-[var(--text-secondary)] flex items-start gap-1.5">
                        <span className="text-[var(--color-success)] mt-px">✓</span>
                        <span>{f}</span>
                      </p>
                    ))}
                    {p.features.length > 3 && (
                      <p className="text-[var(--text-muted)]">+{p.features.length - 3} more features</p>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
