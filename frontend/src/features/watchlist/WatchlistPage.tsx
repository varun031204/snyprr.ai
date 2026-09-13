import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, ArrowRight, Trash2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { DirectionBadge, StatusBadge, RiskRewardBadge } from '../../components/ui/Badge';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useUserStore } from '../../state/useUserStore';
import { useUIStore } from '../../state/useUIStore';

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { watchlistIds, toggleWatchlist } = useUserStore();
  const { data, isLoading } = usePredictions();
  const { addToast } = useUIStore();

  const allPredictions = data?.data || [];
  const watchlistPredictions = allPredictions.filter((p) => watchlistIds.includes(p.id));

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleWatchlist(id);
    addToast({
      type: 'info',
      title: 'Removed from Watchlist',
      message: 'Prediction was removed from your tracked list.',
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Watchlist</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Track active and high-conviction predictions from your favorite analysts.
        </p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : watchlistPredictions.length === 0 ? (
        <EmptyState
          title="Your watchlist is empty"
          description="Bookmark predictions from the feed to track their target progress here."
          actionText="Browse Predictions"
          onAction={() => navigate('/predictions')}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {watchlistPredictions.map((p) => (
            <GlassCard
              key={p.id}
              className="flex flex-col justify-between gap-4 cursor-pointer hover:border-[var(--brand-primary)] transition-all"
              onClick={() => navigate(`/predictions/${p.id}`)}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={p.trader.avatar}
                      alt={p.trader.displayName}
                      className="w-7 h-7 rounded-lg object-cover"
                    />
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{p.trader.displayName}</span>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, p.id)}
                    className="text-[var(--brand-primary)] hover:text-[var(--color-danger)] p-1 rounded-lg transition-colors"
                    title="Remove from watchlist"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-[var(--text-muted)]">{p.instrument} · {p.timeframe}</span>
                  <StatusBadge status={p.status} />
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-3">
                  {p.title}
                </h3>

                <div className="flex items-center gap-2 mb-3">
                  <DirectionBadge direction={p.direction} />
                  {p.riskRewardRatio && !p.buyingZone && <RiskRewardBadge ratio={p.riskRewardRatio} />}
                </div>

                <div className="grid grid-cols-2 gap-2 bg-[var(--bg-secondary)] p-2 rounded-xl text-center">
                  <div>
                    <p className="text-[10px] text-[var(--color-success)] font-semibold">Buy Zone</p>
                    <p className="text-xs font-bold font-mono-num text-[var(--color-success)]">{(p.buyingZone ?? p.entryPrice).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--color-danger)] font-semibold">Sell Zone</p>
                    <p className="text-xs font-bold font-mono-num text-[var(--color-danger)]">{(p.sellingZone ?? p.takeProfit ?? p.entryPrice).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Live Context
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
