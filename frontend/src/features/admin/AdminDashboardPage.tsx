import React, { useState } from 'react';
import { Users, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { GlassCard } from '../../components/ui/GlassCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/Badge';
import { usePredictions } from '../../hooks/usePredictionsQuery';
import { useAdminStats, useAdminAuditLogs } from '../../hooks/useAdminQuery';
import { AdvancedRealTimeChart } from 'react-ts-tradingview-widgets';

export default function AdminDashboardPage() {
  const [chartSymbol, setChartSymbol] = useState('BINANCE:BTCUSDT');
  const { data, isLoading } = usePredictions({ page: 1, pageSize: 5 });
  const predictions = data?.data || [];
  const { data: statsData } = useAdminStats();
  const { data: auditData, isLoading: auditLoading } = useAdminAuditLogs();
  const auditLogs = auditData?.data || [];

  const stats = statsData?.data;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Platform health, user activity, and content moderation overview.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.total_users ?? 0} icon={<Users className="w-5 h-5" />} />
        <StatCard title="Active Traders" value={stats?.registered_traders ?? 0} icon={<ShieldCheck className="w-5 h-5" />} />
        <StatCard title="Published Signals" value={stats?.active_published_signals ?? 0} icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard title="Active Subscriptions" value={stats?.active_subscriptions ?? 0} icon={<AlertCircle className="w-5 h-5" />} />
      </div>

      {/* TradingView Chart */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { label: 'BTC/USDT', symbol: 'BINANCE:BTCUSDT' },
            { label: 'ETH/USDT', symbol: 'BINANCE:ETHUSDT' },
            { label: 'SOL/USDT', symbol: 'BINANCE:SOLUSDT' },
            { label: 'XRP/USDT', symbol: 'BINANCE:XRPUSDT' },
            { label: 'GOLD', symbol: 'OANDA:XAUUSD' },
            { label: 'SILVER', symbol: 'OANDA:XAGUSD' },
          ].map((item) => (
            <button
              key={item.symbol}
              onClick={() => setChartSymbol(item.symbol)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 ${
                chartSymbol === item.symbol
                  ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="w-full h-[460px] rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <AdvancedRealTimeChart
            theme="dark"
            symbol={chartSymbol}
            width="100%"
            height="100%"
            allow_symbol_change={true}
            hide_top_toolbar={false}
            hide_legend={false}
            save_image={false}
            show_popup_button={false}
            withdateranges={false}
            details={false}
            hotlist={false}
            calendar={false}
          />
        </div>
      </div>

      {/* Grid: Recent Predictions + Audit Logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Predictions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Predictions</h2>
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
            : predictions.length === 0
            ? (
              <GlassCard hoverEffect={false}>
                <p className="text-sm text-[var(--text-muted)] text-center py-2">No predictions yet.</p>
              </GlassCard>
            )
            : predictions.map((p) => (
              <GlassCard key={p.id} className="flex items-center gap-3" hoverEffect={false}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)]">{p.instrument} · {p.trader.displayName}</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.title}</p>
                </div>
                <StatusBadge status={p.status} />
              </GlassCard>
            ))}
        </div>

        {/* Audit Logs */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Recent Audit Activity</h2>
          {auditLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)
            : auditLogs.length === 0
            ? (
              <GlassCard hoverEffect={false}>
                <p className="text-sm text-[var(--text-muted)] text-center py-2">No audit logs yet.</p>
              </GlassCard>
            )
            : auditLogs.map((log) => (
              <GlassCard key={log.id} className="flex flex-col gap-1" hoverEffect={false}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--brand-primary)] truncate">{log.action}</span>
                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] truncate">{log.actorName} · {log.details}</p>
              </GlassCard>
            ))}
        </div>
      </div>
    </div>
  );
}
