import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, X, RotateCcw,
  AlertTriangle, CheckCircle2, Wallet, Trophy,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { GoChartingWidget as ZoneLinesChart } from '../../components/charts/gocharting/GoChartingWidget';
import { usePaperTradingStore, type PTDirection, type PaperPosition } from '../../state/usePaperTradingStore';
import { CHART_ITEMS } from '../../constants';
import type { Prediction } from '../../types';

// ─── Live price ───────────────────────────────────────────────────────────────
const BINANCE_MAP: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT', 'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT', 'XRP/USDT': 'XRPUSDT',
};
const STATIC: Record<string, number> = { 'GOLD': 2684.5, 'SILVER': 31.85 };

async function getLivePrice(instrument: string): Promise<number | null> {
  const sym = BINANCE_MAP[instrument];
  if (sym) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}`);
      if (!r.ok) return STATIC[instrument] ?? null;
      return parseFloat((await r.json()).price);
    } catch { return STATIC[instrument] ?? null; }
  }
  return STATIC[instrument] ?? null;
}

// ─── Formatters ───────────────────────────────────────────────────────────────
const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtP = (n: number, ins: string) => {
  const d = ins === 'XRP/USDT' ? 4 : ins === 'SILVER' ? 3 : 2;
  return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
};

const pnlCls = (n: number) =>
  n > 0 ? 'text-[var(--color-success)]' : n < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--text-muted)]';

// ─── Build Prediction shape for chart lines ───────────────────────────────────
function positionToPrediction(pos: PaperPosition): Prediction {
  return {
    id: pos.id,
    traderId: 'paper',
    trader: { id: 'paper', displayName: 'Paper', handle: '@paper', avatar: '', verifiedBadge: false, winRate: 0 },
    title: '', instrument: pos.instrument, category: 'CRYPTO',
    direction: pos.direction,
    buyingZone: pos.direction === 'LONG' ? pos.entryPrice : undefined,
    sellingZone: pos.direction === 'SHORT' ? pos.entryPrice : undefined,
    stopLoss: pos.stopLoss ?? undefined,
    takeProfit: pos.takeProfit ?? undefined,
    timeframe: '1h', strategy: 'Paper', analysis: '', tags: [],
    status: 'ACTIVE', visibility: 'PUBLIC',
    createdAt: pos.openedAt, updatedAt: pos.openedAt,
    likesCount: 0, viewsCount: 0,
  };
}

// ─── Leverage options ─────────────────────────────────────────────────────────
const LEVERAGE_OPTIONS = [1, 2, 3, 5, 10, 20, 50, 100];

// ─── Order Form ───────────────────────────────────────────────────────────────
interface OrderFormProps {
  instrument: string;
  livePrice: number;
  balance: number;
  onSubmit: (p: {
    direction: PTDirection;
    sizeUsd: number;
    leverage: number;
    stopLoss: number | null;
    takeProfit: number | null;
    note: string;
  }) => string | null;
}

const OrderForm: React.FC<OrderFormProps> = ({ instrument, livePrice, balance, onSubmit }) => {
  const [direction, setDirection] = useState<PTDirection>('LONG');
  const [sizeUsd, setSizeUsd] = useState('500');
  const [leverage, setLeverage] = useState(1);
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (livePrice <= 0) return;
    const d = instrument === 'XRP/USDT' ? 4 : 2;
    if (direction === 'LONG') {
      setSl((livePrice * 0.97).toFixed(d));
      setTp((livePrice * 1.05).toFixed(d));
    } else {
      setSl((livePrice * 1.03).toFixed(d));
      setTp((livePrice * 0.95).toFixed(d));
    }
  }, [instrument, direction, livePrice]);

  const notional = parseFloat(sizeUsd) || 0;
  const margin = notional > 0 ? parseFloat((notional / leverage).toFixed(2)) : 0;
  const units = livePrice > 0 && notional > 0 ? notional / livePrice : 0;
  const liqPrice = livePrice > 0 && leverage > 1
    ? direction === 'LONG'
      ? livePrice * (1 - 1 / leverage)
      : livePrice * (1 + 1 / leverage)
    : null;

  const handleSubmit = () => {
    setError(''); setSuccess('');
    const err = onSubmit({ direction, sizeUsd: notional, leverage, stopLoss: sl ? parseFloat(sl) : null, takeProfit: tp ? parseFloat(tp) : null, note: note.trim() });
    if (err) { setError(err); }
    else { setSuccess('Position opened!'); setSizeUsd('500'); setNote(''); setTimeout(() => setSuccess(''), 2000); }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Direction */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
        {(['LONG', 'SHORT'] as PTDirection[]).map(d => (
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
        <span className="text-sm font-extrabold font-mono-num text-[var(--text-primary)]">
          {livePrice > 0 ? `$${fmtP(livePrice, instrument)}` : '—'}
        </span>
      </div>

      {/* Size */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-muted)]">Order Size (USD)</label>
          <div className="flex gap-1">
            {[25, 50, 100].map(pct => (
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
            {leverage > 1 && <span className="ml-1.5 text-amber-400 font-semibold">Margin: {fmtUsd(margin)}</span>}
          </p>
        )}
      </div>

      {/* ── Leverage ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold text-[var(--text-muted)]">Leverage</label>
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full transition-colors ${leverage >= 20 ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'
            : leverage >= 5 ? 'bg-amber-500/10 text-amber-400'
              : 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
            }`}>
            {leverage}×
          </span>
        </div>

        {/* Slider */}
        <input type="range" min={1} max={100} step={1} value={leverage}
          onChange={e => setLeverage(parseInt(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--brand-primary)]"
          style={{ background: `linear-gradient(to right, var(--brand-primary) 0%, var(--brand-primary) ${leverage}%, var(--bg-surface) ${leverage}%, var(--bg-surface) 100%)` }}
        />

        {/* Quick-pick */}
        <div className="flex gap-1 flex-wrap">
          {LEVERAGE_OPTIONS.map(lv => (
            <button key={lv} type="button" onClick={() => setLeverage(lv)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${leverage === lv
                ? lv >= 20 ? 'bg-[var(--color-danger)] text-white'
                  : lv >= 5 ? 'bg-amber-500 text-white'
                    : 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}>
              {lv}×
            </button>
          ))}
        </div>

        {/* Liquidation price */}
        {liqPrice != null && livePrice > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[10px] text-[var(--color-danger)] font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Liq. Price
            </span>
            <span className="text-[10px] font-extrabold font-mono-num text-[var(--color-danger)]">
              ${fmtP(liqPrice, instrument)}
            </span>
          </div>
        )}
      </div>

      {/* SL / TP */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-orange-400">Stop Loss ($)</label>
          <input type="number" step="any" value={sl} onChange={e => setSl(e.target.value)} placeholder="Optional"
            className="w-full bg-[var(--bg-secondary)] border border-orange-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-orange-400 focus:outline-none focus:border-orange-400 placeholder:text-[var(--text-muted)]" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-emerald-400">Take Profit ($)</label>
          <input type="number" step="any" value={tp} onChange={e => setTp(e.target.value)} placeholder="Optional"
            className="w-full bg-[var(--bg-secondary)] border border-emerald-400/30 rounded-lg px-2.5 py-1.5 text-xs font-mono-num text-emerald-400 focus:outline-none focus:border-emerald-400 placeholder:text-[var(--text-muted)]" />
        </div>
      </div>

      {/* Note */}
      <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Trade note (optional)"
        className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--brand-primary)] placeholder:text-[var(--text-muted)]" />

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-xs text-[var(--color-success)]">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />{success}
        </div>
      )}

      <Button variant={direction === 'LONG' ? 'primary' : 'danger'} size="md"
        className="w-full justify-center"
        leftIcon={direction === 'LONG' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        onClick={handleSubmit} disabled={livePrice <= 0}>
        {direction === 'LONG' ? 'Buy' : 'Sell'} {instrument.split('/')[0]}
        {leverage > 1 && <span className="ml-1 opacity-80 font-mono">{leverage}×</span>}
      </Button>

      {/* Balance info */}
      <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
            <Wallet className="w-3 h-3" /> Available
          </span>
          <span className="text-xs font-bold font-mono-num text-[var(--text-primary)]">{fmtUsd(balance)}</span>
        </div>
        {leverage > 1 && margin > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-[var(--text-muted)]">Margin required</span>
            <span className="text-xs font-bold font-mono-num text-amber-400">{fmtUsd(margin)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Position card ────────────────────────────────────────────────────────────
const PositionCard: React.FC<{
  pos: PaperPosition; livePrice: number; onClose: () => void;
}> = ({ pos, livePrice, onClose }) => {
  const pnl = livePrice > 0
    ? pos.direction === 'LONG'
      ? (livePrice - pos.entryPrice) * pos.size
      : (pos.entryPrice - livePrice) * pos.size
    : null;
  const pnlPct = pnl != null ? ((pnl / pos.marginUsd) * 100).toFixed(2) : null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all">
      <div className="flex-1 min-w-0 space-y-0.5">
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
        <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
          <span>Entry <strong className="text-[var(--text-primary)]">${fmtP(pos.entryPrice, pos.instrument)}</strong></span>
          <span>Notional <strong className="text-[var(--text-primary)]">{fmtUsd(pos.notionalUsd)}</strong></span>
          <span>Margin <strong className="text-amber-400">{fmtUsd(pos.marginUsd)}</strong></span>
        </div>
        {(pos.stopLoss || pos.takeProfit || pos.leverage > 1) && (
          <div className="flex items-center gap-2 text-[10px]">
            {pos.stopLoss && <span className="text-orange-400">SL ${fmtP(pos.stopLoss, pos.instrument)}</span>}
            {pos.takeProfit && <span className="text-emerald-400">TP ${fmtP(pos.takeProfit, pos.instrument)}</span>}
            {pos.leverage > 1 && <span className="text-[var(--color-danger)]">Liq ${fmtP(pos.liquidationPrice, pos.instrument)}</span>}
          </div>
        )}
      </div>

      {pnl != null && (
        <div className="text-right flex-shrink-0">
          <p className={`text-sm font-extrabold font-mono-num ${pnlCls(pnl)}`}>
            {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
          </p>
          {pnlPct && (
            <p className={`text-[10px] font-semibold font-mono-num ${pnlCls(pnl)}`}>
              {pnl >= 0 ? '+' : ''}{pnlPct}% (on margin)
            </p>
          )}
        </div>
      )}

      <button type="button" onClick={onClose}
        className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30 text-xs font-bold hover:bg-[var(--color-danger)] hover:text-white transition-all cursor-pointer">
        Close
      </button>
    </div>
  );
};

// ─── Close modal ──────────────────────────────────────────────────────────────
const CloseModal: React.FC<{
  pos: PaperPosition; livePrice: number;
  onCancel: () => void; onConfirm: (price: number) => void;
}> = ({ pos, livePrice, onCancel, onConfirm }) => {
  const [price, setPrice] = useState(livePrice > 0 ? livePrice.toFixed(2) : '');
  const p = parseFloat(price) || 0;
  const pnl = p > 0
    ? pos.direction === 'LONG' ? (p - pos.entryPrice) * pos.size : (pos.entryPrice - p) * pos.size
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Close {pos.instrument} {pos.direction}
            {pos.leverage > 1 && <span className="ml-2 text-amber-400 text-xs">{pos.leverage}×</span>}
          </h3>
          <button onClick={onCancel} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-[var(--text-muted)] font-semibold">Close at price ($)</label>
          <input type="number" step="any" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm font-mono-num focus:outline-none focus:border-[var(--brand-primary)]" />
          {livePrice > 0 && (
            <button type="button" onClick={() => setPrice(livePrice.toFixed(2))}
              className="text-[10px] text-[var(--brand-primary)] font-semibold hover:underline cursor-pointer">
              Use live price ${fmtP(livePrice, pos.instrument)}
            </button>
          )}
        </div>

        {p > 0 && (
          <div className={`flex justify-between items-center px-3 py-2.5 rounded-lg border ${pnl >= 0 ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]/30' : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/30'}`}>
            <span className="text-xs text-[var(--text-muted)]">P&L</span>
            <span className={`text-sm font-extrabold font-mono-num ${pnl >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1 justify-center" onClick={onCancel}>Cancel</Button>
          <Button variant={pnl >= 0 ? 'primary' : 'danger'} size="sm" className="flex-1 justify-center"
            onClick={() => onConfirm(p)} disabled={p <= 0}>
            Confirm Close
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MyTradesPage() {
  const { balance, startingBalance, positions, openPosition, closePosition, resetAccount } = usePaperTradingStore();
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [activeInstrument, setActiveInstrument] = useState('BTC/USDT');
  const [closingPos, setClosingPos] = useState<PaperPosition | null>(null);
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const [resetConfirm, setResetConfirm] = useState(false);

  const openPositions = useMemo(() => positions.filter(p => p.status === 'OPEN'), [positions]);
  const closedPositions = useMemo(() =>
    positions.filter(p => p.status !== 'OPEN')
      .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime()),
    [positions]);

  const refreshPrices = useCallback(async () => {
    const results: Record<string, number> = {};
    await Promise.all(CHART_ITEMS.map(async ({ instrument }) => {
      const p = await getLivePrice(instrument);
      if (p != null) results[instrument] = p;
    }));
    setLivePrices(results);
  }, []);

  useEffect(() => {
    refreshPrices();
    const id = setInterval(refreshPrices, 15_000);
    return () => clearInterval(id);
  }, [refreshPrices]);

  const activeOpenPos = useMemo(
    () => openPositions.find(p => p.instrument === activeInstrument) ?? null,
    [openPositions, activeInstrument]
  );
  const chartPrediction = useMemo(
    () => activeOpenPos ? positionToPrediction(activeOpenPos) : null,
    [activeOpenPos]
  );

  // Stats
  const totalRealised = closedPositions.reduce((s, p) => s + (p.realisedPnl ?? 0), 0);
  const totalUnrealised = openPositions.reduce((s, p) => {
    const lp = livePrices[p.instrument] ?? 0;
    if (!lp) return s;
    return s + (p.direction === 'LONG' ? (lp - p.entryPrice) * p.size : (p.entryPrice - lp) * p.size);
  }, 0);
  const networth = balance + openPositions.reduce((s, p) => s + p.marginUsd, 0) + totalUnrealised;
  const totalReturnPct = ((networth - startingBalance) / startingBalance * 100).toFixed(2);
  const winners = closedPositions.filter(p => (p.realisedPnl ?? 0) > 0).length;
  const winRate = closedPositions.length > 0 ? ((winners / closedPositions.length) * 100).toFixed(1) : null;

  const handleOrderSubmit = (params: {
    direction: PTDirection; sizeUsd: number; leverage: number;
    stopLoss: number | null; takeProfit: number | null; note: string;
  }): string | null => {
    if (!params.sizeUsd || params.sizeUsd <= 0) return 'Enter a valid size.';
    const lp = livePrices[activeInstrument] ?? 0;
    if (lp <= 0) return 'Could not fetch live price. Try again.';
    const margin = params.sizeUsd / params.leverage;
    if (margin > balance) return `Insufficient margin. Need ${fmtUsd(margin)}, have ${fmtUsd(balance)}`;
    openPosition({
      instrument: activeInstrument,
      direction: params.direction,
      size: parseFloat((params.sizeUsd / lp).toFixed(6)),
      entryPrice: lp,
      notionalUsd: params.sizeUsd,
      leverage: params.leverage,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      note: params.note,
    });
    return null;
  };

  const activeChartItem = CHART_ITEMS.find(c => c.instrument === activeInstrument);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Paper Trading</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">DEMO</span>
        </div>

        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Balance</span>
            <span className="font-bold font-mono-num text-[var(--text-primary)]">{fmtUsd(balance)}</span>
          </div>
          <div className="h-3 w-px bg-[var(--border-subtle)]" />
          <div>
            <span className="text-[var(--text-muted)]">P&L </span>
            <span className={`font-bold font-mono-num ${pnlCls(totalRealised + totalUnrealised)}`}>
              {(totalRealised + totalUnrealised) >= 0 ? '+' : ''}{fmtUsd(totalRealised + totalUnrealised)}
            </span>
          </div>
          <div className="h-3 w-px bg-[var(--border-subtle)]" />
          <div>
            <span className="text-[var(--text-muted)]">Return </span>
            <span className={`font-bold font-mono-num ${pnlCls(parseFloat(totalReturnPct))}`}>
              {parseFloat(totalReturnPct) >= 0 ? '+' : ''}{totalReturnPct}%
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
              <button onClick={() => { resetAccount(); setResetConfirm(false); }}
                className="px-2 py-0.5 rounded bg-[var(--color-danger)] text-white text-[10px] font-bold cursor-pointer">Yes</button>
              <button onClick={() => setResetConfirm(false)}
                className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[10px] font-bold cursor-pointer text-[var(--text-muted)]">No</button>
            </div>
          ) : (
            <button onClick={() => setResetConfirm(true)}
              className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors cursor-pointer">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
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
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}>
              {label}
              {hasOpen && <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-[var(--color-success)]'}`} />}
            </button>
          );
        })}
      </div>

      {/* Chart + Order Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-3 items-start">
        <ZoneLinesChart
          tvSymbol={activeChartItem?.symbol}
          instrument={activeInstrument}
          prediction={chartPrediction}
          currentPrice={livePrices[activeInstrument] ?? null}
          height={560}
          showTimeframeBar={true}
          allowDrawing={true}
        />

        <GlassCard hoverEffect={false} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{activeInstrument}</h3>
            {livePrices[activeInstrument] ? (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                <span className="text-xs font-mono-num font-semibold text-[var(--text-primary)]">
                  ${fmtP(livePrices[activeInstrument], activeInstrument)}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)]">Fetching…</span>
            )}
          </div>
          <OrderForm
            instrument={activeInstrument}
            livePrice={livePrices[activeInstrument] ?? 0}
            balance={balance}
            onSubmit={handleOrderSubmit}
          />
        </GlassCard>
      </div>

      {/* Positions / History */}
      <div className="space-y-3">
        <div className="flex items-center gap-1 p-0.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] w-fit">
          {(['open', 'history'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${tab === t ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              {t === 'open' ? `Open Positions (${openPositions.length})` : `History (${closedPositions.length})`}
            </button>
          ))}
        </div>

        {tab === 'open' && (
          openPositions.length === 0 ? (
            <GlassCard hoverEffect={false} className="py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No open positions. Place a trade above.</p>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {openPositions.map(pos => (
                <PositionCard key={pos.id} pos={pos}
                  livePrice={livePrices[pos.instrument] ?? 0}
                  onClose={() => setClosingPos(pos)} />
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          closedPositions.length === 0 ? (
            <GlassCard hoverEffect={false} className="py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No closed trades yet.</p>
            </GlassCard>
          ) : (
            <div className="space-y-0.5">
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <span>Instrument</span>
                <span className="hidden sm:block text-right">Leverage</span>
                <span className="hidden sm:block text-right">Entry</span>
                <span className="hidden sm:block text-right">Exit</span>
                <span className="hidden md:block text-right">Closed</span>
                <span className="text-right">P&L</span>
              </div>
              {closedPositions.map(pos => {
                const pnl = pos.realisedPnl ?? 0;
                return (
                  <div key={pos.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold text-[var(--text-primary)]">{pos.instrument}</span>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${pos.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                        {pos.direction}
                      </span>
                      {pos.status === 'LIQUIDATED' && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[var(--color-danger-bg)] text-[var(--color-danger)]">LIQ</span>
                      )}
                      {pnl >= 0 ? <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)] flex-shrink-0" /> : <X className="w-3.5 h-3.5 text-[var(--color-danger)] flex-shrink-0" />}
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-mono-num text-amber-400">{pos.leverage}×</p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-mono-num text-[var(--text-secondary)]">${fmtP(pos.entryPrice, pos.instrument)}</p>
                    </div>
                    <div className="hidden sm:block text-right">
                      <p className="text-xs font-mono-num text-[var(--text-secondary)]">${fmtP(pos.closePrice!, pos.instrument)}</p>
                    </div>
                    <div className="hidden md:block text-right">
                      <p className="text-[10px] text-[var(--text-muted)]">{new Date(pos.closedAt!).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-extrabold font-mono-num ${pnlCls(pnl)}`}>
                        {pnl >= 0 ? '+' : ''}{fmtUsd(pnl)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {closingPos && (
        <CloseModal pos={closingPos} livePrice={livePrices[closingPos.instrument] ?? 0}
          onCancel={() => setClosingPos(null)}
          onConfirm={price => { closePosition(closingPos.id, price); setClosingPos(null); }} />
      )}
    </div>
  );
}
