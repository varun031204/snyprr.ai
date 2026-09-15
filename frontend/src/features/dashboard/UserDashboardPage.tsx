import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, ArrowRight, Bot, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useAuthStore } from '../../state/useAuthStore';
import { useMarketStore } from '../../state/useMarketStore';
import { useUIStore } from '../../state/useUIStore';
import { TradingChartPro } from '../../components/charts/TradingChartPro';
import { AIAnalysisPanel } from '../../components/ai/AIAnalysisPanel';
import { PaperTradeOrderPanel, PaperTradeDraftLevels } from '../paper-trading/PaperTradeOrderPanel';
import { CHART_ITEMS } from '../../constants';
import type { Prediction } from '../../types';
import premDashboard from '../../assets/prem-dashboard.png';

const ASSETS = CHART_ITEMS;

const STATS = [
  { label: 'Win Rate', value: '78.5%', sub: 'last 90 days', color: 'var(--color-success)' },
  { label: 'Risk / Reward', value: '1 : 3.1', sub: 'avg per setup', color: 'var(--brand-primary)' },
  { label: 'Total Setups', value: '148+', sub: 'published', color: 'var(--text-primary)' },
  { label: 'Subscribers', value: '2.5k+', sub: 'active members', color: 'var(--color-info)' },
];

export default function UserDashboardPage() {
  const { currentUser } = useAuthStore();
  const { data: predsData } = usePredictions({ pageSize: 50 });
  const { tickers } = useMarketStore();
  const { theme } = useUIStore();
  const navigate = useNavigate();

  const [activeAsset, setActiveAsset] = useState<(typeof ASSETS)[number]>(ASSETS[0]);
  const [timeframe, setTimeframe] = useState('1h');
  const [showPaperTrade, setShowPaperTrade] = useState(false);
  const [paperDraft, setPaperDraft] = useState<PaperTradeDraftLevels | null>(null);

  const isSubscribed =
    currentUser?.subscriptionTier === 'PRO' ||
    currentUser?.subscriptionTier === 'VIP';

  const allPredictions = predsData?.data ?? [];

  const activePrediction = useMemo(
    () => allPredictions.find(
      (p) => p.instrument.toLowerCase() === activeAsset.instrument.toLowerCase(),
    ) ?? null,
    [allPredictions, activeAsset],
  );

  const effectiveChartPrediction = useMemo(() => {
    if (showPaperTrade && paperDraft && paperDraft.instrument.toLowerCase() === activeAsset.instrument.toLowerCase()) {
      return {
        id: `paper-draft-${paperDraft.instrument}`,
        title: `${paperDraft.instrument} Paper Trade Setup`,
        instrument: paperDraft.instrument,
        category: paperDraft.instrument === 'GOLD' || paperDraft.instrument === 'SILVER' ? 'COMMODITIES' : 'CRYPTO',
        direction: paperDraft.direction,
        entryPrice: paperDraft.entryPrice,
        buyingZone: paperDraft.buyingZone,
        sellingZone: paperDraft.sellingZone,
        stopLoss: paperDraft.stopLoss || undefined,
        takeProfit: paperDraft.takeProfit || undefined,
        takeProfit2: paperDraft.takeProfit2 || undefined,
        takeProfit3: paperDraft.takeProfit3 || undefined,
        timeframe: paperDraft.timeframe,
        strategy: 'Key Price Zones',
        analysis: '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      } as unknown as Prediction;
    }
    return activePrediction;
  }, [showPaperTrade, paperDraft, activeAsset.instrument, activePrediction]);

  const activeTicker = tickers.find((t) => t.symbol === activeAsset.instrument);

  return (
    <div className="max-w-7xl mx-auto space-y-5 relative">

      {isSubscribed && (
        <img src={premDashboard} alt="" aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
          style={{ opacity: 0.04 }}
        />
      )}

      {/* ── Header ── */}
      <div className="relative z-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] leading-tight">
            Hey, {currentUser?.name?.split(' ')[0] ?? 'Trader'} 👋
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">Here's what the market looks like today.</p>
        </div>
        {activeTicker && (
          <div className="hidden sm:flex flex-col items-end flex-shrink-0">
            <span className="text-xs text-[var(--text-muted)] font-medium">{activeAsset.instrument}</span>
            <span className="text-xl font-bold font-mono-num text-[var(--text-primary)]">
              {activeTicker.price.toLocaleString()}
            </span>
            <span className={`text-xs font-semibold font-mono-num ${activeTicker.change24h >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {activeTicker.change24h >= 0 ? '▲' : '▼'} {Math.abs(activeTicker.change24h).toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Ticker Bar ── */}
      <div className="relative z-10 overflow-x-auto scrollbar-thin">
        <div className="flex items-stretch gap-2 min-w-max">
          {tickers.slice(0, 6).map((t) => {
            const isUp = t.change24h >= 0;
            return (
              <button
                key={t.symbol}
                onClick={() => {
                  const asset = ASSETS.find((a) => a.instrument === t.symbol);
                  if (asset) setActiveAsset(asset);
                }}
                className={`flex flex-col gap-0.5 px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                  activeAsset.instrument === t.symbol
                    ? 'bg-[var(--brand-glow)] border-[var(--brand-primary)]/40'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wide">{t.symbol}</span>
                <span className="text-sm font-bold font-mono-num text-[var(--text-primary)]">
                  {t.price >= 1000 ? t.price.toLocaleString() : t.price.toFixed(t.price < 10 ? 4 : 2)}
                </span>
                <span className={`text-[10px] font-semibold font-mono-num ${isUp ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {isUp ? '+' : ''}{t.change24h.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart + AI Panel ── */}
      <div className="flex flex-row gap-4 items-start relative z-10">

        <div className="flex flex-col gap-3 flex-1 min-w-0">

          <TradingChartPro
            tvSymbol={activeAsset.symbol}
            instrument={activeAsset.instrument}
            prediction={effectiveChartPrediction}
            timeframe={timeframe}
            height={580}
            predictionId={effectiveChartPrediction?.id ?? activeAsset.instrument}
          />

          {/* Levels strip — shown whenever active setup has key levels */}
          {activePrediction && (() => {
            const levels = [
              { label: 'Entry', value: activePrediction.entryPrice, color: 'var(--brand-primary)' },
              { label: 'Buy Wall', value: activePrediction.buyingZone ?? activePrediction.entryPrice * 0.97, color: 'var(--color-success)' },
              { label: 'Sell Wall', value: activePrediction.sellingZone ?? activePrediction.entryPrice * 1.06, color: 'var(--color-danger)' },
              ...(activePrediction.stopLoss ? [{ label: 'SL', value: activePrediction.stopLoss, color: '#fb923c' }] : []),
              ...(activePrediction.takeProfit ? [{ label: 'TP1', value: activePrediction.takeProfit, color: '#34d399' }] : []),
              ...(activePrediction.takeProfit2 ? [{ label: 'TP2', value: activePrediction.takeProfit2, color: '#6ee7b7' }] : []),
              ...(activePrediction.takeProfit3 ? [{ label: 'TP3', value: activePrediction.takeProfit3, color: '#a7f3d0' }] : []),
            ];
            return (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                {levels.map((lv) => (
                  <div key={lv.label} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: lv.color }} />
                    <span className="text-[10px] text-[var(--text-muted)]">{lv.label}</span>
                    <span className="text-[11px] font-bold font-mono-num" style={{ color: lv.color }}>
                      ${lv.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <span className="ml-auto text-[9px] text-[var(--text-muted)] italic">trader-uploaded · not AI</span>
              </div>
            );
          })()}
        </div>

        {/* Right Column: AI Analysis + Paper Trade below it */}
        <div className="w-[340px] lg:w-[380px] flex-shrink-0 space-y-3">
          {/* AI Analysis Box */}
          <GlassCard hoverEffect={false} className="border border-[var(--border-subtle)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-glow)] rounded-full blur-3xl opacity-30 pointer-events-none -mr-8 -mt-8" />
            <div className="relative z-10">
              <AIAnalysisPanel
                instrument={activeAsset.instrument}
                prediction={activePrediction}
                isSubscribed={true}
                onUnlock={() => navigate('/subscriptions')}
              />
            </div>
          </GlassCard>

          {/* Paper Trade Option below AI Analysis Box */}
          {!showPaperTrade ? (
            <button
              type="button"
              onClick={() => setShowPaperTrade(true)}
              className="w-full group p-3.5 rounded-2xl bg-gradient-to-r from-[var(--brand-primary)] via-indigo-600 to-[var(--brand-primary)] hover:brightness-110 text-white shadow-lg shadow-[var(--brand-primary)]/25 transition-all flex items-center justify-between cursor-pointer border border-white/15"
            >
              <div className="flex items-center gap-3 text-left min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold leading-tight flex items-center gap-1.5 truncate">
                    Start Paper Trade
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-400/25 text-emerald-200 border border-emerald-400/30 flex-shrink-0">
                      Zero Risk
                    </span>
                  </p>
                  <p className="text-[11px] text-white/80 mt-0.5 font-medium truncate">
                    Practice this setup with $10k virtual cash
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
            </button>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <PaperTradeOrderPanel
                currentInstrument={activeAsset.instrument}
                initialPrediction={activePrediction}
                onInstrumentChange={(newInst) => {
                  const found = ASSETS.find((a) => a.instrument === newInst);
                  if (found) setActiveAsset(found);
                }}
                onLevelsChange={setPaperDraft}
                onClose={() => setShowPaperTrade(false)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
        {STATS.map((s) => (
          <div key={s.label} className="px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{s.label}</span>
            <span className="text-xl font-extrabold font-mono-num" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{s.sub}</span>
          </div>
        ))}
      </div>

    </div>
  );
}
