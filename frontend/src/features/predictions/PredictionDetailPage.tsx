import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Share2, ArrowLeft, PenSquare, CheckCircle, Sparkles } from 'lucide-react';
import { DirectionBadge, StatusBadge, RiskRewardBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { usePredictionDetail, usePublishPrediction } from '../../hooks/usePredictionsQuery';
import { useUserStore } from '../../state/useUserStore';
import { useAuthStore } from '../../state/useAuthStore';
import { useUIStore } from '../../state/useUIStore';
import { TradingChartPro } from '../../components/charts/TradingChartPro';
import { ClosePredictionModal } from './components/ClosePredictionModal';

export default function PredictionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePredictionDetail(id || '');
  const publishMutation = usePublishPrediction();
  const { watchlistIds, toggleWatchlist } = useUserStore();
  const { activeRole } = useAuthStore();
  const { addToast } = useUIStore();
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const prediction = data?.data;
  const isSaved = watchlistIds.includes(id || '');
  const canManage = activeRole === 'ADMIN' || activeRole === 'TRADER';

  const handleToggleWatchlist = () => {
    toggleWatchlist(id || '');
    addToast({
      type: isSaved ? 'info' : 'success',
      message: isSaved ? 'Removed from watchlist' : 'Added to watchlist',
    });
  };

  const handlePublishNow = async () => {
    if (!prediction) return;
    try {
      await publishMutation.mutateAsync(prediction.id);
      addToast({
        type: 'success',
        title: 'Prediction Published',
        message: 'This forecast is now public to the platform.',
      });
    } catch {
      addToast({
        type: 'danger',
        title: 'Publish Failed',
        message: 'Could not publish prediction.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-5">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <div className="grid lg:grid-cols-3 gap-5">
          <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !prediction) {
    return <ErrorState message="Prediction not found or failed to load." onRetry={() => refetch()} />;
  }

  const isTerminalState = ['TARGET_HIT', 'STOP_HIT', 'CLOSED', 'CANCELLED', 'EXPIRED'].includes(prediction.status);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back navigation */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Predictions
      </button>

      {/* Prediction header */}
      <GlassCard hoverEffect={false} className="flex flex-col sm:flex-row sm:items-start gap-5">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg">
              {prediction.instrument}
            </span>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg">
              {prediction.timeframe}
            </span>
            <DirectionBadge direction={prediction.direction} />
            <StatusBadge status={prediction.status} />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] leading-snug">{prediction.title}</h1>
          <div className="flex flex-wrap gap-1.5">
            {prediction.tags.map((tag) => (
              <span key={tag} className="text-xs bg-[var(--brand-glow)] text-[var(--brand-primary)] px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {canManage && prediction.status === 'DRAFT' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Sparkles className="w-4 h-4" />}
              onClick={handlePublishNow}
              isLoading={publishMutation.isPending}
            >
              Publish Now
            </Button>
          )}

          {canManage && !isTerminalState && (
            <>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<PenSquare className="w-4 h-4" />}
                onClick={() => navigate(`/trader/predictions/${prediction.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={() => setIsCloseModalOpen(true)}
              >
                Declare Outcome
              </Button>
            </>
          )}

          <button
            onClick={handleToggleWatchlist}
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${isSaved
              ? 'text-[var(--brand-primary)] border-[var(--brand-primary)] bg-[var(--brand-glow)]'
              : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)]'
              }`}
            aria-label={isSaved ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isSaved ? <BookmarkCheck className="w-4.5 h-4.5" /> : <Bookmark className="w-4.5 h-4.5" />}
          </button>
          <Button variant="secondary" size="sm" leftIcon={<Share2 className="w-4 h-4" />}>
            Share
          </Button>
        </div>
      </GlassCard>

      {/* Outcome Declaration Modal */}
      <ClosePredictionModal
        prediction={prediction}
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
      />

      {/* Level cards: Buying Zone / Selling Zone */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-2xl p-4 text-center">
          <p className="text-xs text-[var(--color-success)] mb-1.5 font-semibold">Buying Zone</p>
          <p className="text-xl font-extrabold font-mono-num text-[var(--color-success)]">
            {(prediction.buyingZone ?? prediction.entryPrice * 0.97).toLocaleString(undefined, { maximumFractionDigits: 5 })}
          </p>
        </div>
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-2xl p-4 text-center">
          <p className="text-xs text-[var(--color-danger)] mb-1.5 font-semibold">Selling Zone</p>
          <p className="text-xl font-extrabold font-mono-num text-[var(--color-danger)]">
            {(prediction.sellingZone ?? prediction.entryPrice * 1.06).toLocaleString(undefined, { maximumFractionDigits: 5 })}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1.5 font-medium">Zone Spread / Upside</p>
          <p className="text-xl font-extrabold font-mono-num text-[var(--brand-primary)]">
            {((((prediction.sellingZone ?? prediction.entryPrice * 1.06) - (prediction.buyingZone ?? prediction.entryPrice * 0.97)) / (prediction.buyingZone ?? prediction.entryPrice * 0.97)) * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart + Analysis — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Chart */}
          <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-[var(--border-subtle)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{prediction.instrument} — Chart Analysis</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Trader levels (read-only) + drawing tools: horizontal, trend line, long/short, rectangle, brush, text
              </p>
            </div>
            <TradingChartPro
              tvSymbol={
                prediction.instrument === 'GOLD' ? 'OANDA:XAUUSD' :
                  prediction.instrument === 'SILVER' ? 'OANDA:XAGUSD' :
                    `BINANCE:${prediction.instrument.replace('/', '')}`
              }
              instrument={prediction.instrument}
              prediction={prediction}
              predictionId={prediction.id}
              height={460}
            />
          </GlassCard>

          {/* Analysis */}
          <GlassCard hoverEffect={false}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Trader's Analysis</h2>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {prediction.analysis}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
              <span>Strategy: <strong className="text-[var(--text-primary)]">{prediction.strategy}</strong></span>
              <span>Timeframe: <strong className="text-[var(--text-primary)]">{prediction.timeframe}</strong></span>
              {prediction.publishedAt && (
                <span>Published: <strong className="text-[var(--text-primary)]">{new Date(prediction.publishedAt).toLocaleDateString()}</strong></span>
              )}
            </div>
          </GlassCard>

          {/* Outcome (if resolved) */}
          {prediction.outcome && (
            <GlassCard hoverEffect={false} className="border-[var(--color-success)]/40 bg-[var(--color-success-bg)]">
              <h2 className="text-sm font-semibold text-[var(--color-success)] mb-3">Prediction Outcome</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Exit Price</p>
                  <p className="text-lg font-bold font-mono-num text-[var(--text-primary)]">{prediction.outcome.exitPrice.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Return</p>
                  <p className="text-lg font-bold font-mono-num text-[var(--color-success)]">+{prediction.outcome.returnPercentage}%</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Result</p>
                  <StatusBadge status={prediction.status} />
                </div>
              </div>
              {prediction.outcome.summaryNotes && (
                <p className="text-xs text-[var(--text-muted)] mt-3">{prediction.outcome.summaryNotes}</p>
              )}
            </GlassCard>
          )}
        </div>

        {/* Desk & Signal Details sidebar — 1/3 */}
        <div className="space-y-5">
          <GlassCard hoverEffect={false}>
            <div className="flex flex-col items-center text-center gap-3">
              <img
                src="/tradebeast-logo.png"
                alt="TradeBeast"
                className="w-16 h-16 rounded-2xl object-contain p-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
              />
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">TradeBeast Desk</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Verified In-House Analyst</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs font-semibold border border-[var(--color-success)]/30">
                <CheckCircle className="w-3.5 h-3.5" /> Verified Track Record
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="text-center">
                <p className="text-base font-bold font-mono-num text-[var(--color-success)]">78.5%</p>
                <p className="text-[10px] text-[var(--text-muted)]">Desk Win Rate</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold font-mono-num text-[var(--brand-primary)]">{prediction.viewsCount.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Total Views</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard hoverEffect={false}>
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Prediction Details</h3>
            <div className="space-y-2.5">
              {[
                { label: 'Category', value: prediction.category },
                { label: 'Visibility', value: prediction.visibility },
                { label: 'Strategy', value: prediction.strategy },
                { label: 'Timeframe', value: prediction.timeframe },
                { label: 'Likes', value: prediction.likesCount.toLocaleString() },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{d.label}</span>
                  <span className="text-[var(--text-primary)] font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
