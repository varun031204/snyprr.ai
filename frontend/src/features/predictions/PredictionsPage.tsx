import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { DirectionBadge, StatusBadge, RiskRewardBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { usePredictionFilterStore } from '../../state/usePredictionFilterStore';
import { INSTRUMENTS, TIMEFRAMES } from '../../constants';
import { useDebounce } from '../../hooks/useDebounce';
import { Select } from '../../components/ui/Select';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PredictionsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const {
    search, instrumentFilter, directionFilter, statusFilter, timeframeFilter,
    setSearch, setInstrumentFilter, setDirectionFilter, setStatusFilter, setTimeframeFilter, resetFilters,
  } = usePredictionFilterStore();

  const debouncedSearch = useDebounce(search, 350);

  const { data, isLoading, isError, refetch } = usePredictions({
    search: debouncedSearch,
    instrument: instrumentFilter,
    direction: directionFilter,
    status: statusFilter,
    timeframe: timeframeFilter,
    page,
    pageSize: 12,
  });

  const predictions = data?.data || [];
  const totalPages = data?.pagination.totalPages ?? 1;
  const totalItems = data?.pagination.totalItems ?? 0;
  const hasFilters = !!(search || instrumentFilter || directionFilter || statusFilter || timeframeFilter);

  const handleResetFilters = () => {
    resetFilters();
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Predictions</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Discover high-conviction trading ideas from our verified trading desk.</p>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          {/* Search */}
          <div className="w-full sm:w-64">
            <Input
              placeholder="Search predictions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <Select
            value={instrumentFilter}
            onChange={(e) => { setInstrumentFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Instruments' },
              ...INSTRUMENTS.map((i) => ({ value: i.symbol, label: i.symbol })),
            ]}
          />

          <Select
            value={directionFilter}
            onChange={(e) => { setDirectionFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Directions' },
              { value: 'LONG', label: '▲ Long' },
              { value: 'SHORT', label: '▼ Short' },
            ]}
          />

          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'TARGET_HIT', label: 'Target Hit' },
              { value: 'STOP_HIT', label: 'Stop Hit' },
              { value: 'CLOSED', label: 'Closed' },
              { value: 'EXPIRED', label: 'Expired' },
            ]}
          />

          <Select
            value={timeframeFilter}
            onChange={(e) => { setTimeframeFilter(e.target.value); setPage(1); }}
            options={[
              { value: '', label: 'All Timeframes' },
              ...TIMEFRAMES.map((tf) => ({ value: tf, label: tf })),
            ]}
          />

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleResetFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Results */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {isLoading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : predictions.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No predictions match your filters' : 'No predictions yet'}
          description={hasFilters ? 'Try adjusting or clearing your filters.' : 'Predictions from traders will appear here.'}
          actionText={hasFilters ? 'Clear Filters' : undefined}
          onAction={hasFilters ? handleResetFilters : undefined}
        />
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            {totalItems} prediction{totalItems !== 1 ? 's' : ''} found
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </p>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {predictions.map((p) => (
              <GlassCard
                key={p.id}
                className="flex flex-col gap-4 cursor-pointer"
                onClick={() => navigate(`/predictions/${p.id}`)}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-secondary)] text-[var(--brand-primary)] border border-[var(--border-subtle)]">
                    {p.category}
                  </span>
                  <StatusBadge status={p.status} />
                </div>

                {/* Instrument + Direction */}
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">{p.instrument} · {p.timeframe} · {p.strategy}</p>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2">{p.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <DirectionBadge direction={p.direction} />
                  {p.riskRewardRatio && !p.buyingZone && <RiskRewardBadge ratio={p.riskRewardRatio} />}
                </div>

                {/* Levels: Buying Zone & Selling Zone */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-[var(--color-success)] font-semibold mb-0.5">Buy Zone</p>
                    <p className="text-xs font-mono-num font-bold text-[var(--color-success)]">
                      {(p.buyingZone ?? p.entryPrice).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-[var(--color-danger)] font-semibold mb-0.5">Sell Zone</p>
                    <p className="text-xs font-mono-num font-bold text-[var(--color-danger)]">
                      {(p.sellingZone ?? p.takeProfit ?? p.entryPrice).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Footer: timeframe pill + publish date */}
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold text-[var(--text-secondary)] tracking-wide">
                    {p.timeframe}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock className="w-3 h-3" />
                    {relativeTime(p.publishedAt ?? p.createdAt)}
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-semibold border transition-all ${p === page
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]'
                    }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
