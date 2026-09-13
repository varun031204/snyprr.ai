import React, { useState } from 'react';
import { TrendingUp, ArrowUpRight, Award, ShieldCheck, Download, Calendar } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const CUMULATIVE_PERFORMANCE = [
  { date: 'Week 1', returnPct: 4.2, rMultiple: 1.4 },
  { date: 'Week 2', returnPct: 9.8, rMultiple: 3.1 },
  { date: 'Week 3', returnPct: 8.1, rMultiple: 2.7 },
  { date: 'Week 4', returnPct: 15.4, rMultiple: 5.2 },
  { date: 'Week 5', returnPct: 21.0, rMultiple: 7.0 },
  { date: 'Week 6', returnPct: 27.6, rMultiple: 9.3 },
  { date: 'Week 7', returnPct: 25.2, rMultiple: 8.4 },
  { date: 'Week 8', returnPct: 34.8, rMultiple: 11.6 },
  { date: 'Week 9', returnPct: 41.5, rMultiple: 13.9 },
  { date: 'Week 10', returnPct: 48.2, rMultiple: 16.2 },
  { date: 'Week 11', returnPct: 54.0, rMultiple: 18.0 },
  { date: 'Week 12', returnPct: 62.4, rMultiple: 20.8 },
];

const HISTORICAL_MONTHS = [
  { month: 'September 2026', predictions: 32, winRate: '81.2%', rReturn: '+12.4R', gain: '+18.6%' },
  { month: 'August 2026', predictions: 45, winRate: '77.8%', rReturn: '+16.2R', gain: '+22.1%' },
  { month: 'July 2026', predictions: 38, winRate: '76.3%', rReturn: '+11.8R', gain: '+14.5%' },
  { month: 'June 2026', predictions: 29, winRate: '82.8%', rReturn: '+14.0R', gain: '+17.2%' },
];

export default function PerformancePage() {
  const [metricType, setMetricType] = useState<'return' | 'rMultiple'>('return');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Performance Track Record</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Auditable, level-derived prediction return curve and historical statistical breakdown.
          </p>
        </div>

        <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
          Export Audit Report
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Cumulative Theoretical Gain"
          value="+62.4%"
          change="Last 12 weeks"
          isPositive
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          title="Total R-Multiple Return"
          value="+20.8 R"
          change="Standardized risk units"
          isPositive
          icon={<Award className="w-5 h-5" />}
        />
        <StatCard
          title="Profit Factor"
          value="3.42"
          change="Gross gain / Gross loss"
          isPositive
          icon={<ShieldCheck className="w-5 h-5" />}
        />
        <StatCard
          title="Max Drawdown"
          value="-4.6%"
          change="2 consecutive stops hit"
          icon={<ArrowUpRight className="w-5 h-5" />}
        />
      </div>

      {/* Main Cumulative Growth Curve */}
      <GlassCard hoverEffect={false} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cumulative Return Curve</h3>
            <p className="text-xs text-[var(--text-muted)]">Modeled from declared target hits vs stop outs</p>
          </div>

          <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setMetricType('return')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricType === 'return'
                  ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Percentage Gain (%)
            </button>
            <button
              onClick={() => setMetricType('rMultiple')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                metricType === 'rMultiple'
                  ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              R-Multiple Return (R)
            </button>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={CUMULATIVE_PERFORMANCE}>
              <defs>
                <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#b17cfe" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#b17cfe" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface-glass)',
                  borderColor: 'var(--border-glass)',
                  borderRadius: '0.75rem',
                  color: 'var(--text-primary)',
                }}
              />
              <Area
                type="monotone"
                dataKey={metricType === 'return' ? 'returnPct' : 'rMultiple'}
                stroke="#b17cfe"
                fillOpacity={1}
                fill="url(#perfGrad)"
                name={metricType === 'return' ? 'Return %' : 'R-Multiple'}
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Monthly Performance Table */}
      <GlassCard hoverEffect={false} className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
          Monthly Track Record Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3">Resolved Predictions</th>
                <th className="py-2.5 px-3">Win Rate</th>
                <th className="py-2.5 px-3">R-Multiple</th>
                <th className="py-2.5 px-3 text-right">Net Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {HISTORICAL_MONTHS.map((m) => (
                <tr key={m.month} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    {m.month}
                  </td>
                  <td className="py-3 px-3 font-mono-num text-[var(--text-secondary)]">{m.predictions} ideas</td>
                  <td className="py-3 px-3 font-mono-num font-bold text-[var(--color-success)]">{m.winRate}</td>
                  <td className="py-3 px-3 font-mono-num font-bold text-[var(--brand-primary)]">{m.rReturn}</td>
                  <td className="py-3 px-3 font-mono-num font-extrabold text-[var(--color-success)] text-right">
                    {m.gain}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
