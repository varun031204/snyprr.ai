import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useAuthStore } from '../../state/useAuthStore';
import { useMarketStore } from '../../state/useMarketStore';
import { ZoneLinesChart } from '../../components/charts/ZoneLinesChart';
import { AIAnalysisPanel } from '../../components/ai/AIAnalysisPanel';
import { CHART_ITEMS } from '../../constants';
import premDashboard from '../../assets/prem-dashboard.png';

// ─── Asset definitions ────────────────────────────────────────────────────────

const ASSETS = CHART_ITEMS; // BTC, ETH, SOL, XRP, GOLD, SILVER

export default function UserDashboardPage() {
  const { currentUser } = useAuthStore();
  const { data: predsData } = usePredictions({ pageSize: 50 });
  const { tickers } = useMarketStore();
  const navigate = useNavigate();

  // Active asset drives both chart + AI panel
  const [activeAsset, setActiveAsset] = useState<(typeof ASSETS)[number]>(ASSETS[0]);

  const isSubscribed =
    currentUser?.subscriptionTier === 'PRO' ||
    currentUser?.subscriptionTier === 'VIP';

  const allPredictions = predsData?.data ?? [];

  // Find the trader's active prediction for the selected asset
  const activePrediction = useMemo(
    () =>
      allPredictions.find(
        (p) => p.instrument.toLowerCase() === activeAsset.instrument.toLowerCase(),
      ) ?? null,
    [allPredictions, activeAsset],
  );

  // Switch asset — resets AI panel inside AIAnalysisPanel via instrument prop change
  const handleSelectAsset = (asset: typeof ASSETS[number]) => {
    setActiveAsset(asset);
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
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <div className="mt-1 space-y-0.5">
          <p className="text-sm text-[var(--text-secondary)]">
            Welcome back, {currentUser?.name?.split(' ')[0] ?? 'User'}.
          </p>
          <p className="text-sm font-semibold text-[var(--brand-primary)]">
            Came to earn some money?
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Oops! Here's a lot.
          </p>
        </div>
      </div>

      {/* ── Ticker Bar ─────────────────────────────────────────────────────── */}
      <div className="neo-glass-panel p-3.5 overflow-x-auto relative z-10">
        <div className="flex items-center gap-6 min-w-max">
          {tickers.slice(0, 6).map((t) => (
            <div key={t.symbol} className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{t.symbol}</span>
              <span className="text-sm font-bold font-mono-num text-[var(--text-primary)]">
                {t.category === 'FOREX'
                  ? t.price.toFixed(4)
                  : t.price.toLocaleString()}
              </span>
              <span
                className={`text-xs font-medium font-mono-num ${t.change24h >= 0
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-danger)]'
                  }`}
              >
                {t.change24h >= 0 ? '+' : ''}
                {t.change24h.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

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
        <div className="flex flex-col gap-3">
          <ZoneLinesChart
            tvSymbol={activeAsset.symbol}
            instrument={activeAsset.instrument}
            prediction={activePrediction}
            height={580}
          />

          {/* Trade levels legend strip — sourced from trader upload */}
          {activePrediction && (
            <GlassCard
              hoverEffect={false}
              className="flex flex-wrap items-center gap-3 p-3.5 border border-[var(--border-subtle)]"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mr-1">
                Trader Levels
              </span>
              {[
                {
                  label: 'Entry',
                  value: activePrediction.entryPrice,
                  color: 'text-[var(--brand-primary)]',
                  dot: 'bg-[var(--brand-primary)]',
                },
                {
                  label: 'Buy Zone',
                  value:
                    activePrediction.buyingZone ??
                    activePrediction.entryPrice * 0.97,
                  color: 'text-[var(--color-success)]',
                  dot: 'bg-[var(--color-success)]',
                },
                {
                  label: 'Sell Zone',
                  value:
                    activePrediction.sellingZone ??
                    activePrediction.entryPrice * 1.06,
                  color: 'text-[var(--color-danger)]',
                  dot: 'bg-[var(--color-danger)]',
                },
                ...(activePrediction.stopLoss
                  ? [{ label: 'SL', value: activePrediction.stopLoss, color: 'text-orange-400', dot: 'bg-orange-400' }]
                  : []),
                ...(activePrediction.takeProfit
                  ? [{ label: 'TP1', value: activePrediction.takeProfit, color: 'text-emerald-400', dot: 'bg-emerald-400' }]
                  : []),
                ...(activePrediction.takeProfit2
                  ? [{ label: 'TP2', value: activePrediction.takeProfit2, color: 'text-emerald-300', dot: 'bg-emerald-300' }]
                  : []),
                ...(activePrediction.takeProfit3
                  ? [{ label: 'TP3', value: activePrediction.takeProfit3, color: 'text-emerald-200', dot: 'bg-emerald-200' }]
                  : []),
              ].map((lv) => (
                <div key={lv.label} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${lv.dot}`} />
                  <span className="text-[10px] text-[var(--text-muted)]">{lv.label}</span>
                  <span className={`text-[11px] font-bold font-mono-num ${lv.color}`}>
                    ${lv.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              <span className="ml-auto text-[9px] text-[var(--text-muted)] italic">
                Levels from trader upload · not AI generated
              </span>
            </GlassCard>
          )}
        </div>

        {/* AI Analysis Side Panel */}
        <div className="xl:sticky xl:top-4">
          <GlassCard
            hoverEffect={false}
            className="p-5 border border-[var(--border-subtle)] shadow-xl relative overflow-hidden"
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--brand-glow)] rounded-full blur-3xl opacity-20 pointer-events-none -mr-10 -mt-10" />
            <div className="relative z-10">
              <AIAnalysisPanel
                instrument={activeAsset.instrument}
                prediction={activePrediction}
                isSubscribed={true}
                onUnlock={() => navigate('/subscriptions')}
              />
            </div>
          </GlassCard>
        </div>
      </div>

      {/* ── Desk Performance Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Overall Win Rate', value: '78.5%', color: 'text-[var(--color-success)]' },
          { label: 'Avg Risk/Reward', value: '1 : 3.1', color: 'text-[var(--brand-primary)]' },
          { label: 'Total Setups', value: '148+', color: 'text-[var(--text-primary)]' },
          { label: 'Subscribers', value: '2.5k+', color: 'text-[var(--color-info)]' },
        ].map((s) => (
          <GlassCard key={s.label} hoverEffect={false} className="p-4 text-center">
            <p className={`text-xl font-extrabold font-mono-num ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{s.label}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
