import React, { useState } from 'react';
import { BarChart2, TrendingUp, Target, Clock, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatCard } from '../../components/ui/StatCard';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const ACCURACY_BY_CATEGORY = [
  { category: 'Crypto', winRate: 79.2, count: 142, color: '#b17cfe' },
  { category: 'Forex', winRate: 82.4, count: 88, color: '#41d49a' },
  { category: 'Stocks', winRate: 74.1, count: 65, color: '#60a5fa' },
  { category: 'Indices', winRate: 70.0, count: 30, color: '#fbbf24' },
];

const RR_DISTRIBUTION = [
  { range: '1.0 - 1.5', count: 14 },
  { range: '1.5 - 2.0', count: 48 },
  { range: '2.0 - 3.0', count: 112 },
  { range: '3.0 - 4.0', count: 84 },
  { range: '4.0+', count: 32 },
];

const MONTHLY_PROGRESSION = [
  { month: 'Apr', targetsHit: 22, stopsHit: 6, accuracy: 78.5 },
  { month: 'May', targetsHit: 28, stopsHit: 7, accuracy: 80.0 },
  { month: 'Jun', targetsHit: 34, stopsHit: 9, accuracy: 79.0 },
  { month: 'Jul', targetsHit: 41, stopsHit: 10, accuracy: 80.3 },
  { month: 'Aug', targetsHit: 46, stopsHit: 12, accuracy: 79.3 },
  { month: 'Sep', targetsHit: 52, stopsHit: 11, accuracy: 82.5 },
];

const DIRECTION_DATA = [
  { name: 'Long Ideas', value: 186, color: '#41d49a', winRate: 80.6 },
  { name: 'Short Ideas', value: 104, color: '#ff5f78', winRate: 74.0 },
];

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | 'all'>('90d');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prediction Analytics</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Quantitative analysis of verified prediction performance, accuracy, and risk-to-reward ratios.
          </p>
        </div>

        <div className="flex gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          {(['30d', '90d', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeframe === t
                  ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t === '30d' ? 'Last 30 Days' : t === '90d' ? 'Last 90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Target Hit Rate"
          value="78.2%"
          change="+2.4% vs prior period"
          isPositive
          icon={<Target className="w-5 h-5" />}
        />
        <StatCard
          title="Average Declared R:R"
          value="1:2.94"
          change="Healthy risk-adjusted ratio"
          isPositive
          icon={<BarChart2 className="w-5 h-5" />}
        />
        <StatCard
          title="Avg Time to Target"
          value="18.4 hrs"
          change="Median 4H-1D swing"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          title="Total Resolved Forecasts"
          value="290"
          change="227 targets reached"
          isPositive
          icon={<Award className="w-5 h-5" />}
        />
      </div>

      {/* Main Charts: Accuracy Trend + Category Breakdown */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Monthly Target Hit Progression Area Chart (2/3) */}
        <GlassCard hoverEffect={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Monthly Forecast Progression</h3>
              <p className="text-xs text-[var(--text-muted)]">Cumulative targets hit vs stop-losses hit</p>
            </div>
            <span className="text-xs font-mono-num font-bold text-[var(--color-success)] bg-[var(--color-success-bg)] px-2.5 py-1 rounded-lg">
              82.5% Sep Accuracy
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PROGRESSION}>
                <defs>
                  <linearGradient id="targetsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#41d49a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#41d49a" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="stopsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5f78" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ff5f78" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-glass)',
                    borderColor: 'var(--border-glass)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
                <Area type="monotone" dataKey="targetsHit" stroke="#41d49a" fillOpacity={1} fill="url(#targetsGrad)" name="Targets Hit" strokeWidth={2} />
                <Area type="monotone" dataKey="stopsHit" stroke="#ff5f78" fillOpacity={1} fill="url(#stopsGrad)" name="Stops Hit" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Long vs Short Direction Accuracy (1/3) */}
        <GlassCard hoverEffect={false} className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Direction Distribution
          </h3>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DIRECTION_DATA}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                >
                  {DIRECTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-glass)',
                    borderColor: 'var(--border-glass)',
                    borderRadius: '0.75rem',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)] text-xs">
            {DIRECTION_DATA.map((d) => (
              <div key={d.name} className="flex justify-between items-center">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name} ({d.value} ideas)
                </span>
                <span className="font-bold font-mono-num text-[var(--color-success)]">{d.winRate}% Win</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Second Row: Accuracy by Asset Category + Risk/Reward Histogram */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category Accuracy */}
        <GlassCard hoverEffect={false} className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Accuracy by Asset Category
          </h3>

          <div className="space-y-4 pt-1">
            {ACCURACY_BY_CATEGORY.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[var(--text-secondary)]">
                    {cat.category} ({cat.count} resolved predictions)
                  </span>
                  <span className="font-bold font-mono-num text-[var(--color-success)]">{cat.winRate}%</span>
                </div>
                <div className="w-full bg-[var(--bg-secondary)] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.winRate}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Risk-Reward Histogram */}
        <GlassCard hoverEffect={false} className="space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2">
            Declared Risk / Reward Ratio Distribution
          </h3>

          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={RR_DISTRIBUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={11} />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-glass)',
                    borderColor: 'var(--border-glass)',
                    borderRadius: '0.75rem',
                  }}
                />
                <Bar dataKey="count" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} name="Forecasts" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
