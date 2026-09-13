import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Users, TrendingUp, BarChart2, Star, ArrowRight } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useTraders, useFollowTrader } from '../../hooks/useTradersQuery';
import { useDebounce } from '../../hooks/useDebounce';
import { useUIStore } from '../../state/useUIStore';

export default function TradersDirectoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('ALL');
  const [sortBy, setSortBy] = useState<'winRate' | 'followers' | 'predictions'>('winRate');
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, refetch } = useTraders(debouncedSearch);
  const followMutation = useFollowTrader();
  const { addToast } = useUIStore();

  const traders = data?.data || [];

  // Filter by market specialty
  const filteredTraders = traders.filter((t) => {
    if (selectedMarket === 'ALL') return true;
    return t.featuredMarkets.some((m) => m.toUpperCase().includes(selectedMarket));
  });

  // Sort
  const sortedTraders = [...filteredTraders].sort((a, b) => {
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'followers') return b.followersCount - a.followersCount;
    return b.totalPredictions - a.totalPredictions;
  });

  const handleFollow = async (e: React.MouseEvent, traderId: string, name: string) => {
    e.stopPropagation();
    try {
      await followMutation.mutateAsync(traderId);
      addToast({
        type: 'success',
        title: 'Following Trader',
        message: `You are now receiving prediction alerts from ${name}.`,
      });
    } catch {
      addToast({
        type: 'danger',
        title: 'Follow Failed',
        message: 'Could not follow trader.',
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Verified Traders Directory</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Explore proven analysts publishing transparent trading prediction track records.
        </p>
      </div>

      {/* Search & Filters */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search analysts by name, handle, or market..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full sm:w-auto bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="ALL">All Markets</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="SOL">Solana (SOL)</option>
              <option value="XRP">XRP</option>
              <option value="GOLD">Gold (GOLD)</option>
              <option value="SILVER">Silver (SILVER)</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="winRate">Sort by: Highest Win Rate</option>
              <option value="followers">Sort by: Most Followers</option>
              <option value="predictions">Sort by: Total Predictions</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Grid of Traders */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : sortedTraders.length === 0 ? (
        <EmptyState
          title="No traders found"
          description="Try adjusting your search criteria or market filters."
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedTraders.map((trader) => (
            <GlassCard
              key={trader.id}
              className="flex flex-col justify-between gap-5 cursor-pointer hover:border-[var(--brand-primary)] transition-all"
              onClick={() => navigate(`/traders/${trader.id}`)}
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={trader.avatar}
                        alt={trader.displayName}
                        className="w-13 h-13 rounded-2xl object-cover ring-2 ring-[var(--brand-primary)]/40"
                      />
                      {trader.verifiedBadge && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center ring-2 ring-[var(--bg-surface)]">
                          <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight">
                        {trader.displayName}
                      </h3>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{trader.handle}</p>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30 font-mono-num">
                    {trader.winRate}% Win
                  </span>
                </div>

                {/* Bio */}
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed mb-4">
                  {trader.bio}
                </p>

                {/* Markets Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {trader.featuredMarkets.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-[var(--bg-secondary)] text-center">
                  <div>
                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">
                      {trader.totalPredictions}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Predictions</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono-num text-[var(--brand-primary)]">
                      1:{trader.avgRiskReward.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Avg R:R</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">
                      {(trader.followersCount / 1000).toFixed(1)}k
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">Followers</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => handleFollow(e, trader.id, trader.displayName)}
                  leftIcon={<Users className="w-3.5 h-3.5" />}
                >
                  Follow
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/traders/${trader.id}`);
                  }}
                >
                  Profile
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
