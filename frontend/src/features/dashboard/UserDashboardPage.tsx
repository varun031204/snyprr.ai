import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export default function UserDashboardPage() {
  const { currentUser } = useAuthStore();
  const { data: predsData } = usePredictions({ pageSize: 50 });
  const { tickers } = useMarketStore();
  const { theme } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeAsset, setActiveAsset] = useState<(typeof ASSETS)[number]>(ASSETS[0]);
  const [timeframe, setTimeframe] = useState('1h');
  const [showPaperTrade, setShowPaperTrade] = useState(false);
  const [paperDraft, setPaperDraft] = useState<PaperTradeDraftLevels | null>(null);

  const paperTradeRef = useRef<HTMLDivElement>(null);

  // Auto-open paper trade panel when ?paper=1 is in the URL.
  // Runs on every location.search change so it fires even when already on /dashboard.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('paper') === '1') {
      setShowPaperTrade(true);
      navigate('/dashboard', { replace: true });
      setTimeout(() => {
        paperTradeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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
      </div>

      <div className="relative z-10 overflow-x-auto scrollbar-thin">
        <div className="flex items-stretch gap-2 min-w-max">
          {tickers.slice(0, 6).map((t) => {
            return (
              <button
                key={t.symbol}
                onClick={() => {
                  const asset = ASSETS.find((a) => a.instrument === t.symbol);
                  if (asset) setActiveAsset(asset);
                }}
                className={`flex items-center px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${
                  activeAsset.instrument === t.symbol
                    ? 'bg-[var(--brand-glow)] border-[var(--brand-primary)]/40'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wide">{t.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chart + AI Panel ── */}
      <div className="flex flex-row gap-4 items-start relative z-10">

        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 flex-wrap">
            {['5m','15m','30m','1h','2h','4h','1d','1w'].map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                  timeframe === tf
                    ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm shadow-[var(--brand-glow)]'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <TradingChartPro
            tvSymbol={activeAsset.symbol}
            instrument={activeAsset.instrument}
            prediction={effectiveChartPrediction}
            timeframe={timeframe}
            height={580}
            predictionId={effectiveChartPrediction?.id ?? activeAsset.instrument}
          />


        </div>

        {/* Right Column: AI Analysis + Paper Trade below it */}
        <div className="w-[340px] lg:w-[380px] flex-shrink-0 space-y-3 mt-[44px]">
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
          <div ref={paperTradeRef}>
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
      </div>

    </div>
  );
}
