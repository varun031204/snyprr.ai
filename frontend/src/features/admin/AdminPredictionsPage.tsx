import React from 'react';
import { CheckCircle, EyeOff } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { DirectionBadge, StatusBadge } from '../../components/ui/Badge';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useUIStore } from '../../state/useUIStore';

export default function AdminPredictionsPage() {
  const { data, isLoading } = usePredictions();
  const { addToast } = useUIStore();
  const predictions = data?.data || [];

  const handleModerate = (id: string, action: 'HIDE' | 'APPROVE') => {
    addToast({
      type: action === 'APPROVE' ? 'success' : 'warning',
      title: `Prediction ${action === 'APPROVE' ? 'Approved' : 'Hidden'}`,
      message: `Prediction ${id} has been ${action === 'APPROVE' ? 'approved' : 'hidden from feed'}.`,
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prediction Content Moderation</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review community forecasts for guideline compliance, spam detection, and content safety.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : predictions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No predictions to moderate.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Prediction</th>
                  <th className="py-3 px-4 font-semibold">Trader</th>
                  <th className="py-3 px-4 font-semibold">Buy / Sell Zone</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Visibility</th>
                  <th className="py-3 px-4 font-semibold text-right">Moderation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {predictions.map((p) => {
                  const buyZone = p.buyingZone ?? p.entryPrice ?? 0;
                  const sellZone = p.sellingZone ?? (p.entryPrice ? p.entryPrice * 1.06 : 0);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors align-middle">
                      <td className="py-3 px-4 max-w-[200px]">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{p.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[var(--text-muted)]">{p.instrument}</span>
                          <DirectionBadge direction={p.direction} />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <p className="font-semibold text-[var(--text-primary)]">{p.trader.displayName}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{p.trader.handle}</p>
                      </td>

                      <td className="py-3 px-4 tabular-nums">
                        <span className="text-[var(--color-success)] font-semibold">{buyZone.toLocaleString()}</span>
                        <span className="text-[var(--text-muted)] mx-1">/</span>
                        <span className="text-[var(--color-danger)] font-semibold">{sellZone.toLocaleString()}</span>
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={p.status} />
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-md">
                          {p.visibility}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleModerate(p.id, 'APPROVE')} title="Approve">
                            <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleModerate(p.id, 'HIDE')} title="Hide">
                            <EyeOff className="w-4 h-4 text-[var(--color-warning)]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
