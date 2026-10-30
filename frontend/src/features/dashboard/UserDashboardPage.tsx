import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Newspaper as _Newspaper, ExternalLink, ChevronRight, ChevronLeft, Zap } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useAuthStore } from '../../state/useAuthStore';
import { useMarketStore } from '../../state/useMarketStore';
import { useTrialStore } from '../../state/useTrialStore';
import { useNewsStore } from '../../state/useNewsStore';
import { GoChartingWidget as ZoneLinesChart } from '../../components/charts/gocharting/GoChartingWidget';
import { AIAnalysisPanel } from '../../components/ai/AIAnalysisPanel';
import { CHART_ITEMS } from '../../constants';
import { EconomicCalendarWidget } from '../../components/news/EconomicCalendar';
import premDashboard from '../../assets/prem-dashboard.png';

// ── News Ticker Bar ─────────────────────────────────────────────────────────
// TradingView-style horizontal news strip with time labels.

function NewsTickerBar() {
  const { headlines, isFetching, fetchHeadlines } = useNewsStore();
  const [index, setIndex] = useState(0);

  // Ensure headlines are fetched when the component mounts
  useEffect(() => { fetchHeadlines(); }, [fetchHeadlines]);

  if (headlines.length === 0 && !isFetching) return null;

  const visible = headlines.slice(0, 10); // show up to 10 headlines

  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const next = () => setIndex((i) => Math.min(visible.length - 1, i + 1));

  const article = visible[index];

  function timeLabel(dateStr: string) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="neo-glass-panel px-3 py-2.5 flex items-center gap-2 relative z-10 overflow-hidden">
      {/* Label */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Zap className="w-3.5 h-3.5 text-[var(--color-danger)]" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-danger)]">
          News
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" />
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-[var(--border-subtle)] flex-shrink-0" />

      {/* Article */}
      {isFetching && headlines.length === 0 ? (
        <div className="flex-1 h-3 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
      ) : article ? (
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 min-w-0 group"
        >
          {/* Timestamp */}
          <span className="text-[10px] font-mono font-semibold text-[var(--text-muted)] flex-shrink-0">
            {timeLabel(article.publishedAt)}
          </span>
          {/* Source badge */}
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--brand-glow)] text-[var(--brand-primary)] flex-shrink-0">
            {article.source}
          </span>
          {/* Headline */}
          <span className="text-xs text-[var(--text-secondary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
            {article.title}
          </span>
          <ExternalLink className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      ) : null}

      {/* Pagination controls */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
        <span className="text-[9px] text-[var(--text-muted)] font-mono">
          {index + 1}/{visible.length}
        </span>
        <button
          onClick={prev}
          disabled={index === 0}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={next}
          disabled={index >= visible.length - 1}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-all"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <Link
          to="/news"
          className="text-[9px] font-semibold text-[var(--brand-primary)] hover:underline ml-1 flex-shrink-0"
        >
          All news →
        </Link>
      </div>
    </div>
  );
}

const ASSETS = CHART_ITEMS;

export default function UserDashboardPage() {
  const { currentUser } = useAuthStore();
  const { data: predsData } = usePredictions({ pageSize: 50 });
  const { tickers } = useMarketStore();
  const navigate = useNavigate();

  const [activeAsset, setActiveAsset] = useState<(typeof ASSETS)[number]>(ASSETS[0]);
  const [signalsRevealed, setSignalsRevealed] = useState(false);

  const { isTrialActive } = useTrialStore();

  const isSubscribed =
    isTrialActive ||
    currentUser?.subscriptionTier === 'PRO' ||
    currentUser?.subscriptionTier === 'VIP';

  const allPredictions = predsData?.data ?? [];

  const activePrediction = useMemo(
    () =>
      allPredictions.find(
        (p) => p.instrument.toLowerCase() === activeAsset.instrument.toLowerCase(),
      ) ?? null,
    [allPredictions, activeAsset],
  );

  // Switch asset — resets AI panel and hides signals until re-triggered
  const handleSelectAsset = (asset: typeof ASSETS[number]) => {
    setActiveAsset(asset);
    setSignalsRevealed(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative">

      {/* PRO/VIP watermark */}
      {isSubscribed && (
        <img
          src={premDashboard}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
          style={{ opacity: 0.04 }}
        />
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
          Welcome back, {currentUser?.name?.split(' ')[0] ?? 'User'}.
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Market analysis and chart education platform.
        </p>
      </div>

      {/* ── Ticker Bar ─────────────────────────────────────────────────────── */}
      <div className="neo-glass-panel p-3.5 overflow-x-auto relative z-10">
        <div className="flex items-center gap-6 min-w-max">
          {tickers.slice(0, 6).map((t) => (
            <div key={t.symbol} className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{t.symbol}</span>
              <span className="text-sm font-bold font-mono-num text-[var(--text-primary)]">
                {t.category === 'FOREX' ? t.price.toFixed(4) : t.price.toLocaleString()}
              </span>
              <span className={`text-xs font-medium font-mono-num ${t.change24h >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── News Ticker ─────────────────────────────────────────────────────── */}
      <NewsTickerBar />

      {/* ── Multi-Asset Selector ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-thin relative z-10">
        {ASSETS.map((asset) => {
          const hasSetup = allPredictions.some(
            (p) => p.instrument.toLowerCase() === asset.instrument.toLowerCase(),
          );
          const isActive = activeAsset.symbol === asset.symbol;
          return (
            <button
              key={asset.symbol}
              onClick={() => handleSelectAsset(asset)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap transition-all ${isActive
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-md'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                }`}
            >
              {asset.label}
              {hasSetup && (
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive
                    ? 'bg-white shadow-[0_0_5px_white]'
                    : 'bg-[var(--color-success)] shadow-[0_0_5px_var(--color-success)]'
                    }`}
                  title="Active trader setup"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Chart + AI Panel ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start relative z-10">

        {/* Chart */}
        <ZoneLinesChart
          tvSymbol={activeAsset.symbol}
          instrument={activeAsset.instrument}
          prediction={signalsRevealed ? activePrediction : null}
          height={580}
          allowDrawing={true}
        />

        {/* AI Analysis Side Panel */}
        <div className="xl:sticky xl:top-4">
          <GlassCard
            hoverEffect={false}
            className="p-5 border border-[var(--border-subtle)] shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--brand-glow)] rounded-full blur-3xl opacity-20 pointer-events-none -mr-10 -mt-10" />
            <div className="relative z-10">
              <AIAnalysisPanel
                instrument={activeAsset.instrument}
                prediction={activePrediction}
                isSubscribed={isSubscribed}
                onUnlock={() => navigate('/subscriptions')}
                onAnalysisStart={() => setSignalsRevealed(true)}
                onReset={() => setSignalsRevealed(false)}
              />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Desk Performance Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Historical Win Rate*', value: '78.5%', color: 'text-[var(--color-success)]' },
          { label: 'Avg Desk R/R*', value: '1 : 3.1', color: 'text-[var(--brand-primary)]' },
          { label: 'Total Setups Published', value: '148+', color: 'text-[var(--text-primary)]' },
          { label: 'Active Members', value: '2.5k+', color: 'text-[var(--color-info)]' },
        ].map((s) => (
          <GlassCard key={s.label} hoverEffect={false} className="p-4 text-center">
            <p className={`text-xl font-extrabold font-mono-num ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>
      <p className="text-[9px] text-[var(--text-muted)] text-center -mt-2 relative z-10">
        *Historical figures based on published desk setups. Past performance does not guarantee future results.
      </p>

      {/* ── Upcoming Market Events ─────────────────────────────────────────── */}
      <GlassCard hoverEffect={false} className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              📅 Upcoming Market Events
            </h3>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              High-impact scheduled events that can move crypto, forex & commodities
            </p>
          </div>
          <Link to="/news" onClick={() => { }} className="text-[10px] font-semibold text-[var(--brand-primary)] hover:underline flex items-center gap-0.5">
            Full calendar →
          </Link>
        </div>
        <EconomicCalendarWidget />
      </GlassCard>
    </div>
  );
}
