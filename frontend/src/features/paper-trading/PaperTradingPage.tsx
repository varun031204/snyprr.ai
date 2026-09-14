import React, { useState } from 'react';
import { Plus, X, RotateCcw, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { usePaperTradingStore, PaperTrade } from '../../state/usePaperTradingStore';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

const INSTRUMENTS = [
  { symbol: 'BTC/USDT',  price: 92500,  precision: 2 },
  { symbol: 'ETH/USDT',  price: 3420,   precision: 2 },
  { symbol: 'SOL/USDT',  price: 186,    precision: 2 },
  { symbol: 'XRP/USDT',  price: 2.45,   precision: 4 },
  { symbol: 'GOLD',      price: 2684,   precision: 2 },
  { symbol: 'SILVER',    price: 31.85,  precision: 3 },
];

const fmt = (n: number, p = 2) => n.toLocaleString(undefined, { minimumFractionDigits: p, maximumFractionDigits: p });

// ── Open Trade Modal ──────────────────────────────────────────────────────────
const OpenTradeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { balance, openTrade } = usePaperTradingStore();
  const [instrument, setInstrument] = useState(INSTRUMENTS[0].symbol);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [margin, setMargin] = useState('100');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [error, setError] = useState('');

  const selected = INSTRUMENTS.find((i) => i.symbol === instrument)!;
  const marginNum = parseFloat(margin) || 0;

  const handleSubmit = () => {
    setError('');
    if (marginNum <= 0) return setError('Enter a valid margin amount.');
    if (marginNum > balance) return setError(`Insufficient balance. Available: $${fmt(balance)}`);
    const slNum = parseFloat(sl);
    const tpNum = parseFloat(tp);
    if (!slNum || !tpNum) return setError('Stop Loss and Take Profit are required.');

    const result = openTrade({
      instrument,
      direction,
      entryPrice: selected.price,
      quantity: marginNum / selected.price,
      stopLoss: slNum,
      takeProfit: tpNum,
      margin: marginNum,
    });
    if (!result) return setError('Failed to open trade. Check balance.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Open Paper Trade</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Instrument</label>
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i.symbol} value={i.symbol}>{i.symbol} — ${i.price.toLocaleString()}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Direction</label>
          <div className="grid grid-cols-2 gap-2">
            {(['LONG', 'SHORT'] as const).map((d) => (
              <button key={d} onClick={() => setDirection(d)}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  direction === d
                    ? d === 'LONG'
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success)] text-[var(--color-success)]'
                      : 'bg-[var(--color-danger-bg)] border-[var(--color-danger)] text-[var(--color-danger)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}>
                {d === 'LONG' ? '▲ LONG' : '▼ SHORT'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-muted)] font-semibold">Entry Price (market)</span>
          <span className="text-sm font-bold font-mono-num text-[var(--text-primary)]">${selected.price.toLocaleString()}</span>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Margin (USDT) — Available: <span className="text-[var(--brand-primary)]">${fmt(balance)}</span>
          </label>
          <div className="flex gap-2">
            <input type="number" value={margin} onChange={(e) => setMargin(e.target.value)} placeholder="100"
              className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
            {[25, 50, 100].map((pct) => (
              <button key={pct} onClick={() => setMargin(((balance * pct) / 100).toFixed(2))}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)] transition-all">
                {pct}%
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-danger)] uppercase tracking-wider">Stop Loss</label>
            <input type="number" value={sl} onChange={(e) => setSl(e.target.value)}
              placeholder={direction === 'LONG' ? (selected.price * 0.97).toFixed(selected.precision) : (selected.price * 1.03).toFixed(selected.precision)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-danger)]" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--color-success)] uppercase tracking-wider">Take Profit</label>
            <input type="number" value={tp} onChange={(e) => setTp(e.target.value)}
              placeholder={direction === 'LONG' ? (selected.price * 1.06).toFixed(selected.precision) : (selected.price * 0.94).toFixed(selected.precision)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-success)]" />
          </div>
        </div>

        {error && <p className="text-xs text-[var(--color-danger)] bg-[var(--color-danger-bg)] px-3 py-2 rounded-lg">{error}</p>}

        <Button variant="primary" className="w-full" onClick={handleSubmit}>
          Open {direction} Trade
        </Button>
      </div>
    </div>
  );
};

// ── Close Trade Modal ─────────────────────────────────────────────────────────
const CloseTradeModal: React.FC<{ trade: PaperTrade; onClose: () => void }> = ({ trade, onClose }) => {
  const { closeTrade } = usePaperTradingStore();
  const market = INSTRUMENTS.find((i) => i.symbol === trade.instrument);
  const [price, setPrice] = useState(String(market?.price ?? trade.entryPrice));

  const closePrice = parseFloat(price) || trade.entryPrice;
  const priceDiff = trade.direction === 'LONG' ? closePrice - trade.entryPrice : trade.entryPrice - closePrice;
  const pnl = (priceDiff / trade.entryPrice) * trade.margin;
  const pnlPct = (priceDiff / trade.entryPrice) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Close Trade</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="text-sm text-[var(--text-secondary)] space-y-1">
          <p><span className="text-[var(--text-muted)]">Instrument:</span> <span className="font-bold">{trade.instrument}</span></p>
          <p><span className="text-[var(--text-muted)]">Entry:</span> <span className="font-mono-num">${fmt(trade.entryPrice)}</span></p>
          <p><span className="text-[var(--text-muted)]">Margin:</span> <span className="font-mono-num">${fmt(trade.margin)}</span></p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Close Price</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)]" />
        </div>
        <div className={`px-4 py-3 rounded-xl text-center font-bold text-sm ${pnl >= 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
          Estimated P&L: {pnl >= 0 ? '+' : ''}${fmt(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
        </div>
        <Button variant="primary" className="w-full" onClick={() => { closeTrade(trade.id, closePrice); onClose(); }}>
          Confirm Close
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PaperTradingPage: React.FC = () => {
  const { balance, initialBalance, trades, resetAccount } = usePaperTradingStore();
  const [showOpen, setShowOpen] = useState(false);
  const [closingTrade, setClosingTrade] = useState<PaperTrade | null>(null);
  const [tab, setTab] = useState<'open' | 'history'>('open');

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length ? ((wins / closedTrades.length) * 100).toFixed(1) : '—';
  const equity = balance + openTrades.reduce((sum, t) => sum + t.margin, 0);

  return (
    <div className="p-5 lg:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Paper Trading</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Practice with $10,000 virtual funds. No real money involved.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (confirm('Reset your paper trading account? All trades will be cleared.')) resetAccount(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--color-danger)] border border-[var(--border-subtle)] hover:border-[var(--color-danger)] transition-all">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowOpen(true)}>
            New Trade
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Available Balance', value: `$${fmt(balance)}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-[var(--brand-primary)]' },
          { label: 'Total Equity', value: `$${fmt(equity)}`, icon: <Activity className="w-5 h-5" />, color: equity >= initialBalance ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]' },
          { label: 'Realised P&L', value: `${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)}`, icon: <TrendingUp className="w-5 h-5" />, color: totalPnl >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]' },
          { label: 'Win Rate', value: winRate === '—' ? '—' : `${winRate}%`, icon: <TrendingDown className="w-5 h-5" />, color: 'text-[var(--color-info)]' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0 ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)] font-medium">{s.label}</p>
              <p className={`text-lg font-extrabold font-mono-num ${s.color}`}>{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl w-fit border border-[var(--border-subtle)]">
        {(['open', 'history'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
            {t === 'open' ? `Open (${openTrades.length})` : `History (${closedTrades.length})`}
          </button>
        ))}
      </div>

      {/* Open Trades */}
      {tab === 'open' && (
        <div className="space-y-3">
          {openTrades.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No open trades. Click <span className="text-[var(--brand-primary)] font-semibold">New Trade</span> to start practicing.</p>
            </GlassCard>
          ) : openTrades.map((trade) => {
            const market = INSTRUMENTS.find((i) => i.symbol === trade.instrument);
            const currentPrice = market?.price ?? trade.entryPrice;
            const priceDiff = trade.direction === 'LONG' ? currentPrice - trade.entryPrice : trade.entryPrice - currentPrice;
            const unrealisedPnl = (priceDiff / trade.entryPrice) * trade.margin;
            const unrealisedPct = (priceDiff / trade.entryPrice) * 100;
            return (
              <GlassCard key={trade.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${trade.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                      {trade.direction}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">{trade.instrument}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Entry: <span className="font-mono-num">${fmt(trade.entryPrice)}</span> · Margin: <span className="font-mono-num">${fmt(trade.margin)}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-sm font-extrabold font-mono-num ${unrealisedPnl >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                        {unrealisedPnl >= 0 ? '+' : ''}${fmt(unrealisedPnl)} ({unrealisedPct >= 0 ? '+' : ''}{unrealisedPct.toFixed(2)}%)
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)]">SL: {fmt(trade.stopLoss)} · TP: {fmt(trade.takeProfit)}</p>
                    </div>
                    <button onClick={() => setClosingTrade(trade)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)] transition-all">
                      Close
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Trade History */}
      {tab === 'history' && (
        <div className="space-y-3">
          {closedTrades.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">No closed trades yet.</p>
            </GlassCard>
          ) : closedTrades.map((trade) => (
            <GlassCard key={trade.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${trade.direction === 'LONG' ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
                    {trade.direction}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{trade.instrument}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Entry: <span className="font-mono-num">${fmt(trade.entryPrice)}</span> → Exit: <span className="font-mono-num">${fmt(trade.closePrice ?? 0)}</span>
                    </p>
                  </div>
                </div>
                <div className={`text-right font-extrabold font-mono-num text-sm ${(trade.pnl ?? 0) >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {(trade.pnl ?? 0) >= 0 ? '+' : ''}${fmt(trade.pnl ?? 0)}
                  <span className="text-[11px] ml-1">({(trade.pnlPct ?? 0) >= 0 ? '+' : ''}{(trade.pnlPct ?? 0).toFixed(2)}%)</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {showOpen && <OpenTradeModal onClose={() => setShowOpen(false)} />}
      {closingTrade && <CloseTradeModal trade={closingTrade} onClose={() => setClosingTrade(null)} />}
    </div>
  );
};

export default PaperTradingPage;
