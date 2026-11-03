/**
 * MyTradesPage — Delta Exchange-style Paper Trading Terminal
 *
 * Layout matches Delta Exchange demo trading:
 * - Full-width instrument header with live 24h stats
 * - Large chart (ZoneLinesChart) taking ~65% width
 * - Right panel: Long/Short tabs → Limit/Market order type → Leverage → Qty → SL/TP → Submit
 * - Bottom panel: Positions / Orders / Trades / Account tabs in table form
 *
 * All financial operations go through the server-side paper trading engine.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, X, RotateCcw, AlertTriangle,
  ChevronDown, Clock, History, BookOpen, BarChart2, Info,
  Plus, Minus, Wallet, ShieldCheck,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
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

// ─── Constants ──────────────────────────────────────────────────────────────────
const FEE_RATE = 0.0005;   // 0.05% — matches backend
const LEV_PRESETS = [1, 2, 5, 10, 25, 50, 100];

// ─── Formatters ─────────────────────────────────────────────────────────────────
const f2 = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return '0.00';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fUsd = (n: number | string) => `$${f2(n)}`;
const fP = (n: number | string, ins: string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  const d = ins.includes('XRP') ? 4 : ins === 'SILVER' ? 3 : 2;
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const pnlCls = (n: number) =>
  n > 0 ? 'text-[var(--color-success)]' : n < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]';

// ─── Live price from market store (fixes symbol mapping) ──────────────────────
function useLivePrice(instrument: string) {
  const { tickers } = useMarketStore();
  return useMemo(() => {
    // tickers use app symbol like 'BTC/USDT' — direct match
    return tickers.find(t => t.symbol === instrument)?.price ?? 0;
  }, [tickers, instrument]);
}

function useAllPrices() {
  const { tickers } = useMarketStore();
  return useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tickers) m[t.symbol] = t.price;
    return m;
  }, [tickers]);
}

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

// ─── Close modal ───────────────────────────────────────────────────────────────
const CloseModal: React.FC<{
  pos: PaperPosition; livePrice: number;
  onCancel: () => void; onConfirm: (p: number) => void; isPending: boolean;
}> = ({ pos, livePrice, onCancel, onConfirm, isPending }) => {
  const [price, setPrice] = useState(livePrice > 0 ? livePrice.toFixed(2) : '');
  const p = parseFloat(price) || 0;
  const size = parseFloat(pos.size);
  const entry = parseFloat(pos.entry_price);
  const pnl = p > 0 ? (pos.direction === 'LONG' ? (p - entry) * size : (entry - p) * size) : 0;
  const pnlPct = parseFloat(pos.margin_usd) > 0 ? pnl / parseFloat(pos.margin_usd) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Close&nbsp;
            <span className={pos.direction === 'LONG' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}>
              {pos.direction}
            </span>
            &nbsp;{pos.instrument}
            {pos.leverage > 1 && <span className="ml-1.5 text-amber-400 text-xs">{pos.leverage}×</span>}
          </h3>
          <button onClick={onCancel} disabled={isPending} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { l: 'Entry', v: `$${fP(pos.entry_price, pos.instrument)}` },
            { l: 'Notional', v: fUsd(parseFloat(pos.notional_usd)) },
            { l: 'Margin', v: fUsd(parseFloat(pos.margin_usd)) },
            { l: 'Liq.', v: `$${fP(pos.liquidation_price, pos.instrument)}`, danger: true },
          ].map(({ l, v, danger }) => (
            <div key={l} className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-muted)]">{l}</p>
              <p className={`font-bold font-mono-num mt-0.5 ${danger ? 'text-[var(--color-danger)]' : 'text-[var(--text-primary)]'}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Close Price ($)</label>
          <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-primary)]" />
          {livePrice > 0 && (
            <button type="button" onClick={() => setPrice(livePrice.toFixed(2))}
              className="text-[10px] text-[var(--brand-primary)] font-semibold hover:underline cursor-pointer">
              Use mark price ${fP(livePrice, pos.instrument)}
            </button>
          )}
        </div>

        {p > 0 && (
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border font-mono-num ${pnl >= 0 ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30 text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30 text-[var(--color-danger)]'}`}>
            <span className="text-xs font-semibold">Estimated P&L</span>
            <span className="text-sm font-bold">{pnl >= 0 ? '+' : ''}{fUsd(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</span>
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] text-center">0.05% close fee · final P&L calculated server-side</p>

        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isPending}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(p)} disabled={p <= 0 || isPending}
            className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 ${pnl >= 0 ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--color-danger)] hover:opacity-90'}`}>
            {isPending ? 'Closing…' : 'Confirm Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Order panel (right side — Delta-style) ────────────────────────────────────
interface OrderPanelProps {
  instrument: string; livePrice: number; balance: number; isSubmitting: boolean;
  onSubmit: (p: {
    direction: PaperDirection; notionalUsd: number; leverage: number;
    stopLoss: number | null; takeProfit1: number | null;
    takeProfit2: number | null; takeProfit3: number | null; note: string;
  }) => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ instrument, livePrice, balance, isSubmitting, onSubmit }) => {
  const [direction, setDirection] = useState<PaperDirection>('LONG');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [leverage, setLeverage] = useState(1);
  const [qtyUsd, setQtyUsd] = useState('100');
  const [limitPx, setLimitPx] = useState('');
  const [bracketOn, setBracketOn] = useState(false);
  const [sl, setSl] = useState(''); const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState(''); const [tp3, setTp3] = useState('');
  const [showTp23, setShowTp23] = useState(false);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill SL/TP when price or direction changes
  useEffect(() => {
    if (livePrice <= 0) return;
    const d = instrument.includes('XRP') ? 4 : 2;
    setLimitPx(livePrice.toFixed(d));
    if (direction === 'LONG') {
      setSl((livePrice * 0.97).toFixed(d)); setTp1((livePrice * 1.05).toFixed(d));
    } else {
      setSl((livePrice * 1.03).toFixed(d)); setTp1((livePrice * 0.95).toFixed(d));
    }
    setTp2(''); setTp3('');
  }, [instrument, direction, livePrice]);

  const execPrice = orderType === 'limit' && parseFloat(limitPx) > 0 ? parseFloat(limitPx) : livePrice;
  const notional = parseFloat(qtyUsd) || 0;
  const margin = notional > 0 ? notional / leverage : 0;
  const units = execPrice > 0 && notional > 0 ? notional / execPrice : 0;
  const fee = notional * FEE_RATE;
  const fundsReq = margin + fee;
  const liqPrice = execPrice > 0 && leverage > 1
    ? (direction === 'LONG' ? execPrice * (1 - 1 / leverage) : execPrice * (1 + 1 / leverage))
    : null;
  const slNum = parseFloat(sl) || null;
  const tp1Num = parseFloat(tp1) || null;
  const potL = slNum && execPrice > 0 ? Math.abs(execPrice - slNum) / execPrice * notional : null;
  const potP = tp1Num && execPrice > 0 ? Math.abs(tp1Num - execPrice) / execPrice * notional : null;
  const rr = potL && potP ? (potP / potL).toFixed(2) : null;

  const handleQtyPct = (pct: number) => {
    const max = balance * leverage;
    setQtyUsd((max * pct / 100).toFixed(2));
  };

  const handleSubmit = () => {
    setError('');
    if (notional <= 0) return setError('Enter order size');
    if (execPrice <= 0) return setError('Waiting for price…');
    if (fundsReq > balance) return setError(`Need ${fUsd(fundsReq)}, have ${fUsd(balance)}`);
    onSubmit({
      direction, notionalUsd: notional, leverage,
      stopLoss: sl ? parseFloat(sl) : null,
      takeProfit1: tp1 ? parseFloat(tp1) : null,
      takeProfit2: tp2 ? parseFloat(tp2) : null,
      takeProfit3: tp3 ? parseFloat(tp3) : null,
      note: '',
    });
  };

  // ── Long / Short top tab ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] select-none">

      {/* Direction tabs */}
      <div className="grid grid-cols-2 border-b border-[var(--border-subtle)]">
        {(['LONG', 'SHORT'] as PaperDirection[]).map(d => (
          <button key={d} type="button" onClick={() => setDirection(d)}
            className={`py-3 text-sm font-bold transition-all cursor-pointer ${direction === d
              ? d === 'LONG'
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-b-2 border-[var(--color-success)]'
                : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-b-2 border-[var(--color-danger)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-b-2 border-transparent'
              }`}>
            {d === 'LONG' ? 'Long' : 'Short'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Order type row */}
        <div className="flex gap-1 p-0.5 bg-[var(--bg-secondary)] rounded-lg">
          {(['limit', 'market'] as const).map(t => (
            <button key={t} type="button" onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all cursor-pointer ${orderType === t ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {t === 'limit' ? 'Limit' : 'Market'}
            </button>
          ))}
        </div>

        {/* Mark price */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">Mark Price</span>
          <div className="flex items-center gap-1.5">
            {livePrice > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />}
            <span className="text-sm font-extrabold font-mono-num text-[var(--text-primary)]">
              {livePrice > 0 ? `$${fP(livePrice, instrument)}` : '—'}
            </span>
          </div>
        </div>

        {/* Limit price input (shown when limit order selected) */}
        {orderType === 'limit' && (
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-muted)] font-semibold">Limit Price (USD)</label>
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
              <button type="button" onClick={() => setLimitPx(v => String((parseFloat(v) || livePrice) - 1))} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><Minus className="w-3 h-3" /></button>
              <input type="number" step="any" value={limitPx} onChange={e => setLimitPx(e.target.value)}
                className="flex-1 text-center bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" />
              <button type="button" onClick={() => setLimitPx(v => String((parseFloat(v) || livePrice) + 1))} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        )}

        {/* Leverage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-[var(--text-muted)] font-semibold">Leverage</label>
            <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${leverage >= 20 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]' : leverage >= 5 ? 'bg-amber-500/10 text-amber-400' : 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'}`}>
              {leverage}×
            </span>
          </div>
          <input type="range" min={1} max={100} step={1} value={leverage} onChange={e => setLeverage(parseInt(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer accent-[var(--brand-primary)]"
            style={{ background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${leverage}%, var(--bg-surface) ${leverage}%, var(--bg-surface) 100%)` }} />
          <div className="flex gap-1">
            {LEV_PRESETS.map(lv => (
              <button key={lv} type="button" onClick={() => setLeverage(lv)}
                className={`flex-1 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${leverage === lv ? (lv >= 20 ? 'bg-[var(--color-danger)] text-white' : lv >= 5 ? 'bg-amber-500 text-white' : 'bg-[var(--brand-primary)] text-white') : 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
                {lv}×
              </button>
            ))}
          </div>
          {liqPrice != null && livePrice > 0 && (
            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[var(--border-subtle)]">
              <span className="text-[var(--color-danger)] font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Est. Liq.</span>
              <span className="font-extrabold font-mono-num text-[var(--color-danger)]">${fP(liqPrice, instrument)}</span>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] text-[var(--text-muted)] font-semibold">Quantity</label>
            <span className="text-[10px] text-[var(--text-muted)]">{instrument.split('/')[0]}</span>
          </div>
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
            <input type="number" step="any" min="1" value={qtyUsd} onChange={e => setQtyUsd(e.target.value)}
              className="flex-1 bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" placeholder="USD" />
            <span className="text-[10px] text-[var(--text-muted)] font-semibold">USD</span>
          </div>
          {execPrice > 0 && notional > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              ≈ {units.toFixed(5)} {instrument.split('/')[0]}
              {leverage > 1 && <span className="ml-1 text-amber-400"> · Margin {fUsd(margin)}</span>}
            </p>
          )}
          {/* % quick-fill */}
          <div className="flex gap-1">
            {[10, 25, 50, 75, 100].map(pct => (
              <button key={pct} type="button" onClick={() => handleQtyPct(pct)}
                className="flex-1 py-1 rounded text-[9px] font-bold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all cursor-pointer">
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Bracket Order (SL/TP) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">Bracket Order</span>
            <button type="button" onClick={() => setBracketOn(!bracketOn)}
              className="flex items-center gap-1.5 text-[10px] text-[var(--brand-primary)] font-semibold cursor-pointer hover:opacity-80 transition-opacity">
              <Plus className="w-3 h-3" />
              {bracketOn ? 'Hide' : 'Add'} TP/SL
            </button>
          </div>

          {bracketOn && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-semibold text-orange-400">Stop Loss ($)</label>
                  <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-orange-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-orange-400 focus:outline-none focus:border-orange-400" />
                </div>
                <div className="space-y-0.5">
                  <label className="text-[10px] font-semibold text-emerald-400">Take Profit 1 ($)</label>
                  <input type="number" step="any" value={tp1} onChange={e => setTp1(e.target.value)}
                    className="w-full bg-[var(--bg-secondary)] border border-emerald-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-emerald-400 focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <button type="button" onClick={() => setShowTp23(!showTp23)}
                className="text-[10px] text-[var(--brand-primary)] font-semibold cursor-pointer hover:opacity-80 flex items-center gap-1">
                <ChevronDown className={`w-3 h-3 transition-transform ${showTp23 ? 'rotate-180' : ''}`} />
                {showTp23 ? 'Hide' : 'Add'} TP2 / TP3
              </button>
              {showTp23 && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-teal-400">Take Profit 2 ($)</label>
                    <input type="number" step="any" value={tp2} onChange={e => setTp2(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-teal-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-teal-400 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-cyan-400">Take Profit 3 ($)</label>
                    <input type="number" step="any" value={tp3} onChange={e => setTp3(e.target.value)}
                      className="w-full bg-[var(--bg-secondary)] border border-cyan-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-cyan-400 focus:outline-none focus:border-cyan-400" />
                  </div>
                </div>
              )}
              {/* R:R */}
              {rr && (
                <div className="flex justify-between items-center px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px]">
                  <span className="text-[var(--text-muted)]">Risk:Reward</span>
                  <span className="font-bold text-[var(--text-primary)]">1:{rr}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reduce Only */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={reduceOnly} onChange={e => setReduceOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[var(--brand-primary)] cursor-pointer" />
          <span className="text-[11px] text-[var(--text-muted)]">Reduce Only</span>
        </label>

        {/* Fees & funds required */}
        <div className="space-y-1.5 py-2 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)] flex items-center gap-1">Funds req.</span>
            <span className="font-semibold font-mono-num text-[var(--text-primary)]">{fUsd(fundsReq)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)] flex items-center gap-1"><Wallet className="w-3 h-3" /> Available Margin</span>
            <span className="font-bold font-mono-num text-[var(--text-primary)]">{fUsd(balance)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">% Fees</span>
            <span className="text-[var(--text-muted)] font-mono-num">0.05% · {fUsd(fee)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[11px] text-[var(--color-danger)]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}

        {/* Submit button */}
        <button type="button" onClick={handleSubmit} disabled={execPrice <= 0 || isSubmitting}
          className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50 ${direction === 'LONG'
            ? 'bg-[var(--color-success)] hover:opacity-90 shadow-lg shadow-[var(--color-success)]/20'
            : 'bg-[var(--color-danger)] hover:opacity-90 shadow-lg shadow-[var(--color-danger)]/20'
            }`}>
          {isSubmitting ? 'Placing…' : direction === 'LONG' ? `Buy / Long ${instrument.split('/')[0]}` : `Sell / Short ${instrument.split('/')[0]}`}
          {leverage > 1 && <span className="ml-1.5 opacity-80 font-mono text-xs">{leverage}×</span>}
        </button>

        <p className="text-[9px] text-[var(--text-muted)] text-center pb-1">Paper trading — no real funds at risk</p>
      </div>
    </div>
  );
};

// ─── Positions table row ───────────────────────────────────────────────────────
const PositionRow: React.FC<{ pos: PaperPosition; livePrice: number; onClose: () => void }> = ({ pos, livePrice, onClose }) => {
  const size = parseFloat(pos.size);
  const entry = parseFloat(pos.entry_price);
  const pnl = livePrice > 0
    ? (pos.direction === 'LONG' ? (livePrice - entry) * size : (entry - livePrice) * size)
    : null;
  const pnlPct = pnl != null && parseFloat(pos.margin_usd) > 0 ? pnl / parseFloat(pos.margin_usd) * 100 : null;
  const liqDist = livePrice > 0 ? Math.abs(livePrice - parseFloat(pos.liquidation_price)) / livePrice * 100 : null;

  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors">
      <td className="px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[var(--text-primary)]">{pos.instrument}</span>
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
            {pos.direction}
          </span>
          {pos.leverage > 1 && <span className="text-[9px] font-bold text-amber-400">{pos.leverage}×</span>}
        </div>
      </td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">{fUsd(parseFloat(pos.notional_usd))}</td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">${fP(entry, pos.instrument)}</td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">
        {livePrice > 0 ? `$${fP(livePrice, pos.instrument)}` : '—'}
      </td>
      <td className={`px-3 py-2 text-xs font-mono-num font-bold ${pnl != null ? pnlCls(pnl) : 'text-[var(--text-muted)]'}`}>
        {pnl != null ? `${pnl >= 0 ? '+' : ''}${fUsd(pnl)}` : '—'}
        {pnlPct != null && (
          <span className="ml-1 text-[10px] opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>
        )}
      </td>
      <td className="px-3 py-2 text-xs font-mono-num">
        <span className={pos.stop_loss ? 'text-orange-400' : 'text-[var(--text-muted)]'}>
          {pos.stop_loss ? `$${fP(parseFloat(pos.stop_loss), pos.instrument)}` : '—'}
        </span>
      </td>
      <td className="px-3 py-2 text-xs font-mono-num">
        <span className={pos.take_profit_1 ? 'text-emerald-400' : 'text-[var(--text-muted)]'}>
          {pos.take_profit_1 ? `$${fP(parseFloat(pos.take_profit_1), pos.instrument)}` : '—'}
        </span>
      </td>
      <td className="px-3 py-2 text-xs font-mono-num">
        {liqDist != null && liqDist < 10 ? (
          <span className="text-[var(--color-danger)] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />${fP(parseFloat(pos.liquidation_price), pos.instrument)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">${fP(parseFloat(pos.liquidation_price), pos.instrument)}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={onClose}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 text-[10px] font-bold hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer">
          Close
        </button>
      </td>
    </tr>
  );
};

// ─── History table row ─────────────────────────────────────────────────────────
const HistoryRow: React.FC<{ pos: PaperPosition }> = ({ pos }) => {
  const pnl = parseFloat(pos.realised_pnl ?? '0');
  const statusBadge: Record<string, string> = {
    CLOSED: 'text-[var(--text-muted)]', SL_HIT: 'text-orange-400',
    TP1_HIT: 'text-emerald-400', TP2_HIT: 'text-teal-400', TP3_HIT: 'text-cyan-400',
    LIQUIDATED: 'text-[var(--color-danger)]',
  };
  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors text-xs">
      <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{pos.instrument}</td>
      <td className="px-3 py-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
          {pos.direction}{pos.leverage > 1 ? ` ${pos.leverage}×` : ''}
        </span>
      </td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">${fP(parseFloat(pos.entry_price), pos.instrument)}</td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">{pos.close_price ? `$${fP(parseFloat(pos.close_price), pos.instrument)}` : '—'}</td>
      <td className={`px-3 py-2 font-mono-num font-bold ${pnlCls(pnl)}`}>{pnl >= 0 ? '+' : ''}{fUsd(pnl)}</td>
      <td className={`px-3 py-2 text-[10px] font-bold ${statusBadge[pos.status] ?? ''}`}>{pos.close_reason ?? pos.status}</td>
      <td className="px-3 py-2 text-[var(--text-muted)]">{pos.closed_at ? new Date(pos.closed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
    </tr>
  );
};

// ─── Ledger row ────────────────────────────────────────────────────────────────
const LedgerRow: React.FC<{ entry: ReturnType<typeof usePaperLedger>['data'] extends (infer U)[] | undefined ? U : never }> = ({ entry }) => {
  if (!entry) return null;
  const amount = parseFloat(entry.amount);
  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors text-xs">
      <td className="px-3 py-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${entry.entry_type === 'REALISED_PNL' ? (amount >= 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]')
          : entry.entry_type === 'FEE' ? 'bg-amber-500/10 text-amber-400'
            : entry.entry_type === 'ACCOUNT_RESET' ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
              : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
          }`}>{entry.entry_type.replace(/_/g, ' ')}</span>
      </td>
      <td className="px-3 py-2 text-[var(--text-muted)] max-w-[180px] truncate">{entry.note}</td>
      <td className={`px-3 py-2 font-mono-num font-bold ${amount >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
        {amount >= 0 ? '+' : ''}{fUsd(amount)}
      </td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">{fUsd(parseFloat(entry.balance_after))}</td>
      <td className="px-3 py-2 text-[var(--text-muted)]">{new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
    </tr>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function MyTradesPage() {
  const [activeInstrument, setActiveInstrument] = useState('BTC/USDT');
  const [closingPos, setClosingPos] = useState<PaperPosition | null>(null);
  const [bottomTab, setBottomTab] = useState<'positions' | 'history' | 'ledger'>('positions');
  const [resetConfirm, setResetConfirm] = useState(false);

  const { tickers } = useMarketStore();
  const allPrices = useAllPrices();
  const livePrice = useLivePrice(activeInstrument);

  const { data: account, isLoading: accountLoading } = usePaperAccount();
  const { data: openPositions = [], isLoading: posLoading, refetch: refetchPos } = usePaperPositions();
  const { data: closedPositions = [] } = usePaperHistory();
  const { data: ledgerEntries = [] } = usePaperLedger(100);

  const openMut = useOpenPaperPosition();
  const closeMut = useClosePaperPosition();
  const resetMut = useResetPaperAccount();

  // Derived ticker for the active instrument
  const activeTicker = useMemo(() =>
    tickers.find(t => t.symbol === activeInstrument),
    [tickers, activeInstrument]
  );

  // SL/TP/Liquidation evaluation every 15s
  useEffect(() => {
    if (openPositions.length === 0) return;
    const evaluate = () => {
      const prices = CHART_ITEMS
        .map(({ instrument }) => ({ instrument, price: allPrices[instrument] ?? 0 }))
        .filter(p => p.price > 0);
      triggerPriceEvaluation(prices);
    };
    evaluate();
    const id = setInterval(evaluate, 15_000);
    return () => clearInterval(id);
  }, [openPositions.length, allPrices]);

  // Also refetch positions after evaluation might have closed some
  useEffect(() => {
    const id = setInterval(refetchPos, 15_000);
    return () => clearInterval(id);
  }, [refetchPos]);

  const activeChartItem = CHART_ITEMS.find(c => c.instrument === activeInstrument);
  const activeOpenPos = useMemo(() => openPositions.find(p => p.instrument === activeInstrument) ?? null, [openPositions, activeInstrument]);
  const chartOverlay = useMemo(() => activeOpenPos ? positionToChartOverlay(activeOpenPos) : null, [activeOpenPos]);

  const balance = account ? parseFloat(account.balance) : 0;
  const lockedMargin = account ? parseFloat(account.locked_margin) : 0;
  const totalRealised = account ? parseFloat(account.total_realised_pnl) : 0;
  const totalUnrealised = openPositions.reduce((s, p) => {
    const lp = allPrices[p.instrument] ?? 0;
    if (!lp) return s;
    const sz = parseFloat(p.size), en = parseFloat(p.entry_price);
    return s + (p.direction === 'LONG' ? (lp - en) * sz : (en - lp) * sz);
  }, 0);
  const equity = balance + lockedMargin + totalUnrealised;
  const startBal = account ? parseFloat(account.starting_balance) : 10000;
  const returnPct = startBal > 0 ? (equity - startBal) / startBal * 100 : 0;

  const handleOrderSubmit = (params: Parameters<typeof openMut.mutate>[0]) => {
    openMut.mutate({ ...params, marketPrice: livePrice });
  };

  const handleCloseConfirm = (price: number) => {
    if (!closingPos) return;
    closeMut.mutate({ positionId: closingPos.id, marketPrice: price }, { onSettled: () => setClosingPos(null) });
  };

  // ── Full-bleed layout: breaks out of AppShell padding ──────────────────────
  return (
    // -m-5 lg:-m-6 cancels the AppShell's p-5 lg:p-6 padding so we reach edge-to-edge
    <div className="-m-5 lg:-m-6">

      {/* ── Instrument + stats header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-2
                      bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]
                      overflow-x-auto scrollbar-thin">

        {/* Symbol tabs */}
        <div className="flex gap-1 flex-shrink-0">
          {CHART_ITEMS.map(({ instrument, label }) => {
            const hasOpen = openPositions.some(p => p.instrument === instrument);
            const isActive = activeInstrument === instrument;
            return (
              <button key={instrument} type="button"
                onClick={() => setActiveInstrument(instrument)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold
                            border whitespace-nowrap transition-all cursor-pointer flex-shrink-0
                            ${isActive
                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]'
                    : 'bg-transparent text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
                  }`}>
                {label}
                {hasOpen && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-[var(--brand-primary)]' : 'bg-[var(--color-success)]'}`} />}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-[var(--border-subtle)] flex-shrink-0" />

        {/* Live price + 24h stats */}
        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {livePrice > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />}
            <span className={`text-base font-extrabold font-mono-num ${(activeTicker?.change24h ?? 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
              }`}>
              {livePrice > 0 ? `$${fP(livePrice, activeInstrument)}` : '—'}
            </span>
            {activeTicker?.change24h !== undefined && (
              <span className={`text-xs font-bold ${activeTicker.change24h >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {activeTicker.change24h >= 0 ? '+' : ''}{activeTicker.change24h.toFixed(2)}%
              </span>
            )}
          </div>
          {activeTicker && <>
            <StatPill label="24h High" value={`$${fP(activeTicker.high24h, activeInstrument)}`} color="text-[var(--color-success)]" />
            <StatPill label="24h Low" value={`$${fP(activeTicker.low24h, activeInstrument)}`} color="text-[var(--color-danger)]" />
            <StatPill label="24h Vol" value={`$${(activeTicker.volume24h / 1_000_000).toFixed(1)}M`} />
          </>}
        </div>

        {/* Right: account stats + reset */}
        <div className="ml-auto flex items-center gap-4 flex-shrink-0">
          {accountLoading ? <Skeleton className="w-40 h-4" /> : account && <>
            <StatPill label="Balance" value={fUsd(balance)} color="text-[var(--text-primary)]" />
            <StatPill label="Equity" value={fUsd(equity)} color="text-[var(--brand-primary)]" />
            <StatPill label="Total P&L" value={`${totalRealised + totalUnrealised >= 0 ? '+' : ''}${fUsd(totalRealised + totalUnrealised)}`} color={pnlCls(totalRealised + totalUnrealised)} />
            <StatPill label="Return" value={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`} color={pnlCls(returnPct)} />
          </>}
          {resetConfirm ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--color-danger)] font-semibold">Reset?</span>
              <button onClick={() => { resetMut.mutate(); setResetConfirm(false); }}
                disabled={resetMut.isPending}
                className="px-2 py-0.5 rounded bg-[var(--color-danger)] text-white text-[10px] font-bold cursor-pointer disabled:opacity-50">Yes</button>
              <button onClick={() => setResetConfirm(false)}
                className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold cursor-pointer text-[var(--text-muted)]">No</button>
            </div>
          ) : (
            <button onClick={() => setResetConfirm(true)}
              className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--brand-primary)] px-2 py-0.5
                           rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
            <ShieldCheck className="w-3 h-3" /> PAPER
          </span>
        </div>
      </div>

      {/* ── Chart + Order panel (tall, fixed 620px so chart is usable) ──────── */}
      <div className="flex border-b border-[var(--border-subtle)]" style={{ height: '620px' }}>
        {/* Chart — takes all remaining width */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ZoneLinesChart
            tvSymbol={activeChartItem?.symbol}
            instrument={activeInstrument}
            prediction={chartOverlay}
            height={620}
            showTimeframeBar={true}
            allowDrawing={true}
          />
        </div>

        {/* Order panel — fixed 285px */}
        <div className="w-[285px] flex-shrink-0 overflow-y-auto border-l border-[var(--border-subtle)]">
          <OrderPanel
            instrument={activeInstrument}
            livePrice={livePrice}
            balance={balance}
            isSubmitting={openMut.isPending}
            onSubmit={handleOrderSubmit}
          />
        </div>
      </div>

      {/* ── Bottom section: positions / history / ledger — scrollable ───────── */}
      <div className="bg-[var(--bg-surface)]">
        {/* Tab bar — sticky so it stays visible while scrolling inside the table */}
        <div className="sticky top-[49px] z-20 flex items-center border-b border-[var(--border-subtle)]
                        bg-[var(--bg-surface)] px-4">
          {[
            { key: 'positions' as const, label: `Positions (${openPositions.length})`, icon: <BarChart2 className="w-3 h-3" /> },
            { key: 'history' as const, label: `Trade History (${closedPositions.length})`, icon: <History className="w-3 h-3" /> },
            { key: 'ledger' as const, label: 'Account Ledger', icon: <BookOpen className="w-3 h-3" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setBottomTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer
                          ${bottomTab === key
                  ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
                }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        {/* Table content — min height so empty states don't collapse */}
        <div className="min-h-[200px]">

          {/* ── Open Positions ── */}
          {bottomTab === 'positions' && (
            posLoading ? (
              <div className="p-4 space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : openPositions.length === 0 ? (
              <EmptyState text="No open positions. Place an order above." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Instrument', 'Size (USD)', 'Entry', 'Mark Price', 'Unrealized P&L', 'Stop Loss', 'Take Profit', 'Liq. Price', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map(pos => (
                      <PositionRow key={pos.id} pos={pos}
                        livePrice={allPrices[pos.instrument] ?? 0}
                        onClose={() => setClosingPos(pos)} />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Trade History ── */}
          {bottomTab === 'history' && (
            closedPositions.length === 0 ? (
              <EmptyState text="No closed positions yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Instrument', 'Side', 'Entry', 'Close Price', 'Realized P&L', 'Reason', 'Closed At'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.map(pos => <HistoryRow key={pos.id} pos={pos} />)}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Account Ledger ── */}
          {bottomTab === 'ledger' && (
            ledgerEntries.length === 0 ? (
              <EmptyState text="No ledger entries yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Type', 'Note', 'Amount', 'Balance After', 'Time'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map(e => <LedgerRow key={e.id} entry={e} />)}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Disclaimer strip */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-base)]
                      border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
        <Info className="w-3 h-3 text-[var(--brand-primary)] flex-shrink-0" />
        Simulated only — 0.05% fee · 0.05% slippage · SL/TP/Liquidation evaluated server-side every 15 s
      </div>

      {/* Close modal */}
      {closingPos && (
        <CloseModal
          pos={closingPos}
          livePrice={allPrices[closingPos.instrument] ?? 0}
          onCancel={() => setClosingPos(null)}
          onConfirm={handleCloseConfirm}
          isPending={closeMut.isPending}
        />
      )}
    </div>
  );
}

// ─── Micro components ──────────────────────────────────────────────────────────
const StatPill: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-[var(--text-secondary)]' }) => (
  <div className="flex flex-col">
    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider leading-none">{label}</span>
    <span className={`text-xs font-bold font-mono-num leading-tight mt-0.5 ${color}`}>{value}</span>
  </div>
);

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center py-8 text-xs text-[var(--text-muted)]">{text}</div>
);
