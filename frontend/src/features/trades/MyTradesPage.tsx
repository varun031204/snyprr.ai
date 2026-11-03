/**
 * MyTradesPage — Paper Trading Terminal
 *
 * Professional exchange-style interface using the server-side paper trading engine.
 * All balance changes go through the backend API (no localStorage for balances).
 *
 * Architecture:
 * - useMarketStore  → live WebSocket prices from Binance Vision CDN
 * - usePaperTradingQuery → React Query hooks for all backend state
 * - ZoneLinesChart  → lightweight-charts with live candles + overlay lines
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, X, RotateCcw, AlertTriangle,
  CheckCircle2, Wallet, Trophy, BookOpen, History, BarChart2,
  ShieldCheck, Info, ChevronDown, Clock,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ZoneLinesChart } from '../../components/charts/ZoneLinesChart';
import { useMarketStore } from '../../state/useMarketStore';
import { CHART_ITEMS } from '../../constants';
import {
  usePaperAccount, usePaperPositions, usePaperHistory, usePaperLedger,
  useOpenPaperPosition, useClosePaperPosition, useResetPaperAccount,
  triggerPriceEvaluation,
  type PaperPosition, type PaperDirection,
} from '../../hooks/usePaperTradingQuery';
import type { Prediction } from '../../types';

// ─── Constants ────────────────────────────────────────────────────────────────
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];
const FEE_RATE = 0.0005;  // 0.05% — matches backend

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtUsd = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPrice = (n: number | string, ins: string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  const d = ins === 'XRP/USDT' ? 4 : ins === 'SILVER' ? 3 : 2;
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const pnlCls = (n: number) =>
  n > 0 ? 'text-[var(--color-success)]' : n < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]';
const pnlBgCls = (n: number) =>
  n > 0 ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30 text-[var(--color-success)]'
    : n < 0 ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 text-[var(--color-danger)]'
      : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)]';

// ─── Build chart overlay from open position ───────────────────────────────────
function positionToChartOverlay(pos: PaperPosition): Prediction {
  return {
    id: pos.id,
    traderId: 'paper',
    trader: { id: 'paper', displayName: 'Paper', handle: '@paper', avatar: '', verifiedBadge: false, winRate: 0 },
    title: '', instrument: pos.instrument, category: 'CRYPTO',
    direction: pos.direction as any,
    entryPrice: parseFloat(pos.entry_price),
    buyingZone: pos.direction === 'LONG' ? parseFloat(pos.entry_price) : undefined,
    sellingZone: pos.direction === 'SHORT' ? parseFloat(pos.entry_price) : undefined,
    stopLoss: pos.stop_loss ? parseFloat(pos.stop_loss) : undefined,
    takeProfit: pos.take_profit_1 ? parseFloat(pos.take_profit_1) : undefined,
    takeProfit2: pos.take_profit_2 ? parseFloat(pos.take_profit_2) : undefined,
    takeProfit3: pos.take_profit_3 ? parseFloat(pos.take_profit_3) : undefined,
    timeframe: '1h', strategy: 'Paper', analysis: '', tags: [],
    status: 'ACTIVE', visibility: 'PUBLIC',
    createdAt: pos.opened_at, updatedAt: pos.opened_at,
    likesCount: 0, viewsCount: 0,
  };
}

// ─── Close Position Modal ────────────────────────────────────────────────────
const CloseModal: React.FC<{
  pos: PaperPosition;
  livePrice: number;
  onCancel: () => void;
  onConfirm: (price: number) => void;
  isPending: boolean;
}> = ({ pos, livePrice, onCancel, onConfirm, isPending }) => {
  const [price, setPrice] = useState(livePrice > 0 ? livePrice.toFixed(2) : '');
  const p = parseFloat(price) || 0;
  const size = parseFloat(pos.size);
  const entry = parseFloat(pos.entry_price);
  const pnl = p > 0
    ? (pos.direction === 'LONG' ? (p - entry) * size : (entry - p) * size)
    : 0;
  const pnlPct = parseFloat(pos.margin_usd) > 0 ? (pnl / parseFloat(pos.margin_usd) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Close {pos.instrument} <span className={pos.direction === 'LONG' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>{pos.direction}</span>
            {pos.leverage > 1 && <span className="ml-2 text-amber-400 text-xs">{pos.leverage}×</span>}
          </h3>
          <button onClick={onCancel} disabled={isPending} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Position summary */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: 'Entry', value: `$${fmtPrice(pos.entry_price, pos.instrument)}` },
            { label: 'Notional', value: fmtUsd(parseFloat(pos.notional_usd)) },
            { label: 'Margin', value: fmtUsd(parseFloat(pos.margin_usd)) },
            { label: 'Liq. Price', value: `$${fmtPrice(pos.liquidation_price, pos.instrument)}`, danger: true },
          ].map(({ label, value, danger }) => (
            <div key={label} className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-muted)]">{label}</p>
              <p className={`font-bold font-mono-num mt-0.5 ${danger ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Close at Market Price ($)</label>
          <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-primary)]" />
          {livePrice > 0 && (
            <button type="button" onClick={() => setPrice(livePrice.toFixed(2))}
              className="text-[10px] text-[var(--brand-primary)] font-semibold hover:underline cursor-pointer">
              Use live price ${fmtPrice(livePrice, pos.instrument)}
            </button>
          )}
        </div>

        {p > 0 && (
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border font-mono-num ${pnlBgCls(pnl)}`}>
            <span className="text-xs font-semibold">Estimated P&L</span>
            <span className="text-sm font-bold">{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
          </div>
        )}

        <p className="text-[10px] text-[var(--text-muted)] text-center">
          0.05% close fee applies · Final P&L calculated server-side
        </p>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={onCancel} disabled={isPending}>Cancel</Button>
          <Button variant={pnl >= 0 ? 'primary' : 'danger'} size="sm" className="flex-1 justify-center"
            onClick={() => onConfirm(p)} disabled={p <= 0 || isPending} isLoading={isPending}>
            Confirm Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Order Form ───────────────────────────────────────────────────────────────
interface OrderFormProps {
  instrument: string;
  livePrice: number;
  balance: number;
  isSubmitting: boolean;
  onSubmit: (p: {
    direction: PaperDirection; notionalUsd: number; leverage: number;
    stopLoss: number | null; takeProfit1: number | null;
    takeProfit2: number | null; takeProfit3: number | null; note: string;
  }) => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ instrument, livePrice, balance, isSubmitting, onSubmit }) => {
  const [direction, setDirection] = useState<PaperDirection>('LONG');
  const [sizeUsd, setSizeUsd] = useState('500');
  const [leverage, setLeverage] = useState(1);
  const [sl, setSl] = useState('');
  const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState('');
  const [tp3, setTp3] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Auto-fill SL/TP on instrument/direction/price change
  useEffect(() => {
    if (livePrice <= 0) return;
    const d = instrument === 'XRP/USDT' ? 4 : 2;
    if (direction === 'LONG') {
      setSl((livePrice * 0.97).toFixed(d));
      setTp1((livePrice * 1.05).toFixed(d));
    } else {
      setSl((livePrice * 1.03).toFixed(d));
      setTp1((livePrice * 0.95).toFixed(d));
    }
    setTp2(''); setTp3('');
  }, [instrument, direction, livePrice]);

  const notional = parseFloat(sizeUsd) || 0;
  const margin = notional > 0 ? notional / leverage : 0;
  const units = livePrice > 0 && notional > 0 ? notional / livePrice : 0;
  const fee = notional * FEE_RATE;
  const totalDeduction = margin + fee;
  const liqPrice = livePrice > 0 && leverage > 1
    ? direction === 'LONG' ? livePrice * (1 - 1 / leverage) : livePrice * (1 + 1 / leverage)
    : null;

  // Potential P&L preview
  const slNum = parseFloat(sl) || null;
  const tp1Num = parseFloat(tp1) || null;
  const potLoss = slNum && livePrice > 0 ? Math.abs(livePrice - slNum) / livePrice * notional : null;
  const potProfit = tp1Num && livePrice > 0 ? Math.abs(tp1Num - livePrice) / livePrice * notional : null;
  const rr = potLoss && potProfit ? (potProfit / potLoss).toFixed(2) : null;

  const handleSubmit = () => {
    setError('');
    if (notional <= 0) return setError('Enter a valid order size');
    if (livePrice <= 0) return setError('Waiting for live price…');
    if (totalDeduction > balance) return setError(`Insufficient balance. Need ${fmtUsd(totalDeduction)}`);

    onSubmit({
      direction,
      notionalUsd: notional,
      leverage,
      stopLoss: sl ? parseFloat(sl) : null,
      takeProfit1: tp1 ? parseFloat(tp1) : null,
      takeProfit2: tp2 ? parseFloat(tp2) : null,
      takeProfit3: tp3 ? parseFloat(tp3) : null,
      note: note.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Direction */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
        {(['LONG', 'SHORT'] as PaperDirection[]).map(d => (
          <button key={d} type="button" onClick={() => setDirection(d)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${direction === d
              ? d === 'LONG' ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-danger)] text-white'
              : d === 'LONG' ? 'text-[var(--text-muted)] hover:text-[var(--color-success)]' : 'text-[var(--text-muted)] hover:text-[var(--color-danger)]'
              }`}>
            {d === 'LONG' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {d === 'LONG' ? 'Buy / Long' : 'Sell / Short'}
          </button>
        ))}
      </div>

      {/* Market price */}
      <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <span className="text-[11px] text-[var(--text-muted)]">Market Price</span>
        <div className="flex items-center gap-1.5">
          {livePrice > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />}
          <span className="text-sm font-extrabold font-mono-num text-[var(--text-primary)]">
            {livePrice > 0 ? `$${fmtPrice(livePrice, instrument)}` : '—'}
          </span>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-muted)]">Order Size (USD)</label>
          <div className="flex gap-1">
            {[10, 25, 50, 100].map(pct => (
              <button key={pct} type="button"
                onClick={() => setSizeUsd((balance * leverage * pct / 100).toFixed(2))}
                className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--brand-primary)] font-bold hover:bg-[var(--brand-glow)] cursor-pointer transition-all">
                {pct}%
              </button>
            ))}
          </div>
        </div>
        <input type="number" step="any" min="1" value={sizeUsd} onChange={e => setSizeUsd(e.target.value)}
          className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono-num font-semibold focus:outline-none focus:border-[var(--brand-primary)]" />
        {livePrice > 0 && notional > 0 && (
          <p className="text-[10px] text-[var(--text-muted)]">
            ≈ {units.toFixed(5)} {instrument.split('/')[0]}
            {leverage > 1 && <span className="ml-1.5 text-amber-400 font-semibold"> · Margin: {fmtUsd(margin)}</span>}
            <span className="ml-1.5 text-[var(--text-muted)]"> · Fee: {fmtUsd(fee)}</span>
          </p>
        )}
      </div>

      {/* Leverage */}
      <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-muted)]">Leverage</label>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full transition-colors ${leverage >= 20 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            : leverage >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'}`}>
            {leverage}×
          </span>
        </div>
        <input type="range" min={1} max={100} step={1} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--brand-primary)]"
          style={{ background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${leverage}%, var(--bg-surface) ${leverage}%, var(--bg-surface) 100%)` }} />
        <div className="flex gap-1 flex-wrap">
          {LEVERAGE_OPTIONS.map(lv => (
            <button key={lv} type="button" onClick={() => setLeverage(lv)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${leverage === lv
                ? lv >= 20 ? 'bg-[var(--color-danger)] text-white' : lv >= 5 ? 'bg-amber-500 text-white' : 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {lv}×
            </button>
          ))}
        </div>
        {liqPrice != null && livePrice > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--color-danger)] font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Liq. Price
            </span>
            <span className="text-[10px] font-extrabold font-mono-num text-[var(--color-danger)]">
              ${fmtPrice(liqPrice, instrument)}
            </span>
          </div>
        )}
      </div>

      {/* SL / TP1 (always shown) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-orange-400">Stop Loss ($)</label>
          <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} placeholder="Optional"
            className="w-full bg-[var(--bg-secondary)] border border-orange-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-orange-400 focus:outline-none focus:border-orange-400 placeholder:text-[var(--text-muted)]" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-emerald-400">Take Profit 1 ($)</label>
          <input type="number" step="any" value={tp1} onChange={e => setTp1(e.target.value)} placeholder="Optional"
            className="w-full bg-[var(--bg-secondary)] border border-emerald-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-emerald-400 focus:outline-none focus:border-emerald-400 placeholder:text-[var(--text-muted)]" />
        </div>
      </div>

      {/* TP2 + TP3 + Note (collapsible) */}
      <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
        <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        {showAdvanced ? 'Hide' : 'Show'} TP2 · TP3 · Note
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-teal-400">Take Profit 2 ($)</label>
            <input type="number" step="any" value={tp2} onChange={e => setTp2(e.target.value)} placeholder="Optional"
              className="w-full bg-[var(--bg-secondary)] border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-teal-400 focus:outline-none focus:border-teal-400 placeholder:text-[var(--text-muted)]" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-cyan-400">Take Profit 3 ($)</label>
            <input type="number" step="any" value={tp3} onChange={e => setTp3(e.target.value)} placeholder="Optional"
              className="w-full bg-[var(--bg-secondary)] border border-cyan-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-cyan-400 focus:outline-none focus:border-cyan-400 placeholder:text-[var(--text-muted)]" />
          </div>
          <div className="col-span-2">
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Trade note (optional, 280 chars)"
              maxLength={280}
              className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-muted)]" />
          </div>
        </div>
      )}

      {/* R:R preview */}
      {rr && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs">
          <span className="text-[var(--text-muted)]">Risk:Reward</span>
          <span className="font-bold text-[var(--text-primary)]">1:{rr}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      <Button variant={direction === 'LONG' ? 'primary' : 'danger'} size="md"
        className="w-full justify-center"
        leftIcon={direction === 'LONG' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        onClick={handleSubmit} disabled={livePrice <= 0 || isSubmitting} isLoading={isSubmitting}>
        {direction === 'LONG' ? 'Buy' : 'Sell'} {instrument.split('/')[0]}
        {leverage > 1 && <span className="ml-1 opacity-80 font-mono">{leverage}×</span>}
      </Button>

      {/* Balance info */}
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--text-muted)] flex items-center gap-1"><Wallet className="w-3 h-3" /> Available</span>
          <span className="font-bold font-mono-num text-[var(--text-primary)]">{fmtUsd(balance)}</span>
        </div>
        {leverage > 1 && margin > 0 && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--text-muted)]">Margin required</span>
            <span className="font-bold font-mono-num text-amber-400">{fmtUsd(margin)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--text-muted)]">Estimated fee</span>
          <span className="font-semibold font-mono-num text-[var(--text-muted)]">{fmtUsd(fee)}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Position Card ────────────────────────────────────────────────────────────
const PositionCard: React.FC<{
  pos: PaperPosition; livePrice: number; onClose: () => void;
}> = ({ pos, livePrice, onClose }) => {
  const size = parseFloat(pos.size);
  const entry = parseFloat(pos.entry_price);
  const pnl = livePrice > 0
    ? (pos.direction === 'LONG' ? (livePrice - entry) * size : (entry - livePrice) * size)
    : null;
  const pnlPct = pnl != null ? (pnl / parseFloat(pos.margin_usd) * 100) : null;
  const liqPct = livePrice > 0
    ? Math.abs(livePrice - parseFloat(pos.liquidation_price)) / livePrice * 100
    : null;

  return (
    <div className="px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-[var(--text-primary)]">{pos.instrument}</span>
            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
              {pos.direction}
            </span>
            {pos.leverage > 1 && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${pos.leverage >= 20 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : 'bg-amber-500/10 text-amber-400'}`}>
                {pos.leverage}×
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mt-1 font-mono flex-wrap">
            <span>Entry <strong className="text-[var(--text-primary)]">${fmtPrice(entry, pos.instrument)}</strong></span>
            {livePrice > 0 && <span>Mark <strong className="text-[var(--text-primary)]">${fmtPrice(livePrice, pos.instrument)}</strong></span>}
            <span>Notional <strong className="text-[var(--text-primary)]">{fmtUsd(parseFloat(pos.notional_usd))}</strong></span>
            <span>Margin <strong className="text-amber-400">{fmtUsd(parseFloat(pos.margin_usd))}</strong></span>
          </div>
          {(pos.stop_loss || pos.take_profit_1 || pos.leverage > 1) && (
            <div className="flex items-center gap-2 text-[10px] mt-1 flex-wrap font-mono">
              {pos.stop_loss && <span className="text-orange-400">SL ${fmtPrice(parseFloat(pos.stop_loss), pos.instrument)}</span>}
              {pos.take_profit_1 && <span className="text-emerald-400">TP1 ${fmtPrice(parseFloat(pos.take_profit_1), pos.instrument)}</span>}
              {pos.take_profit_2 && <span className="text-teal-400">TP2 ${fmtPrice(parseFloat(pos.take_profit_2), pos.instrument)}</span>}
              {pos.take_profit_3 && <span className="text-cyan-400">TP3 ${fmtPrice(parseFloat(pos.take_profit_3), pos.instrument)}</span>}
              {pos.leverage > 1 && <span className="text-[var(--color-danger)]">Liq ${fmtPrice(parseFloat(pos.liquidation_price), pos.instrument)}</span>}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          {pnl != null && (
            <div className="text-right font-mono">
              <p className={`text-sm font-extrabold ${pnlCls(pnl)}`}>{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}</p>
              {pnlPct != null && (
                <p className={`text-[10px] font-semibold ${pnlCls(pnl)}`}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</p>
              )}
            </div>
          )}
          <button type="button" onClick={onClose}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 text-xs font-bold hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer">
            Close
          </button>
        </div>
      </div>
      {liqPct != null && liqPct < 10 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[10px] text-[var(--color-danger)] font-semibold">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          Approaching liquidation — {liqPct.toFixed(1)}% from liq price
        </div>
      )}
    </div>
  );
};

// ─── History Row ──────────────────────────────────────────────────────────────
const HistoryRow: React.FC<{ pos: PaperPosition }> = ({ pos }) => {
  const pnl = pos.realised_pnl ? parseFloat(pos.realised_pnl) : 0;
  const statusColors: Record<string, string> = {
    CLOSED: 'text-[var(--text-muted)]',
    SL_HIT: 'text-orange-400',
    TP1_HIT: 'text-emerald-400', TP2_HIT: 'text-teal-400', TP3_HIT: 'text-cyan-400',
    LIQUIDATED: 'text-[var(--color-danger)]',
  };
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3 items-center px-3 py-2.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors text-xs">
      <div className="flex items-center gap-3 flex-wrap font-mono">
        <span className="font-bold text-[var(--text-primary)]">{pos.instrument}</span>
        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
          {pos.direction}{pos.leverage > 1 ? ` ${pos.leverage}×` : ''}
        </span>
        <span className="text-[var(--text-muted)]">
          {parseFloat(pos.entry_price).toLocaleString(undefined, { maximumFractionDigits: 2 })} → {pos.close_price ? parseFloat(pos.close_price).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
        </span>
        {pos.close_reason && (
          <span className={`text-[9px] font-bold ${statusColors[pos.status] || ''}`}>
            {pos.close_reason}
          </span>
        )}
        <span className="text-[var(--text-muted)]">{pos.closed_at ? new Date(pos.closed_at).toLocaleDateString() : '—'}</span>
      </div>
      <div className={`text-right font-extrabold font-mono-num ${pnlCls(pnl)}`}>
        {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyTradesPage() {
  const { tickers } = useMarketStore();
  const [activeInstrument, setActiveInstrument] = useState('BTC/USDT');
  const [closingPos, setClosingPos] = useState<PaperPosition | null>(null);
  const [tab, setTab] = useState<'open' | 'history' | 'ledger'>('open');
  const [resetConfirm, setResetConfirm] = useState(false);

  // Backend data
  const { data: account, isLoading: accountLoading } = usePaperAccount();
  const { data: openPositions = [], isLoading: posLoading } = usePaperPositions();
  const { data: closedPositions = [] } = usePaperHistory();
  const { data: ledgerEntries = [] } = usePaperLedger(100);

  const openMutation = useOpenPaperPosition();
  const closeMutation = useClosePaperPosition();
  const resetMutation = useResetPaperAccount();

  // Live prices from market store WebSocket
  const livePriceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tickers) map[t.symbol] = t.price;
    return map;
  }, [tickers]);

  const getLivePrice = (instrument: string) => {
    const item = CHART_ITEMS.find(c => c.instrument === instrument);
    return item ? (livePriceMap[item.symbol] ?? 0) : 0;
  };

  const livePrice = getLivePrice(activeInstrument);

  // Trigger SL/TP/liquidation evaluation every 15s when there are open positions
  useEffect(() => {
    if (openPositions.length === 0) return;
    const evaluate = () => {
      const prices = CHART_ITEMS
        .map(({ instrument }) => ({ instrument, price: getLivePrice(instrument) }))
        .filter(p => p.price > 0);
      triggerPriceEvaluation(prices);
    };
    evaluate(); // immediate
    const id = setInterval(evaluate, 15_000);
    return () => clearInterval(id);
  }, [openPositions.length, livePriceMap]);

  const activeChartItem = CHART_ITEMS.find(c => c.instrument === activeInstrument);
  const activeOpenPos = openPositions.find(p => p.instrument === activeInstrument) ?? null;
  const chartOverlay = activeOpenPos ? positionToChartOverlay(activeOpenPos) : null;

  // Stats
  const balance = account ? parseFloat(account.balance) : 0;
  const startBal = account ? parseFloat(account.starting_balance) : 10000;
  const lockedMargin = account ? parseFloat(account.locked_margin) : 0;
  const totalRealised = account ? parseFloat(account.total_realised_pnl) : 0;
  const totalUnrealised = openPositions.reduce((s, p) => {
    const lp = getLivePrice(p.instrument);
    if (!lp) return s;
    const size = parseFloat(p.size), entry = parseFloat(p.entry_price);
    return s + (p.direction === 'LONG' ? (lp - entry) * size : (entry - lp) * size);
  }, 0);
  const equity = balance + lockedMargin + totalUnrealised;
  const totalReturn = startBal > 0 ? ((equity - startBal) / startBal * 100) : 0;
  const winners = closedPositions.filter(p => parseFloat(p.realised_pnl ?? '0') > 0).length;
  const winRate = closedPositions.length > 0 ? (winners / closedPositions.length * 100).toFixed(1) : null;

  const handleOrderSubmit = (params: Parameters<typeof openMutation.mutate>[0]) => {
    openMutation.mutate({ ...params, marketPrice: getLivePrice(activeInstrument) });
  };

  const handleCloseConfirm = (price: number) => {
    if (!closingPos) return;
    closeMutation.mutate({ positionId: closingPos.id, marketPrice: price }, {
      onSettled: () => setClosingPos(null),
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Paper Trading</h1>
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
            <ShieldCheck className="w-3 h-3" /> DEMO
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs flex-wrap">
          {accountLoading ? (
            <Skeleton className="w-48 h-5" />
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                <span className="text-[var(--text-muted)]">Balance</span>
                <span className="font-bold font-mono-num text-[var(--text-primary)]">{fmtUsd(balance)}</span>
              </div>
              <div className="h-3 w-px bg-[var(--border-subtle)]" />
              <div>
                <span className="text-[var(--text-muted)]">Equity </span>
                <span className="font-bold font-mono-num text-[var(--brand-primary)]">{fmtUsd(equity)}</span>
              </div>
              <div className="h-3 w-px bg-[var(--border-subtle)]" />
              <div>
                <span className="text-[var(--text-muted)]">Total P&L </span>
                <span className={`font-bold font-mono-num ${pnlCls(totalRealised + totalUnrealised)}`}>
                  {(totalRealised + totalUnrealised) >= 0 ? '+' : ''}{fmtUsd(totalRealised + totalUnrealised)}
                </span>
              </div>
              <div className="h-3 w-px bg-[var(--border-subtle)]" />
              <div>
                <span className="text-[var(--text-muted)]">Return </span>
                <span className={`font-bold font-mono-num ${pnlCls(totalReturn)}`}>
                  {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                </span>
              </div>
              {winRate && (
                <>
                  <div className="h-3 w-px bg-[var(--border-subtle)]" />
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" />
                    <span className="font-bold text-amber-400">{winRate}%</span>
                    <span className="text-[var(--text-muted)]">win</span>
                  </div>
                </>
              )}
              <div className="h-3 w-px bg-[var(--border-subtle)]" />
              {resetConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--color-danger)] font-semibold">Reset?</span>
                  <button onClick={() => { resetMutation.mutate(); setResetConfirm(false); }}
                    disabled={resetMutation.isPending}
                    className="px-2 py-0.5 rounded bg-[var(--color-danger)] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50">Yes</button>
                  <button onClick={() => setResetConfirm(false)}
                    className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold cursor-pointer text-[var(--text-muted)]">No</button>
                </div>
              ) : (
                <button onClick={() => setResetConfirm(true)}
                  className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer">
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instrument tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {CHART_ITEMS.map(({ instrument, label }) => {
          const hasOpen = openPositions.some(p => p.instrument === instrument);
          const isActive = activeInstrument === instrument;
          return (
            <button key={instrument} type="button" onClick={() => setActiveInstrument(instrument)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${isActive
                ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)] shadow-sm'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'}`}>
              {label}
              {hasOpen && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-[var(--color-success)] shadow-[0_0_4px_var(--color-success)]'}`} />}
            </button>
          );
        })}
      </div>

      {/* Chart + Order Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <ZoneLinesChart
          tvSymbol={activeChartItem?.symbol}
          instrument={activeInstrument}
          prediction={chartOverlay}
          height={560}
          showTimeframeBar={true}
          allowDrawing={true}
        />

        <GlassCard hoverEffect={false} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{activeInstrument}</h3>
            {livePrice > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span className="text-xs font-mono-num font-semibold text-[var(--text-primary)]">
                  ${fmtPrice(livePrice, activeInstrument)}
                </span>
              </div>
            ) : <span className="text-[10px] text-[var(--text-muted)]">Loading…</span>}
          </div>

          {accountLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : (
            <OrderForm
              instrument={activeInstrument}
              livePrice={livePrice}
              balance={balance}
              isSubmitting={openMutation.isPending}
              onSubmit={handleOrderSubmit}
            />
          )}
        </GlassCard>
      </div>

      {/* Positions / History / Ledger tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] w-fit">
          {[
            { key: 'open' as const, label: `Open (${openPositions.length})`, icon: <Clock className="w-3 h-3" /> },
            { key: 'history' as const, label: `History (${closedPositions.length})`, icon: <History className="w-3 h-3" /> },
            { key: 'ledger' as const, label: 'Ledger', icon: <BookOpen className="w-3 h-3" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === key ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Open Positions */}
        {tab === 'open' && (
          posLoading ? (
            <div className="space-y-2">{[0, 1, 2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : openPositions.length === 0 ? (
            <GlassCard hoverEffect={false} className="py-12 text-center space-y-2">
              <BarChart2 className="w-8 h-8 text-[var(--text-muted)] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">No open positions</p>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Select an instrument above, configure your order, and hit Buy or Sell to open a paper position.
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {openPositions.map(pos => (
                <PositionCard key={pos.id} pos={pos}
                  livePrice={getLivePrice(pos.instrument)}
                  onClose={() => setClosingPos(pos)} />
              ))}
            </div>
          )
        )}

        {/* Trade History */}
        {tab === 'history' && (
          closedPositions.length === 0 ? (
            <GlassCard hoverEffect={false} className="py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No closed positions yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-1.5">
              {closedPositions.map(pos => <HistoryRow key={pos.id} pos={pos} />)}
            </div>
          )
        )}

        {/* Ledger */}
        {tab === 'ledger' && (
          ledgerEntries.length === 0 ? (
            <GlassCard hoverEffect={false} className="py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No ledger entries yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-1.5">
              {ledgerEntries.map(entry => {
                const amount = parseFloat(entry.amount);
                return (
                  <div key={entry.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${entry.entry_type === 'REALISED_PNL' ? (amount >= 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]')
                        : entry.entry_type === 'FEE' ? 'bg-amber-500/10 text-amber-400'
                          : entry.entry_type === 'ACCOUNT_RESET' ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                      }`}>{entry.entry_type.replace(/_/g, ' ')}</span>
                    <span className="text-[var(--text-muted)] truncate">{entry.note}</span>
                    <span className={`font-bold font-mono-num ${amount >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {amount >= 0 ? '+' : ''}{fmtUsd(amount)}
                    </span>
                    <span className="text-[var(--text-muted)] font-mono text-[10px]">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--brand-primary)]" />
        <span>
          <strong className="text-[var(--text-primary)]">Simulated trading only.</strong> All positions, balances, and P&L are virtual.
          0.05% fee per trade. 0.05% slippage on market orders. SL/TP/Liquidation evaluated server-side every 15s.
          All state is stored on our servers — persists across devices and sessions.
        </span>
      </div>

      {/* Close modal */}
      {closingPos && (
        <CloseModal
          pos={closingPos}
          livePrice={getLivePrice(closingPos.instrument)}
          onCancel={() => setClosingPos(null)}
          onConfirm={handleCloseConfirm}
          isPending={closeMutation.isPending}
        />
      )}
    </div>
  );
}
