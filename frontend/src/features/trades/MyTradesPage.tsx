/**
 * MyTradesPage — Delta Exchange-style Paper Trading Terminal
 *
 * Changes vs previous version:
 * - Leverage removed (no leverage on a $10k demo account)
 * - 3-mode quantity input: Units (e.g. 1 ETH) | USD | % of wallet
 * - Chart row uses calc(100vh - X) so it fills the viewport
 * - Long/Short tabs sticky inside panel; submit button pinned at bottom
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, AlertTriangle,
  ChevronDown, History, BookOpen, BarChart2,
  Plus, Minus, Wallet, ShieldCheck,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { ZoneLinesChart } from '../../components/charts/ZoneLinesChart';
import { useMarketStore } from '../../state/useMarketStore';
import { CHART_ITEMS } from '../../constants';
import {
  usePaperAccount, usePaperPositions, usePaperHistory, usePaperLedger,
  useOpenPaperPosition, useClosePaperPosition,
  triggerPriceEvaluation,
  type PaperPosition, type PaperDirection,
} from '../../hooks/usePaperTradingQuery';
import type { Prediction } from '../../types';

// ─── Constants & types ─────────────────────────────────────────────────────────
const FEE_RATE = 0.0005;
type QtyMode = 'units' | 'usd' | 'pct';

// ─── Formatters ─────────────────────────────────────────────────────────────────
const f2 = (n: number | string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return Number.isFinite(v)
    ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';
};
const fUsd = (n: number | string) => `$${f2(n)}`;
const fP = (n: number | string, ins: string) => {
  const v = typeof n === 'string' ? parseFloat(n) : n;
  const d = ins.includes('XRP') ? 4 : ins === 'SILVER' ? 3 : 2;
  return v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};
const pnlCls = (n: number) =>
  n > 0 ? 'text-[var(--color-success)]' : n < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]';

// ─── Live price hooks ───────────────────────────────────────────────────────────
function useLivePrice(instrument: string) {
  const { tickers } = useMarketStore();
  return useMemo(() => tickers.find(t => t.symbol === instrument)?.price ?? 0, [tickers, instrument]);
}
function useAllPrices() {
  const { tickers } = useMarketStore();
  return useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of tickers) m[t.symbol] = t.price;
    return m;
  }, [tickers]);
}

// ─── Chart overlay builder ──────────────────────────────────────────────────────
function positionToChartOverlay(pos: PaperPosition): Prediction {
  return {
    id: pos.id, traderId: 'paper',
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

// ─── Close modal ────────────────────────────────────────────────────────────────
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
          </h3>
          <button onClick={onCancel} disabled={isPending}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { l: 'Entry', v: `$${fP(pos.entry_price, pos.instrument)}` },
            { l: 'Notional', v: fUsd(parseFloat(pos.notional_usd)) },
          ].map(({ l, v }) => (
            <div key={l} className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-muted)]">{l}</p>
              <p className="font-bold font-mono-num mt-0.5 text-[var(--text-primary)]">{v}</p>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Close Price ($)</label>
          <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
                       text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-primary)]" />
          {livePrice > 0 && (
            <button type="button" onClick={() => setPrice(livePrice.toFixed(2))}
              className="text-[10px] text-[var(--brand-primary)] font-semibold hover:underline cursor-pointer">
              Use mark price ${fP(livePrice, pos.instrument)}
            </button>
          )}
        </div>

        {p > 0 && (
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl border font-mono-num ${pnl >= 0
            ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30 text-[var(--color-success)]'
            : 'bg-[var(--color-danger-bg)]  border-[var(--color-danger)]/30  text-[var(--color-danger)]'
            }`}>
            <span className="text-xs font-semibold">Estimated P&L</span>
            <span className="text-sm font-bold">
              {pnl >= 0 ? '+' : ''}{fUsd(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] text-center">0.05% close fee · P&L calculated server-side</p>

        <div className="flex gap-2">
          <button onClick={onCancel} disabled={isPending}
            className="flex-1 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-subtle)]
                       text-[var(--text-primary)] hover:border-[var(--brand-primary)] transition-all cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(p)} disabled={p <= 0 || isPending}
            className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50
              ${pnl >= 0 ? 'bg-[var(--brand-primary)] hover:opacity-90' : 'bg-[var(--color-danger)] hover:opacity-90'}`}>
            {isPending ? 'Closing…' : 'Confirm Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Order Panel ────────────────────────────────────────────────────────────────
interface OrderPanelProps {
  instrument: string; livePrice: number; balance: number; isSubmitting: boolean;
  onSubmit: (p: {
    direction: PaperDirection; notionalUsd: number; leverage: number;
    stopLoss: number | null; takeProfit1: number | null;
    takeProfit2: number | null; takeProfit3: number | null; note: string;
  }) => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ instrument, livePrice, balance, isSubmitting, onSubmit }) => {
  const base = instrument.split('/')[0];
  const prec = instrument.includes('XRP') ? 4 : instrument === 'SILVER' ? 3 : 2;

  const [direction, setDirection] = useState<PaperDirection>('LONG');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [qtyMode, setQtyMode] = useState<QtyMode>('usd');
  const [qtyUnits, setQtyUnits] = useState('');
  const [qtyUsd, setQtyUsd] = useState('100');
  const [qtyPct, setQtyPct] = useState('10');
  const [limitPx, setLimitPx] = useState('');
  const [bracketOn, setBracketOn] = useState(false);
  const [sl, setSl] = useState('');
  const [tp1, setTp1] = useState('');
  const [tp2, setTp2] = useState('');
  const [tp3, setTp3] = useState('');
  const [showTp23, setShowTp23] = useState(false);
  const [error, setError] = useState('');

  const execPrice = orderType === 'limit' && parseFloat(limitPx) > 0 ? parseFloat(limitPx) : livePrice;

  // Notional USD derived from whichever mode is active
  const notional = useMemo(() => {
    if (qtyMode === 'units') return execPrice > 0 ? (parseFloat(qtyUnits) || 0) * execPrice : 0;
    if (qtyMode === 'usd') return parseFloat(qtyUsd) || 0;
    return balance * (parseFloat(qtyPct) || 0) / 100;
  }, [qtyMode, qtyUnits, qtyUsd, qtyPct, execPrice, balance]);

  const unitCount = execPrice > 0 ? notional / execPrice : 0;
  const fee = notional * FEE_RATE;
  const fundsReq = notional + fee;

  // Auto-fill SL/TP
  useEffect(() => {
    if (livePrice <= 0) return;
    setLimitPx(livePrice.toFixed(prec));
    if (direction === 'LONG') {
      setSl((livePrice * 0.97).toFixed(prec));
      setTp1((livePrice * 1.05).toFixed(prec));
    } else {
      setSl((livePrice * 1.03).toFixed(prec));
      setTp1((livePrice * 0.95).toFixed(prec));
    }
    setTp2(''); setTp3('');
  }, [instrument, direction, livePrice]);

  const slNum = parseFloat(sl) || null;
  const tp1Num = parseFloat(tp1) || null;
  const potL = slNum && execPrice > 0 ? Math.abs(execPrice - slNum) / execPrice * notional : null;
  const potP = tp1Num && execPrice > 0 ? Math.abs(tp1Num - execPrice) / execPrice * notional : null;
  const rr = potL && potP ? (potP / potL).toFixed(2) : null;

  const handleSubmit = () => {
    setError('');
    if (notional <= 0) return setError('Enter a quantity');
    if (execPrice <= 0) return setError('Waiting for live price…');
    if (fundsReq > balance) return setError(`Need ${fUsd(fundsReq)}, have ${fUsd(balance)}`);
    onSubmit({
      direction, notionalUsd: notional, leverage: 1,
      stopLoss: sl ? parseFloat(sl) : null,
      takeProfit1: tp1 ? parseFloat(tp1) : null,
      takeProfit2: tp2 ? parseFloat(tp2) : null,
      takeProfit3: tp3 ? parseFloat(tp3) : null,
      note: '',
    });
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] select-none">

      {/* Long / Short tabs — sticky */}
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        {(['LONG', 'SHORT'] as PaperDirection[]).map(d => (
          <button key={d} type="button" onClick={() => setDirection(d)}
            className={`py-3 text-sm font-bold transition-all cursor-pointer ${direction === d
              ? d === 'LONG'
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-b-2 border-[var(--color-success)]'
                : 'bg-[var(--color-danger)]/10  text-[var(--color-danger)]  border-b-2 border-[var(--color-danger)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border-b-2 border-transparent'
              }`}>
            {d === 'LONG' ? 'Long' : 'Short'}
          </button>
        ))}
      </div>

      {/* Scrollable form body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">

        {/* Limit / Market */}
        <div className="flex gap-1 p-0.5 bg-[var(--bg-secondary)] rounded-lg">
          {(['limit', 'market'] as const).map(t => (
            <button key={t} type="button" onClick={() => setOrderType(t)}
              className={`flex-1 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${orderType === t ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}>
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

        {/* Limit price */}
        {orderType === 'limit' && (
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-muted)] font-semibold">Limit Price (USD)</label>
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
              <button type="button"
                onClick={() => setLimitPx(v => String(Math.max(0, (parseFloat(v) || livePrice) - 1)))}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <Minus className="w-3 h-3" />
              </button>
              <input type="number" step="any" value={limitPx} onChange={e => setLimitPx(e.target.value)}
                className="flex-1 text-center bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" />
              <button type="button"
                onClick={() => setLimitPx(v => String((parseFloat(v) || livePrice) + 1))}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* ── Quantity — 3-mode selector ─────────────────────────────────────── */}
        <div className="space-y-2">
          <label className="text-[11px] text-[var(--text-muted)] font-semibold">Quantity</label>

          {/* Mode tabs */}
          <div className="flex p-0.5 bg-[var(--bg-secondary)] rounded-lg gap-0.5">
            {([
              { key: 'units' as QtyMode, label: base },
              { key: 'usd' as QtyMode, label: 'USD' },
              { key: 'pct' as QtyMode, label: '% Wallet' },
            ]).map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setQtyMode(key)}
                className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${qtyMode === key ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Input for each mode */}
          {qtyMode === 'units' && (
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
              <input type="number" step="any" min="0" value={qtyUnits} onChange={e => setQtyUnits(e.target.value)}
                placeholder={`e.g. 0.5`}
                className="flex-1 bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" />
              <span className="text-[11px] font-bold text-[var(--text-muted)]">{base}</span>
            </div>
          )}
          {qtyMode === 'usd' && (
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
              <span className="text-[11px] font-semibold text-[var(--text-muted)]">$</span>
              <input type="number" step="any" min="0" value={qtyUsd} onChange={e => setQtyUsd(e.target.value)}
                placeholder="100"
                className="flex-1 bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" />
              <span className="text-[11px] font-bold text-[var(--text-muted)]">USD</span>
            </div>
          )}
          {qtyMode === 'pct' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2">
                <input type="number" step="1" min="1" max="100" value={qtyPct} onChange={e => setQtyPct(e.target.value)}
                  placeholder="10"
                  className="flex-1 bg-transparent text-sm font-mono-num font-semibold text-[var(--text-primary)] focus:outline-none" />
                <span className="text-[11px] font-bold text-[var(--text-muted)]">%</span>
              </div>
              <div className="flex gap-1">
                {[10, 25, 50, 75, 100].map(p => (
                  <button key={p} type="button" onClick={() => setQtyPct(String(p))}
                    className={`flex-1 py-1 rounded text-[9px] font-bold transition-all cursor-pointer ${qtyPct === String(p)
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]'
                      }`}>
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {notional > 0 && execPrice > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              ≈ {unitCount.toFixed(5)} {base} · {fUsd(notional)} notional
            </p>
          )}
        </div>

        {/* Bracket Order (SL / TP) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">Bracket Order</span>
            <button type="button" onClick={() => setBracketOn(!bracketOn)}
              className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] font-semibold cursor-pointer hover:opacity-80">
              <Plus className="w-3 h-3" />
              {bracketOn ? 'Hide' : 'Add'} TP/SL
            </button>
          </div>
          {bracketOn && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-orange-400">Stop Loss ($)</label>
                  <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)}
                    className="w-full mt-0.5 bg-[var(--bg-secondary)] border border-orange-400/30 rounded-lg px-2.5 py-1.5
                               text-xs font-mono-num text-orange-400 focus:outline-none focus:border-orange-400" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-emerald-400">Take Profit 1 ($)</label>
                  <input type="number" step="any" value={tp1} onChange={e => setTp1(e.target.value)}
                    className="w-full mt-0.5 bg-[var(--bg-secondary)] border border-emerald-400/30 rounded-lg px-2.5 py-1.5
                               text-xs font-mono-num text-emerald-400 focus:outline-none focus:border-emerald-400" />
                </div>
              </div>
              <button type="button" onClick={() => setShowTp23(!showTp23)}
                className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] font-semibold cursor-pointer hover:opacity-80">
                <ChevronDown className={`w-3 h-3 transition-transform ${showTp23 ? 'rotate-180' : ''}`} />
                {showTp23 ? 'Hide' : 'Add'} TP2 / TP3
              </button>
              {showTp23 && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-teal-400">TP2 ($)</label>
                    <input type="number" step="any" value={tp2} onChange={e => setTp2(e.target.value)}
                      className="w-full mt-0.5 bg-[var(--bg-secondary)] border border-teal-400/30 rounded-lg px-2.5 py-1.5
                                 text-xs font-mono-num text-teal-400 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-cyan-400">TP3 ($)</label>
                    <input type="number" step="any" value={tp3} onChange={e => setTp3(e.target.value)}
                      className="w-full mt-0.5 bg-[var(--bg-secondary)] border border-cyan-400/30 rounded-lg px-2.5 py-1.5
                                 text-xs font-mono-num text-cyan-400 focus:outline-none focus:border-cyan-400" />
                  </div>
                </div>
              )}
              {rr && (
                <div className="flex justify-between px-2.5 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px]">
                  <span className="text-[var(--text-muted)]">Risk:Reward</span>
                  <span className="font-bold text-[var(--text-primary)]">1:{rr}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Funds summary */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Funds required</span>
            <span className="font-semibold font-mono-num text-[var(--text-primary)]">{fUsd(fundsReq)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)] flex items-center gap-1"><Wallet className="w-3 h-3" /> Available</span>
            <span className="font-bold font-mono-num text-[var(--text-primary)]">{fUsd(balance)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Fee (0.05%)</span>
            <span className="text-[var(--text-muted)] font-mono-num">{fUsd(fee)}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[11px] text-[var(--color-danger)]">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
          </div>
        )}
      </div>

      {/* Submit button — pinned at bottom, always reachable */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <button type="button" onClick={handleSubmit} disabled={execPrice <= 0 || isSubmitting}
          className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50 ${direction === 'LONG'
            ? 'bg-[var(--color-success)] hover:opacity-90 shadow-lg shadow-[var(--color-success)]/20'
            : 'bg-[var(--color-danger)]  hover:opacity-90 shadow-lg shadow-[var(--color-danger)]/20'
            }`}>
          {isSubmitting ? 'Placing…' : direction === 'LONG' ? `Buy / Long ${base}` : `Sell / Short ${base}`}
        </button>
        <p className="text-[9px] text-[var(--text-muted)] text-center mt-1.5">
          Paper trading — no real funds at risk
        </p>
      </div>
    </div>
  );
};

// ─── Positions table row ────────────────────────────────────────────────────────
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
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            }`}>
            {pos.direction}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">{fUsd(parseFloat(pos.notional_usd))}</td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">${fP(entry, pos.instrument)}</td>
      <td className="px-3 py-2 text-xs font-mono-num text-[var(--text-secondary)]">
        {livePrice > 0 ? `$${fP(livePrice, pos.instrument)}` : '—'}
      </td>
      <td className={`px-3 py-2 text-xs font-mono-num font-bold ${pnl != null ? pnlCls(pnl) : 'text-[var(--text-muted)]'}`}>
        {pnl != null ? `${pnl >= 0 ? '+' : ''}${fUsd(pnl)}` : '—'}
        {pnlPct != null && <span className="ml-1 text-[10px] opacity-70">({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)</span>}
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
        {liqDist != null && liqDist < 10
          ? <span className="text-[var(--color-danger)] font-bold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />${fP(parseFloat(pos.liquidation_price), pos.instrument)}
          </span>
          : <span className="text-[var(--text-muted)]">${fP(parseFloat(pos.liquidation_price), pos.instrument)}</span>
        }
      </td>
      <td className="px-3 py-2">
        <button type="button" onClick={onClose}
          className="px-2.5 py-1 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30
                     text-[10px] font-bold hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer">
          Close
        </button>
      </td>
    </tr>
  );
};

// ─── History row ────────────────────────────────────────────────────────────────
const HistoryRow: React.FC<{ pos: PaperPosition }> = ({ pos }) => {
  const pnl = parseFloat(pos.realised_pnl ?? '0');
  const badge: Record<string, string> = {
    CLOSED: 'text-[var(--text-muted)]', SL_HIT: 'text-orange-400',
    TP1_HIT: 'text-emerald-400', TP2_HIT: 'text-teal-400', TP3_HIT: 'text-cyan-400',
    LIQUIDATED: 'text-[var(--color-danger)]',
  };
  return (
    <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors text-xs">
      <td className="px-3 py-2 font-bold text-[var(--text-primary)]">{pos.instrument}</td>
      <td className="px-3 py-2">
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
          }`}>{pos.direction}</span>
      </td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">${fP(parseFloat(pos.entry_price), pos.instrument)}</td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">
        {pos.close_price ? `$${fP(parseFloat(pos.close_price), pos.instrument)}` : '—'}
      </td>
      <td className={`px-3 py-2 font-mono-num font-bold ${pnlCls(pnl)}`}>{pnl >= 0 ? '+' : ''}{fUsd(pnl)}</td>
      <td className={`px-3 py-2 text-[10px] font-bold ${badge[pos.status] ?? ''}`}>{pos.close_reason ?? pos.status}</td>
      <td className="px-3 py-2 text-[var(--text-muted)]">
        {pos.closed_at ? new Date(pos.closed_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
    </tr>
  );
};

// ─── Ledger row ─────────────────────────────────────────────────────────────────
const LedgerRow: React.FC<{ entry: { id: string; entry_type: string; note: string; amount: string; balance_after: string; created_at: string } }> = ({ entry }) => {
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
      <td className="px-3 py-2 text-[var(--text-muted)] max-w-[160px] truncate">{entry.note}</td>
      <td className={`px-3 py-2 font-mono-num font-bold ${amount >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
        {amount >= 0 ? '+' : ''}{fUsd(amount)}
      </td>
      <td className="px-3 py-2 font-mono-num text-[var(--text-secondary)]">{fUsd(parseFloat(entry.balance_after))}</td>
      <td className="px-3 py-2 text-[var(--text-muted)]">
        {new Date(entry.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  );
};

// ─── Micro components ───────────────────────────────────────────────────────────
const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center py-8 text-xs text-[var(--text-muted)]">{text}</div>
);

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function MyTradesPage() {
  const [activeInstrument, setActiveInstrument] = useState('BTC/USDT');
  const [closingPos, setClosingPos] = useState<PaperPosition | null>(null);
  const [bottomTab, setBottomTab] = useState<'positions' | 'history' | 'ledger'>('positions');
  const [chartHeight, setChartHeight] = useState(500);
  const chartRef = useRef<HTMLDivElement>(null);

  // ResizeObserver keeps chart height in sync
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const h = Math.floor(e.contentRect.height);
      if (h > 200) setChartHeight(h);
    });
    ro.observe(el);
    if (el.clientHeight > 200) setChartHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const allPrices = useAllPrices();
  const wsPrice = useLivePrice(activeInstrument);   // WebSocket-driven

  // Direct REST poll from Binance Vision — same source as ZoneLinesChart
  // Keeps mark price tightly in sync with the chart's last candle
  const [directPrice, setDirectPrice] = useState(0);
  const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';
  const binanceMap: Record<string, string> = {
    'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT',
    'SOL/USDT': 'SOLUSDT', 'XRP/USDT': 'XRPUSDT',
  };
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const sym = binanceMap[activeInstrument];
      if (!sym) { setDirectPrice(0); return; }
      try {
        const r = await fetch(`${API_BASE}/api/market/klines?symbol=${sym}&interval=1m&limit=1`);
        if (!r.ok) return;
        const data: any[][] = await r.json();
        if (data.length && !cancelled) setDirectPrice(parseFloat(data[0][4]));
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 5_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [activeInstrument, API_BASE]);

  // Use directPrice if available (matches chart), fall back to WebSocket price
  const livePrice = directPrice > 0 ? directPrice : wsPrice;

  const { data: account } = usePaperAccount();
  const { data: openPositions = [], isLoading: posLoading, refetch: refetchPos } = usePaperPositions();
  const { data: closedPositions = [] } = usePaperHistory();
  const { data: ledgerEntries = [] } = usePaperLedger(100);

  const openMut = useOpenPaperPosition();
  const closeMut = useClosePaperPosition();

  const activeChartItem = CHART_ITEMS.find(c => c.instrument === activeInstrument);
  const activeOpenPos = useMemo(() => openPositions.find(p => p.instrument === activeInstrument) ?? null, [openPositions, activeInstrument]);
  const chartOverlay = useMemo(() => activeOpenPos ? positionToChartOverlay(activeOpenPos) : null, [activeOpenPos]);

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

  // Also refetch positions periodically
  useEffect(() => {
    const id = setInterval(refetchPos, 15_000);
    return () => clearInterval(id);
  }, [refetchPos]);

  const balance = account ? parseFloat(account.balance) : 0;

  const handleOrderSubmit = (params: Parameters<typeof openMut.mutate>[0]) => {
    openMut.mutate({ ...params, marketPrice: livePrice });
  };
  const handleCloseConfirm = (price: number) => {
    if (!closingPos) return;
    closeMut.mutate({ positionId: closingPos.id, marketPrice: price }, { onSettled: () => setClosingPos(null) });
  };

  // Render
  return (
    <div className="-m-5 lg:-m-6">

      {/* Chart + Order panel: full viewport height, no separate header bar */}
      <div className="flex border-b border-[var(--border-subtle)]"
           style={{ height: 'calc(100vh - 64px)', minHeight: '560px' }}>

        {/* Left column: instrument selector + chart stacked */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

          {/* Instrument selector — lives inside chart column, above the chart */}
          <div className="flex items-center gap-1 px-3 py-1.5 flex-shrink-0
                          bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]
                          overflow-x-auto scrollbar-thin">
            {CHART_ITEMS.map(({ instrument, label }) => {
              const hasOpen  = openPositions.some(p => p.instrument === instrument);
              const isActive = activeInstrument === instrument;
              return (
                <button key={instrument} type="button" onClick={() => setActiveInstrument(instrument)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border
                              whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                    isActive
                      ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]'
                      : 'bg-transparent text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-subtle)]'
                  }`}>
                  {label}
                  {hasOpen && (
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-[var(--brand-primary)]' : 'bg-[var(--color-success)]'}`} />
                  )}
                </button>
              );
            })}
            <span className="ml-auto flex-shrink-0 flex items-center gap-1 text-[10px] font-bold
                             text-[var(--brand-primary)] px-2 py-0.5 rounded-full
                             bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
              <ShieldCheck className="w-3 h-3" /> PAPER
            </span>
          </div>

          {/* Chart fills all remaining height */}
          <div ref={chartRef} className="flex-1 min-h-0 overflow-hidden">
            <ZoneLinesChart
              tvSymbol={activeChartItem?.symbol}
              instrument={activeInstrument}
              prediction={chartOverlay}
              height={chartHeight}
              currentPrice={livePrice}
              showTimeframeBar={true}
              allowDrawing={true}
            />
          </div>
        </div>

        {/* Right column: order panel */}
        <div className="w-[285px] flex-shrink-0 border-l border-[var(--border-subtle)] overflow-hidden">
          <OrderPanel
            instrument={activeInstrument}
            livePrice={livePrice}
            balance={balance}
            isSubmitting={openMut.isPending}
            onSubmit={handleOrderSubmit}
          />
        </div>
      </div>

            {/* ── Positions / History / Ledger — visible on scroll ────────────────── */}
      <div className="bg-[var(--bg-surface)]">

        {/* Tab bar — sticky so it stays visible while scrolling the table */}
        <div className="sticky top-0 z-10 flex items-center border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4">
          {[
            { key: 'positions' as const, label: `Positions (${openPositions.length})`, icon: <BarChart2 className="w-3 h-3" /> },
            { key: 'history' as const, label: `Trade History (${closedPositions.length})`, icon: <History className="w-3 h-3" /> },
            { key: 'ledger' as const, label: 'Account Ledger', icon: <BookOpen className="w-3 h-3" /> },
          ].map(({ key, label, icon }) => (
            <button key={key} type="button" onClick={() => setBottomTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${bottomTab === key
                ? 'text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]'
                }`}>
              {icon}{label}
            </button>
          ))}
        </div>

        <div className="min-h-[180px]">
          {/* ── Open Positions ── */}
          {bottomTab === 'positions' && (
            posLoading ? (
              <div className="p-4 space-y-2">{[0, 1].map(i => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
            ) : openPositions.length === 0 ? (
              <EmptyState text="No open positions. Place an order above." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Instrument', 'Size (USD)', 'Entry', 'Mark Price', 'Unrealized P&L', 'Stop Loss', 'Take Profit', 'Liq. Price', ''].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map(pos => (
                      <PositionRow key={pos.id} pos={pos}
                        livePrice={directPrice > 0 && pos.instrument === activeInstrument ? directPrice : (allPrices[pos.instrument] ?? 0)}
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
                <table className="w-full min-w-[640px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Instrument', 'Side', 'Entry', 'Close Price', 'Realized P&L', 'Reason', 'Closed At'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{closedPositions.map(pos => <HistoryRow key={pos.id} pos={pos} />)}</tbody>
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
                <table className="w-full min-w-[560px]">
                  <thead className="bg-[var(--bg-secondary)]">
                    <tr className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      {['Type', 'Note', 'Amount', 'Balance After', 'Time'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>{ledgerEntries.map(e => <LedgerRow key={e.id} entry={e} />)}</tbody>
                </table>
              </div>
            )
          )}
        </div>

        <div className="px-4 py-2 text-[9px] text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
          Simulated only · 0.05% fee · 0.05% slippage · SL/TP/Liquidation checked server-side every 15 s
        </div>
      </div>

      {closingPos && (
        <CloseModal
          pos={closingPos}
          livePrice={directPrice > 0 && closingPos.instrument === activeInstrument ? directPrice : (allPrices[closingPos.instrument] ?? 0)}
          onCancel={() => setClosingPos(null)}
          onConfirm={handleCloseConfirm}
          isPending={closeMut.isPending}
        />
      )}
    </div>
  );
}