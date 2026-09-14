import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, CheckCircle2, Clock,
  BarChart2, Code2, Sparkles, Layers, ChevronDown,
  RotateCcw, X,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { DirectionBadge, StatusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { usePredictions, useCreatePrediction } from '../../hooks/usePredictionsQuery';
import { useAuthStore } from '../../state/useAuthStore';
import { useMarketStore } from '../../state/useMarketStore';
import { useUIStore } from '../../state/useUIStore';
import { ZoneLinesChart } from '../../components/charts/ZoneLinesChart';
import { CHART_ITEMS } from '../../constants';
import type { PredictionDirection } from '../../types';

const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '4h', label: '4h' },
  { value: '6h', label: '6h' },
  { value: '12h', label: '12h' },
  { value: '1d', label: '1d' },
  { value: '3d', label: '3d' },
  { value: '1w', label: '1w' },
];

// ── TradingView iframe chart (official embed, no third-party wrapper) ─────────
const TV_INTERVAL_MAP: Record<string, string> = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360', '12h': '720',
  '1d': 'D', '3d': '3D', '1w': 'W',
};

const TradingViewChart: React.FC<{ symbol: string; interval: string; theme: string; height: number }> = ({
  symbol, interval, theme, height,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tvInterval = TV_INTERVAL_MAP[interval] ?? '60';
  const tvTheme = theme === 'neo-light' ? 'light' : 'dark';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: tvInterval,
      timezone: 'Etc/UTC',
      theme: tvTheme,
      style: '1',
      locale: 'en',
      allow_symbol_change: true,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget';
    wrapper.style.height = '100%';
    wrapper.style.width = '100%';
    container.appendChild(wrapper);
    container.appendChild(script);

    return () => { container.innerHTML = ''; };
  }, [symbol, tvInterval, tvTheme]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ height }}
    >
      <div ref={containerRef} className="tradingview-widget-container" style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default function TraderDashboardPage() {
  const { currentUser } = useAuthStore();
  const { tickers } = useMarketStore();
  const { addToast, theme } = useUIStore();
  const navigate = useNavigate();
  const createMutation = useCreatePrediction();

  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT');
  const [chartMode, setChartMode] = useState<'zonelines' | 'tradingview'>('zonelines');

  const { data, isLoading } = usePredictions({ page: 1, pageSize: 50 });
  const predictions = data?.data || [];
  const active = predictions.filter((p) => p.status === 'ACTIVE' || p.status === 'PUBLISHED');
  const closed = predictions.filter((p) => ['TARGET_HIT', 'STOP_HIT', 'CLOSED'].includes(p.status));

  const currentChartItem = CHART_ITEMS.find((item) => item.symbol === chartSymbol);
  const activeChartInstrument = currentChartItem?.instrument || 'BTC/USDT';

  // Form state
  const [panelInstrument, setPanelInstrument] = useState('BTC/USDT');
  const [direction, setDirection] = useState<PredictionDirection>('LONG');
  const [timeframe, setTimeframe] = useState('1h');
  const [isCustomTimeframe, setIsCustomTimeframe] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState('45');
  const [customTimeUnit, setCustomTimeUnit] = useState<'m' | 'h' | 'd'>('m');
  const [entryPrice, setEntryPrice] = useState('92500');
  const [buyingZone, setBuyingZone] = useState('89725');
  const [sellingZone, setSellingZone] = useState('98050');
  const [stopLoss, setStopLoss] = useState('88000');
  const [takeProfit1, setTakeProfit1] = useState('98050');
  const [takeProfit2, setTakeProfit2] = useState('');
  const [takeProfit3, setTakeProfit3] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [analysis, setAnalysis] = useState('');

  const effectiveTimeframe = isCustomTimeframe
    ? `${customTimeValue.trim() || '1'}${customTimeUnit}`
    : timeframe;

  const chartPrediction = useMemo(() => {
    return predictions.find(
      (p) =>
        p.instrument.toLowerCase() === activeChartInstrument.toLowerCase() &&
        (p.status === 'ACTIVE' || p.status === 'PUBLISHED')
    );
  }, [predictions, activeChartInstrument]);

  const existingPanelSetup = useMemo(() => {
    return predictions.find(
      (p) =>
        p.instrument.toLowerCase() === panelInstrument.toLowerCase() &&
        (p.status === 'ACTIVE' || p.status === 'PUBLISHED')
    );
  }, [predictions, panelInstrument]);

  const updatePricesForInstrument = (inst: string, dir: PredictionDirection) => {
    const ticker = tickers.find((t) => t.symbol === inst);
    let price = ticker?.price;
    if (!price) {
      if (inst === 'BTC/USDT') price = 92500;
      else if (inst === 'ETH/USDT') price = 3480;
      else if (inst === 'SOL/USDT') price = 186;
      else if (inst === 'XRP/USDT') price = 2.45;
      else if (inst === 'GOLD') price = 2684.5;
      else if (inst === 'SILVER') price = 31.85;
      else price = 100;
    }
    const d = inst === 'XRP/USDT' ? 4 : inst === 'SILVER' ? 3 : 2;
    setEntryPrice(price.toFixed(d));
    if (dir === 'LONG') {
      const bz = (price * 0.97).toFixed(d);
      const sz = (price * 1.06).toFixed(d);
      setBuyingZone(bz);
      setSellingZone(sz);
      setStopLoss((price * 0.95).toFixed(d));
      setTakeProfit1(sz);
      setTakeProfit2('');
      setTakeProfit3('');
    } else {
      const bz = (price * 0.94).toFixed(d);
      const sz = (price * 1.03).toFixed(d);
      setBuyingZone(bz);
      setSellingZone(sz);
      setStopLoss((price * 1.05).toFixed(d));
      setTakeProfit1(bz);
      setTakeProfit2('');
      setTakeProfit3('');
    }
  };

  const handleSelectPanelInstrument = (inst: string) => {
    setPanelInstrument(inst);
    updatePricesForInstrument(inst, direction);
  };

  const handleDirectionChange = (newDir: PredictionDirection) => {
    setDirection(newDir);
    updatePricesForInstrument(panelInstrument, newDir);
  };

  const handleResetForm = () => {
    updatePricesForInstrument(panelInstrument, 'LONG');
    setDirection('LONG');
    setTimeframe('1h');
    setIsCustomTimeframe(false);
    setAnalysis('');
    addToast({ type: 'info', title: 'Form Reset', message: `Reset parameters for ${panelInstrument}.` });
  };

  const buyNum = parseFloat(buyingZone) || 0;
  const sellNum = parseFloat(sellingZone) || 0;
  const slNum = parseFloat(stopLoss) || 0;
  const tp1Num = parseFloat(takeProfit1) || 0;
  const tp2Num = parseFloat(takeProfit2) || 0;
  const tp3Num = parseFloat(takeProfit3) || 0;
  const spreadPct = buyNum > 0 && sellNum > 0 ? ((sellNum - buyNum) / buyNum) * 100 : 0;

  const handlePublishPrediction = async () => {
    if (!buyNum || !sellNum || !slNum || !tp1Num) {
      addToast({ type: 'danger', title: 'Validation Error', message: 'Buying Wall, Selling Wall, Stop Loss and TP1 are required.' });
      return;
    }
    setIsPublishing(true);
    try {
      await createMutation.mutateAsync({
        title: `${panelInstrument} ${direction} (${effectiveTimeframe}) - Key Price Zones`,
        instrument: panelInstrument,
        category: panelInstrument === 'GOLD' || panelInstrument === 'SILVER' ? 'COMMODITIES' : 'CRYPTO',
        direction,
        entryPrice: parseFloat(entryPrice) || buyNum,
        buyingZone: buyNum,
        sellingZone: sellNum,
        stopLoss: slNum,
        takeProfit: tp1Num,
        takeProfit2: tp2Num || undefined,
        takeProfit3: tp3Num || undefined,
        timeframe: effectiveTimeframe,
        strategy: 'Key Price Zones',
        analysis: analysis.trim() || `Trade setup for ${panelInstrument} (${effectiveTimeframe}).\n- Buying Wall: ${buyNum.toLocaleString()}\n- Selling Wall: ${sellNum.toLocaleString()}\n- SL: ${slNum.toLocaleString()} | TP1: ${tp1Num.toLocaleString()}`,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        tags: [panelInstrument.split('/')[0], direction, effectiveTimeframe],
        traderId: currentUser?.id || '',
        trader: {
          id: currentUser?.id || '',
          displayName: currentUser?.name || 'TradeBeast Desk',
          handle: '@tradebeast',
          avatar: currentUser?.avatar || '/tradebeast-logo.png',
          verifiedBadge: true,
          winRate: 0,
        },
      });
      addToast({ type: 'success', title: 'Published!', message: `${panelInstrument} setup is now live.` });
    } catch {
      addToast({ type: 'danger', title: 'Publish Failed', message: 'Could not publish prediction. Please try again.' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trader Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage, analyze, and publish your trade setups.</p>
      </div>

      {/* Instrument + mode selector bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex gap-2">
          {CHART_ITEMS.map((item) => {
            const hasActiveSetup = predictions.some(
              (p) => p.instrument.toLowerCase() === item.instrument.toLowerCase() &&
                (p.status === 'ACTIVE' || p.status === 'PUBLISHED')
            );
            return (
              <button
                key={item.symbol}
                onClick={() => setChartSymbol(item.symbol)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                  chartSymbol === item.symbol
                    ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
                {hasActiveSetup && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_6px_var(--color-success)]" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex-shrink-0">
          <button
            onClick={() => setChartMode('zonelines')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
              chartMode === 'zonelines' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers className="w-3 h-3" /> Zone Lines
          </button>
          <button
            onClick={() => setChartMode('tradingview')}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
              chartMode === 'tradingview' ? 'bg-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            TradingView
          </button>
        </div>
      </div>

      {/* Chart + Create Panel — side by side */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Chart */}
        <div className="w-full">
          {chartMode === 'zonelines' ? (
            <ZoneLinesChart tvSymbol={chartSymbol} instrument={activeChartInstrument} prediction={chartPrediction} timeframe={effectiveTimeframe} height={620} />
          ) : (
            <TradingViewChart
              symbol={chartSymbol}
              interval={effectiveTimeframe}
              theme={theme}
              height={620}
            />
          )}
        </div>

        {/* Create Prediction Panel */}
        <GlassCard hoverEffect={false} className="flex flex-col gap-3 p-4 border border-[var(--border-subtle)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-glow)] rounded-full blur-3xl opacity-20 pointer-events-none -mr-6 -mt-6" />

          {/* Panel header */}
          <div className="flex items-center justify-between relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 min-w-0">
                <span className="truncate">Create Prediction</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 flex-shrink-0">
                  {panelInstrument}
                </span>
              </h3>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 truncate">Publish setup to member feeds</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--color-success)] flex-shrink-0 ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Instrument pills */}
          <div className="flex flex-wrap gap-1.5 relative z-10">
            {CHART_ITEMS.map((item) => {
              const hasSetup = predictions.some(
                (p) => p.instrument.toLowerCase() === item.instrument.toLowerCase() &&
                  (p.status === 'ACTIVE' || p.status === 'PUBLISHED')
              );
              return (
                <button
                  key={item.instrument}
                  onClick={() => handleSelectPanelInstrument(item.instrument)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                    panelInstrument === item.instrument
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.label}
                  {hasSetup && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />}
                </button>
              );
            })}
          </div>

          {/* Direction + Timeframe */}
          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)]">
              <span>Trade Bias</span>
              <span>Timeframe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-[var(--bg-secondary)] p-1 rounded-lg border border-[var(--border-subtle)] flex-1">
                <button
                  type="button"
                  onClick={() => handleDirectionChange('LONG')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    direction === 'LONG'
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/40'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" /> LONG
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange('SHORT')}
                  className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    direction === 'SHORT'
                      ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/40'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" /> SHORT
                </button>
              </div>

              {isCustomTimeframe ? (
                <div className="flex items-center gap-1 min-w-[140px]">
                  <input
                    type="number" min="1" value={customTimeValue}
                    onChange={(e) => setCustomTimeValue(e.target.value)}
                    className="w-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[var(--brand-primary)] text-center"
                  />
                  <div className="relative flex-1">
                    <select
                      value={customTimeUnit}
                      onChange={(e) => setCustomTimeUnit(e.target.value as any)}
                      className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none focus:border-[var(--brand-primary)] appearance-none pr-5 cursor-pointer"
                    >
                      <option value="m">mins</option>
                      <option value="h">hours</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-[var(--text-muted)] absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <button type="button" onClick={() => setIsCustomTimeframe(false)} className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative min-w-[130px]">
                  <select
                    value={timeframe}
                    onChange={(e) => { if (e.target.value === 'custom') setIsCustomTimeframe(true); else setTimeframe(e.target.value); }}
                    className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[var(--brand-primary)] appearance-none pr-7 cursor-pointer"
                  >
                    {TIMEFRAME_OPTIONS.map((tf) => <option key={tf.value} value={tf.value}>{tf.label}</option>)}
                    <option value="custom">+ Custom...</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>
          </div>

          {/* Buy / Sell zones */}
          <div className="grid grid-cols-2 gap-2 relative z-10">
            <div className="p-2 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 space-y-1 min-w-0">
              <label className="text-[10px] font-bold text-[var(--color-success)] block uppercase truncate">Buying Wall ($)</label>
              <input type="number" step="any" value={buyingZone} onChange={(e) => setBuyingZone(e.target.value)}
                className="w-full min-w-0 bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--color-success)] focus:outline-none focus:border-[var(--color-success)]/60" />
            </div>
            <div className="p-2 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 space-y-1 min-w-0">
              <label className="text-[10px] font-bold text-[var(--color-danger)] block uppercase truncate">Selling Wall ($)</label>
              <input type="number" step="any" value={sellingZone} onChange={(e) => setSellingZone(e.target.value)}
                className="w-full min-w-0 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--color-danger)] focus:outline-none focus:border-[var(--color-danger)]/60" />
            </div>
          </div>

          {/* Entry + Spread */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 relative z-10 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] flex-shrink-0">Entry:</span>
              <input type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] focus:outline-none" />
            </div>
            <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 ${spreadPct >= 0 ? 'text-[var(--color-success)] bg-[var(--color-success-bg)]' : 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]'}`}>
              {spreadPct >= 0 ? '+' : ''}{spreadPct.toFixed(2)}%
            </span>
          </div>

          {/* SL + TP1 */}
          <div className="grid grid-cols-2 gap-2 relative z-10">
            <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
              <label className="text-[10px] font-bold text-orange-400 block uppercase truncate">Stop Loss ($)</label>
              <input type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
                className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-orange-400 focus:outline-none focus:border-orange-400/50" />
            </div>
            <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
              <label className="text-[10px] font-bold text-emerald-400 block uppercase truncate">TP1 ($) *</label>
              <input type="number" step="any" value={takeProfit1} onChange={(e) => setTakeProfit1(e.target.value)}
                className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-400/50" />
            </div>
          </div>

          {/* TP2 + TP3 */}
          <div className="grid grid-cols-2 gap-2 relative z-10">
            <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase truncate">TP2 ($) opt.</label>
              <input type="number" step="any" value={takeProfit2} onChange={(e) => setTakeProfit2(e.target.value)}
                placeholder="—"
                className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-strong)] placeholder:text-[var(--text-muted)]" />
            </div>
            <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
              <label className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase truncate">TP3 ($) opt.</label>
              <input type="number" step="any" value={takeProfit3} onChange={(e) => setTakeProfit3(e.target.value)}
                placeholder="—"
                className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-strong)] placeholder:text-[var(--text-muted)]" />
            </div>
          </div>

          {/* Analysis */}
          <div className="space-y-1 relative z-10">
            <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">Analysis Notes</label>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder="Add trade reasoning, key levels, confluence factors..."
              rows={3}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] resize-none transition-all scrollbar-thin"
            />
          </div>

          {/* Existing setup notice */}
          {existingPanelSetup ? (
            <div className="px-2.5 py-1.5 rounded-lg bg-[var(--brand-glow)] border border-[var(--brand-primary)]/20 text-[11px] text-[var(--text-secondary)] flex items-center justify-between relative z-10">
              <span>Active: <strong className="text-[var(--text-primary)]">{existingPanelSetup.direction} ({existingPanelSetup.timeframe})</strong></span>
              <span className="text-[10px] text-[var(--brand-primary)] font-bold uppercase">Overwrites</span>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-muted)] text-center relative z-10">
              No active setup for <span className="font-semibold text-[var(--text-secondary)]">{panelInstrument}</span>. Ready to publish.
            </p>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)] relative z-10">
            <Button
              variant="primary" size="sm"
              className="flex-1 justify-center text-xs"
              leftIcon={<Sparkles className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />}
              onClick={handlePublishPrediction}
              disabled={isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish Prediction'}
            </Button>
            <button
              type="button" onClick={handleResetForm}
              className="px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </GlassCard>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Predictions" value={predictions.length} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Active / Published" value={active.length} icon={<Clock className="w-5 h-5" />} />
        <StatCard title="Closed" value={closed.length} icon={<CheckCircle2 className="w-5 h-5" />} />
        <StatCard title="Win Rate" value="—" change="Calculated from closed signals" icon={<BarChart2 className="w-5 h-5" />} />
      </div>

      {/* Recent predictions + quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">My Recent Predictions</h2>
            <Link to="/trader/predictions" className="text-xs text-[var(--brand-primary)] hover:underline">Manage all →</Link>
          </div>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
            : predictions.length === 0
            ? <GlassCard hoverEffect={false}><p className="text-sm text-[var(--text-muted)] text-center py-2">No predictions yet.</p></GlassCard>
            : predictions.slice(0, 5).map((p) => (
              <GlassCard key={p.id} className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/predictions/${p.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-muted)] mb-1 truncate">{p.instrument} · {p.timeframe}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.title}</p>
                  {(p.stopLoss || p.takeProfit) && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                      {p.stopLoss && <span className="text-[10px] font-mono text-orange-400 whitespace-nowrap">SL: {p.stopLoss.toLocaleString()}</span>}
                      {p.takeProfit && <span className="text-[10px] font-mono text-emerald-400 whitespace-nowrap">TP1: {p.takeProfit.toLocaleString()}</span>}
                      {p.takeProfit2 && <span className="text-[10px] font-mono text-emerald-300 whitespace-nowrap">TP2: {p.takeProfit2.toLocaleString()}</span>}
                      {p.takeProfit3 && <span className="text-[10px] font-mono text-emerald-200 whitespace-nowrap">TP3: {p.takeProfit3.toLocaleString()}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <DirectionBadge direction={p.direction} />
                  <StatusBadge status={p.status} />
                </div>
              </GlassCard>
            ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Quick Actions</h2>
          <div className="space-y-3">
            {[
              { label: 'View Performance', icon: <BarChart2 className="w-5 h-5" />, path: '/trader/performance' },
              { label: 'Contact Developer Team', icon: <Code2 className="w-5 h-5" />, path: '/contact?dept=dev' },
            ].map((action) => (
              <Button key={action.path} variant="secondary" className="w-full justify-start" leftIcon={action.icon} onClick={() => navigate(action.path)}>
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
