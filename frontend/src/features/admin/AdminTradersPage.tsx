import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminTraders } from '../../hooks/useAdminQuery';
import { useUIStore } from '../../state/useUIStore';

export default function AdminTradersPage() {
  const { data, isLoading } = useAdminTraders();
  const { addToast } = useUIStore();
  const traders = data?.data || [];

  const handleToggleVerification = (traderId: string, currentStatus: boolean, name: string) => {
    addToast({
      type: currentStatus ? 'warning' : 'success',
      title: currentStatus ? 'Badge Revoked' : 'Trader Verified',
      message: `${name}'s verification status was ${currentStatus ? 'revoked' : 'approved'}.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trader Verification & Oversight</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review analyst track records, verify performance criteria, and moderate published badges.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : traders.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No traders registered yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Analyst</th>
                  <th className="py-3 px-4 font-semibold">Markets</th>
                  <th className="py-3 px-4 font-semibold">Track Record</th>
                  <th className="py-3 px-4 font-semibold">Followers</th>
                  <th className="py-3 px-4 font-semibold">Badge</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {traders.map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors align-middle">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img src={t.avatar || '/snyprr-logo.png'} alt={t.displayName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{t.displayName}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{t.handle}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {t.featuredMarkets.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {t.featuredMarkets.map((m) => (
                            <span key={m} className="px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] text-[10px] text-[var(--text-secondary)]">{m}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold tabular-nums text-[var(--color-success)]">{t.winRate ?? 0}% Win</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{t.totalPredictions ?? 0} predictions · 1:{(t.avgRiskReward ?? 0).toFixed(2)} R:R</p>
                    </td>

                    <td className="py-3 px-4 tabular-nums text-[var(--text-primary)]">
                      {t.followersCount >= 1000
                        ? `${(t.followersCount / 1000).toFixed(1)}k`
                        : (t.followersCount ?? 0).toString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        t.verifiedBadge
                          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}>
                        <ShieldCheck className="w-3 h-3" />
                        {t.verifiedBadge ? 'Verified' : 'Unverified'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant={t.verifiedBadge ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleVerification(t.id, t.verifiedBadge, t.displayName)}
                      >
                        {t.verifiedBadge ? 'Revoke Badge' : 'Approve Badge'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
