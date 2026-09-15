import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, RotateCcw,
  CheckCircle2, Clock, BarChart2, ShieldCheck,
  Wallet, BookOpen, ArrowRight, X,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { DirectionBadge } from '../../components/ui/Badge';
import { TradingChartPro } from '../../components/charts/TradingChartPro';
import { PaperTradeOrderPanel, PaperTradeDraftLevels } from './PaperTradeOrderPanel';
import { usePaperTradingStore, PaperTrade } from '../../state/usePaperTradingStore';
import { useMarketStore } from '../../state/useMarketStore';
import { CHART_ITEMS } from '../../constants';
import type { Prediction } from '../../types';

const fmt = (n: number, p = 2) =>
  n.toLocaleString(undefined, { minimumFractionDigits: p, maximumFractionDigits: p });

// ── Close Trade Modal ─────────────────────────────────────────────────────────
const CloseTradeModal: React.FC<{ trade: PaperTrade; onClose: () => void }> = ({ trade, onClose }) => {
  const { closeTrade } = usePaperTradingStore();
  const { tickers } = useMarketStore();
  const ticker = tickers.find((t) => t.symbol === trade.instrument);
  const [price, setPrice] = useState(String(ticker?.price ?? trade.entryPrice));

  const closePrice = parseFloat(price) || trade.entryPrice;
  const priceDiff = trade.direction === 'LONG' ? closePrice - trade.entryPrice : trade.entryPrice - closePrice;
  const pnl = (priceDiff / trade.entryPrice) * trade.margin;
  const pnlPct = (priceDiff / trade.entryPrice) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">Close Paper Position</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)]">Asset</p>
            <p className="font-bold text-[var(--text-primary)] mt-0.5">{trade.instrument}</p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)]">Direction</p>
            <p className={`font-bold mt-0.5 ${trade.direction === 'LONG' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {trade.direction}
            </p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)]">Entry Price</p>
            <p className="font-bold font-mono-num text-[var(--text-primary)] mt-0.5">${fmt(trade.entryPrice)}</p>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <p className="text-[var(--text-muted)]">Margin Used</p>
            <p className="font-bold font-mono-num text-[var(--text-primary)] mt-0.5">${fmt(trade.margin)}</p>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Close at Price ($)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </div>

        <div className={`px-4 py-3 rounded-xl text-center font-bold text-sm ${pnl >= 0 ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)]'}`}>
          {pnl >= 0 ? '🎉 Realized Profit' : '📉 Realized Loss'}: {pnl >= 0 ? '+' : ''}${fmt(pnl)} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
        </div>

        <Button
          variant="primary"
          className="w-full justify-center"
          onClick={() => {
            closeTrade(trade.id, closePrice);
            onClose();
          }}
        >
          Confirm Close Position
        </Button>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PaperTradingPage() {
  const { balance, initialBalance, trades, resetAccount } = usePaperTradingStore();
  const { tickers } = useMarketStore();
  const navigate = useNavigate();

  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT');
  const [draftLevels, setDraftLevels] = useState<PaperTradeDraftLevels | null>(null);
  const [closingTrade, setClosingTrade] = useState<PaperTrade | null>(null);
  const [tab, setTab] = useState<'open' | 'history'>('open');

  const currentChartItem = CHART_ITEMS.find((item) => item.symbol === chartSymbol);
  const activeChartInstrument = currentChartItem?.instrument || 'BTC/USDT';

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const closedTrades = trades.filter((t) => t.status === 'CLOSED');
  const totalPnl = closedTrades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = closedTrades.length ? ((wins / closedTrades.length) * 100).toFixed(0) : null;
  const equity = balance + openTrades.reduce((sum, t) => sum + t.margin, 0);

  const handleSelectInstrument = (inst: string) => {
    const item = CHART_ITEMS.find((i) => i.instrument === inst);
    if (item) setChartSymbol(item.symbol);
  };

  // Convert draft levels into prediction overlay for TradingChartPro
  const activePredictionForChart = useMemo(() => {
    if (draftLevels && draftLevels.instrument.toLowerCase() === activeChartInstrument.toLowerCase()) {
      return {
        id: `draft-pt-${activeChartInstrument}`,
        title: `${activeChartInstrument} Paper Setup`,
        instrument: activeChartInstrument,
        category: activeChartInstrument === 'GOLD' || activeChartInstrument === 'SILVER' ? 'COMMODITIES' : 'CRYPTO',
        direction: draftLevels.direction,
        entryPrice: draftLevels.entryPrice,
        buyingZone: draftLevels.buyingZone,
        sellingZone: draftLevels.sellingZone,
        stopLoss: draftLevels.stopLoss || undefined,
        takeProfit: draftLevels.takeProfit || undefined,
        takeProfit2: draftLevels.takeProfit2 || undefined,
        takeProfit3: draftLevels.takeProfit3 || undefined,
        timeframe: draftLevels.timeframe,
        strategy: 'Key Price Zones',
        analysis: '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      } as unknown as Prediction;
    }
    return null;
  }, [draftLevels, activeChartInstrument]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Paper Trading Desk</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold text-[var(--brand-primary)] px-2.5 py-0.5 rounded-full bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Zero-Risk Simulation
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Test strategies, practice risk management, and execute simulated positions in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-2 shadow-sm">
            <Wallet className="w-4 h-4 text-[var(--brand-primary)]" />
            <div className="text-right">
              <span className="text-[10px] text-[var(--text-muted)] block uppercase tracking-wider font-semibold">Virtual Balance</span>
              <span className="text-sm font-bold font-mono-num text-[var(--color-success)]">${fmt(balance)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Reset paper trading balance and clear history back to $10,000?')) {
                resetAccount();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--color-danger)] border border-[var(--border-subtle)] hover:border-[var(--color-danger)] transition-all cursor-pointer"
            title="Reset Paper Balance"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Instrument selector bar */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <div className="flex gap-2">
          {CHART_ITEMS.map((item) => {
            const hasOpenTrade = openTrades.some(
              (t) => t.instrument.toLowerCase() === item.instrument.toLowerCase()
            );
            return (
              <button
                key={item.symbol}
                type="button"
                onClick={() => setChartSymbol(item.symbol)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 ${
                  chartSymbol === item.symbol
                    ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
                {hasOpenTrade && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shadow-[0_0_6px_var(--color-success)]" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] font-medium">Unified Chart & Drawing Suite</span>
        </div>
      </div>

      {/* Chart + Paper Trade Panel — side by side */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-4 items-start">
        {/* Chart */}
        <div className="w-full">
          <TradingChartPro
            tvSymbol={chartSymbol}
            instrument={activeChartInstrument}
            prediction={activePredictionForChart}
            timeframe={draftLevels?.timeframe || '1h'}
            height={620}
            predictionId={activePredictionForChart?.id ?? activeChartInstrument}
          />
        </div>

        {/* Paper Trade Order Panel */}
        <PaperTradeOrderPanel
          currentInstrument={activeChartInstrument}
          onInstrumentChange={handleSelectInstrument}
          onLevelsChange={setDraftLevels}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Virtual Balance" value={`$${fmt(balance)}`} icon={<DollarSign className="w-5 h-5 text-emerald-400" />} />
        <StatCard title="Total Equity" value={`$${fmt(equity)}`} icon={<TrendingUp className="w-5 h-5 text-indigo-400" />} />
        <StatCard title="Open Positions" value={openTrades.length} icon={<Clock className="w-5 h-5 text-amber-400" />} />
        <StatCard
          title="Win Rate"
          value={winRate ? `${winRate}%` : '—'}
          change={totalPnl !== 0 ? `${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)} P&L` : 'From closed trades'}
          icon={<BarChart2 className="w-5 h-5 text-blue-400" />}
        />
      </div>

      {/* Open Positions + History / Rules */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setTab('open')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'open' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Open Positions ({openTrades.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  tab === 'history' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Trade History ({closedTrades.length})
              </button>
            </div>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              Equity: <strong className="text-[var(--text-primary)]">${fmt(equity)}</strong>
            </span>
          </div>

          {/* Open Trades List */}
          {tab === 'open' && (
            <div className="space-y-3">
              {openTrades.length === 0 ? (
                <GlassCard hoverEffect={false} className="py-10 text-center space-y-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No open paper positions</p>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                    Use the order panel above to practice opening a LONG or SHORT trade with zero risk.
                  </p>
                </GlassCard>
              ) : (
                openTrades.map((trade) => {
                  const ticker = tickers.find((t) => t.symbol === trade.instrument);
                  const currentPrice = ticker?.price ?? trade.entryPrice;
                  const priceDiff = trade.direction === 'LONG' ? currentPrice - trade.entryPrice : trade.entryPrice - currentPrice;
                  const unrealisedPnl = (priceDiff / trade.entryPrice) * trade.margin;
                  const unrealisedPct = (priceDiff / trade.entryPrice) * 100;
                  const isProfit = unrealisedPnl >= 0;

                  return (
                    <GlassCard key={trade.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center font-bold text-base flex-shrink-0">
                          {trade.instrument.split('/')[0].slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{trade.instrument}</span>
                            <DirectionBadge direction={trade.direction} />
                            {trade.timeframe && (
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{trade.timeframe}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1 flex-wrap font-mono">
                            <span>Entry: <strong className="text-[var(--text-secondary)]">${fmt(trade.entryPrice)}</strong></span>
                            <span>Margin: <strong className="text-[var(--text-secondary)]">${fmt(trade.margin)}</strong></span>
                            {trade.stopLoss > 0 && <span className="text-orange-400">SL: ${fmt(trade.stopLoss)}</span>}
                            {trade.takeProfit > 0 && <span className="text-emerald-400">TP: ${fmt(trade.takeProfit)}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                        <div className="text-right font-mono">
                          <p className={`text-sm font-bold ${isProfit ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {isProfit ? '+' : ''}${fmt(unrealisedPnl)}
                          </p>
                          <p className={`text-[10px] font-semibold ${isProfit ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                            {unrealisedPct >= 0 ? '+' : ''}{unrealisedPct.toFixed(2)}%
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs cursor-pointer"
                          onClick={() => setClosingTrade(trade)}
                        >
                          Close
                        </Button>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          )}

          {/* Closed Trades List */}
          {tab === 'history' && (
            <div className="space-y-3">
              {closedTrades.length === 0 ? (
                <GlassCard hoverEffect={false} className="py-10 text-center">
                  <p className="text-sm text-[var(--text-muted)]">No closed positions yet.</p>
                </GlassCard>
              ) : (
                closedTrades.map((trade) => {
                  const isProfit = (trade.pnl ?? 0) >= 0;
                  return (
                    <GlassCard key={trade.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center font-bold text-base flex-shrink-0">
                          {trade.instrument.split('/')[0].slice(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[var(--text-primary)]">{trade.instrument}</span>
                            <DirectionBadge direction={trade.direction} />
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">CLOSED</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                            <span>Entry: ${fmt(trade.entryPrice)}</span>
                            <span>→ Exit: ${fmt(trade.closePrice ?? trade.entryPrice)}</span>
                            <span>Margin: ${fmt(trade.margin)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <p className={`text-sm font-bold ${isProfit ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                          {isProfit ? '+' : ''}${fmt(trade.pnl ?? 0)}
                        </p>
                        <p className={`text-[10px] font-semibold ${isProfit ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                          {(trade.pnlPct ?? 0) >= 0 ? '+' : ''}{(trade.pnlPct ?? 0).toFixed(2)}%
                        </p>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Sidebar info / shortcuts */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Discipline & Rules</h2>
          <div className="space-y-3">
            <GlassCard hoverEffect={false} className="p-4 space-y-2 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-primary)]">
                <BookOpen className="w-4 h-4" />
                <span>1% - 5% Risk Principle</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Professional traders never risk more than 1% to 5% of their total balance on any single setup. Keep margin controlled.
              </p>
            </GlassCard>

            <GlassCard hoverEffect={false} className="p-4 space-y-2 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Always Enforce Stop-Loss</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Stop-losses eliminate emotion and preserve capital. Validate your entry before clicking execute.
              </p>
            </GlassCard>

            <Button
              variant="secondary"
              className="w-full justify-between text-xs"
              rightIcon={<ArrowRight className="w-4 h-4" />}
              onClick={() => navigate('/dashboard')}
            >
              Back to Market Feeds
            </Button>
          </div>
        </div>
      </div>

      {closingTrade && <CloseTradeModal trade={closingTrade} onClose={() => setClosingTrade(null)} />}
    </div>
  );
}
