import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, TrendingUp, Filter } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';

interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  actual?: string;
  forecast: string;
  previous: string;
}

const EVENTS: EconomicEvent[] = [
  { id: '1', time: '12:30 UTC', currency: 'USD', event: 'Core CPI (MoM)', impact: 'HIGH', forecast: '0.3%', previous: '0.3%' },
  { id: '2', time: '14:00 UTC', currency: 'USD', event: 'Fed Interest Rate Decision', impact: 'HIGH', forecast: '4.75%', previous: '5.00%' },
  { id: '3', time: '15:30 UTC', currency: 'EUR', event: 'ECB Monetary Policy Statement', impact: 'HIGH', forecast: '3.25%', previous: '3.50%' },
  { id: '4', time: '18:00 UTC', currency: 'BTC', event: 'CME Bitcoin Futures Expiration', impact: 'MEDIUM', forecast: '—', previous: '—' },
  { id: '5', time: '20:30 UTC', currency: 'USD', event: 'Initial Jobless Claims', impact: 'LOW', forecast: '225K', previous: '228K' },
];

export default function CalendarPage() {
  const [filterImpact, setFilterImpact] = useState<string>('ALL');

  const filtered = EVENTS.filter((e) => {
    if (filterImpact === 'ALL') return true;
    return e.impact === filterImpact;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Economic & Forecast Calendar</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          High-impact macroeconomic releases and volatility events influencing prediction setups.
        </p>
      </div>

      {/* Filter bar */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)]">Impact:</span>
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterImpact(lvl)}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
                  filterImpact === lvl
                    ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> UTC Time
          </span>
        </div>
      </GlassCard>

      {/* Events Table / Card list */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <GlassCard key={item.id} className="flex items-center justify-between p-4" hoverEffect={false}>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono-num font-semibold text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2.5 py-1 rounded-lg">
                {item.time}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[var(--brand-glow)] text-[var(--brand-primary)]">
                {item.currency}
              </span>
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.event}</h4>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-4 text-xs font-mono-num">
                <span className="text-[var(--text-muted)]">Forecast: <strong className="text-[var(--text-primary)]">{item.forecast}</strong></span>
                <span className="text-[var(--text-muted)]">Prior: <strong className="text-[var(--text-primary)]">{item.previous}</strong></span>
              </div>

              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                  item.impact === 'HIGH'
                    ? 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30'
                    : item.impact === 'MEDIUM'
                    ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}
              >
                {item.impact}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
