import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Sparkles, RotateCcw,
  ChevronDown, X, ArrowLeft, Wallet, ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { usePaperTradingStore } from '../../state/usePaperTradingStore';
import { useMarketStore } from '../../state/useMarketStore';
import { useUIStore } from '../../state/useUIStore';
import { CHART_ITEMS } from '../../constants';
import type { Prediction, PredictionDirection } from '../../types';

const TIMEFRAME_OPTIONS = [
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

export interface PaperTradeDraftLevels {
  instrument: string;
  direction: PredictionDirection;
  entryPrice: number;
  buyingZone: number;
  sellingZone: number;
  stopLoss: number;
  takeProfit: number;
  takeProfit2?: number;
  takeProfit3?: number;
  timeframe: string;
}

interface PaperTradeOrderPanelProps {
  currentInstrument?: string;
  initialPrediction?: Prediction | null;
  onInstrumentChange?: (instrument: string) => void;
  onLevelsChange?: (draft: PaperTradeDraftLevels) => void;
  onTradeExecuted?: (tradeId: string) => void;
  onBackToAI?: () => void;
  onClose?: () => void;
  className?: string;
}

export const PaperTradeOrderPanel: React.FC<PaperTradeOrderPanelProps> = ({
  currentInstrument = 'BTC/USDT',
  initialPrediction,
  onInstrumentChange,
  onLevelsChange,
  onTradeExecuted,
  onBackToAI,
  onClose,
  className = '',
}) => {
  const { tickers } = useMarketStore();
  const { openTrade } = usePaperTradingStore();
  const { addToast } = useUIStore();

  const [panelInstrument, setPanelInstrument] = useState(currentInstrument);
  const [direction, setDirection] = useState<PredictionDirection>(initialPrediction?.direction || 'LONG');
  const [timeframe, setTimeframe] = useState(initialPrediction?.timeframe || '1h');
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
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveTimeframe = isCustomTimeframe
    ? `${customTimeValue.trim() || '1'}${customTimeUnit}`
    : timeframe;

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

  // Sync if parent changes instrument
  useEffect(() => {
    if (currentInstrument && currentInstrument !== panelInstrument) {
      setPanelInstrument(currentInstrument);
      updatePricesForInstrument(currentInstrument, direction);
    }
  }, [currentInstrument]);

  // If initial prediction is provided, pre-populate
  useEffect(() => {
    if (initialPrediction) {
      if (initialPrediction.instrument) setPanelInstrument(initialPrediction.instrument);
      if (initialPrediction.direction) setDirection(initialPrediction.direction);
      if (initialPrediction.timeframe) setTimeframe(initialPrediction.timeframe);
      if (initialPrediction.entryPrice) setEntryPrice(String(initialPrediction.entryPrice));
      if (initialPrediction.buyingZone) setBuyingZone(String(initialPrediction.buyingZone));
      if (initialPrediction.sellingZone) setSellingZone(String(initialPrediction.sellingZone));
      if (initialPrediction.stopLoss) setStopLoss(String(initialPrediction.stopLoss));
      if (initialPrediction.takeProfit) setTakeProfit1(String(initialPrediction.takeProfit));
      if (initialPrediction.takeProfit2) setTakeProfit2(String(initialPrediction.takeProfit2));
      if (initialPrediction.takeProfit3) setTakeProfit3(String(initialPrediction.takeProfit3));
    } else {
      updatePricesForInstrument(panelInstrument, direction);
    }
  }, [initialPrediction?.id]);

  const handleSelectInstrument = (inst: string) => {
    setPanelInstrument(inst);
    updatePricesForInstrument(inst, direction);
    onInstrumentChange?.(inst);
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
    setNotes('');
    addToast({ type: 'info', title: 'Form Reset', message: `Reset paper trade parameters for ${panelInstrument}.` });
  };

  const buyNum = parseFloat(buyingZone) || 0;
  const sellNum = parseFloat(sellingZone) || 0;
  const slNum = parseFloat(stopLoss) || 0;
  const tp1Num = parseFloat(takeProfit1) || 0;
  const tp2Num = parseFloat(takeProfit2) || 0;
  const tp3Num = parseFloat(takeProfit3) || 0;
  const entryNum = parseFloat(entryPrice) || buyNum;

  const spreadPct = buyNum > 0 && sellNum > 0 ? ((sellNum - buyNum) / buyNum) * 100 : 0;

  // Notify parent of draft levels for live chart overlay
  useEffect(() => {
    if (onLevelsChange && entryNum > 0) {
      onLevelsChange({
        instrument: panelInstrument,
        direction,
        entryPrice: entryNum,
        buyingZone: buyNum,
        sellingZone: sellNum,
        stopLoss: slNum,
        takeProfit: tp1Num,
        takeProfit2: tp2Num || undefined,
        takeProfit3: tp3Num || undefined,
        timeframe: effectiveTimeframe,
      });
    }
  }, [panelInstrument, direction, entryNum, buyNum, sellNum, slNum, tp1Num, tp2Num, tp3Num, effectiveTimeframe]);

  const handleExecutePaperTrade = () => {
    if (!entryNum || !slNum || !tp1Num) {
      addToast({ type: 'danger', title: 'Validation Error', message: 'Entry Price, Stop Loss, and TP1 are required.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const tradeId = openTrade({
        instrument: panelInstrument,
        direction,
        entryPrice: entryNum,
        quantity: 1,
        stopLoss: slNum,
        takeProfit: tp1Num,
        takeProfit2: tp2Num || undefined,
        takeProfit3: tp3Num || undefined,
        buyingZone: buyNum || undefined,
        sellingZone: sellNum || undefined,
        margin: 0,
        timeframe: effectiveTimeframe,
        notes: notes.trim() || undefined,
      });

      if (tradeId) {
        addToast({
          type: 'success',
          title: 'Trade Published! 🎉',
          message: `${direction} position on ${panelInstrument} has been published.`,
        });
        onTradeExecuted?.(tradeId);
      } else {
        addToast({ type: 'danger', title: 'Publish Failed', message: 'Could not publish trade. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GlassCard hoverEffect={false} className={`flex flex-col gap-3 p-4 border border-[var(--border-subtle)] relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-glow)] rounded-full blur-3xl opacity-20 pointer-events-none -mr-6 -mt-6" />

      {/* Panel header */}
      <div className="flex items-center justify-between relative z-10 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {onBackToAI && (
              <button
                type="button"
                onClick={onBackToAI}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
                title="Back to AI Analysis"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
            )}
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 min-w-0">
              <span className="truncate">Paper Trade Order</span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 flex-shrink-0">
                {panelInstrument}
              </span>
            </h3>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-muted)]">
            <span className="text-[10px] font-semibold text-[var(--text-muted)]">Simulated trading</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--brand-primary)] px-2 py-0.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
            <ShieldCheck className="w-3 h-3" />
            SIMULATED
          </span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-all cursor-pointer"
              title="Close Paper Trade"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Instrument pills */}
      <div className="flex flex-wrap gap-1.5 relative z-10">
        {CHART_ITEMS.map((item) => (
          <button
            key={item.instrument}
            type="button"
            onClick={() => handleSelectInstrument(item.instrument)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
              panelInstrument === item.instrument
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
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
                type="number"
                min="1"
                value={customTimeValue}
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
              <button
                type="button"
                onClick={() => setIsCustomTimeframe(false)}
                className="p-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="relative min-w-[130px]">
              <select
                value={timeframe}
                onChange={(e) => {
                  if (e.target.value === 'custom') setIsCustomTimeframe(true);
                  else setTimeframe(e.target.value);
                }}
                className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:border-[var(--brand-primary)] appearance-none pr-7 cursor-pointer"
              >
                {TIMEFRAME_OPTIONS.map((tf) => (
                  <option key={tf.value} value={tf.value}>{tf.label}</option>
                ))}
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
          <input
            type="number"
            step="any"
            value={buyingZone}
            onChange={(e) => setBuyingZone(e.target.value)}
            className="w-full min-w-0 bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--color-success)] focus:outline-none focus:border-[var(--color-success)]/60"
          />
        </div>
        <div className="p-2 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 space-y-1 min-w-0">
          <label className="text-[10px] font-bold text-[var(--color-danger)] block uppercase truncate">Selling Wall ($)</label>
          <input
            type="number"
            step="any"
            value={sellingZone}
            onChange={(e) => setSellingZone(e.target.value)}
            className="w-full min-w-0 bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--color-danger)] focus:outline-none focus:border-[var(--color-danger)]/60"
          />
        </div>
      </div>

      {/* Entry + Spread */}
      <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-between gap-2 relative z-10 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-[var(--text-muted)] flex-shrink-0">Entry:</span>
          <input
            type="number"
            step="any"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-mono text-xs font-bold text-[var(--text-primary)] focus:outline-none"
          />
        </div>
        <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded flex-shrink-0 ${
          spreadPct >= 0 ? 'text-[var(--color-success)] bg-[var(--color-success-bg)]' : 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]'
        }`}>
          {spreadPct >= 0 ? '+' : ''}{spreadPct.toFixed(2)}%
        </span>
      </div>

      {/* SL + TP1 */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
          <label className="text-[10px] font-bold text-orange-400 block uppercase truncate">Stop Loss ($) *</label>
          <input
            type="number"
            step="any"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-orange-400 focus:outline-none focus:border-orange-400/50"
          />
        </div>
        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
          <label className="text-[10px] font-bold text-emerald-400 block uppercase truncate">TP1 ($) *</label>
          <input
            type="number"
            step="any"
            value={takeProfit1}
            onChange={(e) => setTakeProfit1(e.target.value)}
            className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-emerald-400 focus:outline-none focus:border-emerald-400/50"
          />
        </div>
      </div>

      {/* TP2 + TP3 */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase truncate">TP2 ($) opt.</label>
          <input
            type="number"
            step="any"
            value={takeProfit2}
            onChange={(e) => setTakeProfit2(e.target.value)}
            placeholder="—"
            className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-strong)] placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-1 min-w-0">
          <label className="text-[10px] font-semibold text-[var(--text-muted)] block uppercase truncate">TP3 ($) opt.</label>
          <input
            type="number"
            step="any"
            value={takeProfit3}
            onChange={(e) => setTakeProfit3(e.target.value)}
            placeholder="—"
            className="w-full min-w-0 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2 py-1 font-mono text-xs font-bold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-strong)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1 relative z-10">
        <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
          Trade Notes / Reason
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why are you taking this paper trade? (confluence, levels, strategy)"
          rows={2}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] resize-none transition-all scrollbar-thin"
        />
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)] relative z-10">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 justify-center text-xs"
          leftIcon={<Sparkles className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />}
          onClick={handleExecutePaperTrade}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Executing...' : `Execute Paper Trade (${direction})`}
        </Button>
        <button
          type="button"
          onClick={handleResetForm}
          className="px-2.5 py-2 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>
    </GlassCard>
  );
};
