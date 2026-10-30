/**
 * EconomicCalendar
 *
 * Displays upcoming economic events that can move the market.
 * Data from ForexFactory via nfs.faireconomy.media (no API key).
 *
 * Sizes:
 *  - compact: dashboard widget (upcoming High-impact only, 5 events max)
 *  - full:    news page tab (all relevant events, this week)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw, CalendarDays, TrendingUp, Info, ExternalLink } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { Skeleton } from '../ui/Skeleton';
import {
  fetchCalendarEvents,
  clearCalendarCache,
  type CalendarEvent,
  type ImpactLevel,
} from '../../services/api/calendarService';

// ── Impact config ─────────────────────────────────────────────────────────────

const IMPACT: Record<ImpactLevel, { dot: string; badge: string; text: string; label: string }> = {
  High:    { dot: 'bg-[var(--color-danger)]',  badge: 'bg-[var(--color-danger-bg)]   text-[var(--color-danger)]   border-[var(--color-danger)]/30',   text: 'text-[var(--color-danger)]',  label: 'HIGH' },
  Medium:  { dot: 'bg-[var(--color-warning)]', badge: 'bg-[var(--color-warning-bg)]  text-[var(--color-warning)]  border-[var(--color-warning)]/30',  text: 'text-[var(--color-warning)]', label: 'MED' },
  Low:     { dot: 'bg-[var(--text-muted)]',    badge: 'bg-[var(--bg-secondary)]      text-[var(--text-muted)]     border-[var(--border-subtle)]',     text: 'text-[var(--text-muted)]',    label: 'LOW' },
  Holiday: { dot: 'bg-[var(--color-info)]',    badge: 'bg-[var(--color-info-bg)]     text-[var(--color-info)]     border-[var(--color-info)]/30',     text: 'text-[var(--color-info)]',    label: 'HOLIDAY' },
};

// ── Currency flag emoji map ────────────────────────────────────────────────────

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵',
  AUD: '🇦🇺', CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳',
  NZD: '🇳🇿',
};

// ── Market impact explanation ─────────────────────────────────────────────────

const CRYPTO_IMPACT: Record<string, string> = {
  USD: 'USD strength / DXY movement directly affects BTC and ETH valuations',
  EUR: 'EUR/USD shifts alter global risk appetite and can move crypto markets',
  GBP: 'GBP data affects cross-asset risk sentiment',
  JPY: 'JPY carry trades unwind during volatility — can trigger crypto sell-offs',
  AUD: 'AUD is a risk-on proxy; weak AUD data often correlates with crypto dips',
  CAD: 'CAD crude-linked; energy macro spills into commodity and crypto markets',
  CHF: 'CHF safe-haven flows signal global risk-off; bearish for crypto',
  CNY: 'CNY data reflects China economy — major influence on BTC mining/adoption',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(d: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeUntil(minutes: number): string {
  if (minutes < 60) return `in ${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `in ${h}h ${m}m` : `in ${h}h`;
}

// ── Single event row ──────────────────────────────────────────────────────────

function EventRow({ event, compact }: { event: CalendarEvent; compact: boolean }) {
  const [showInfo, setShowInfo] = useState(false);
  const cfg = IMPACT[event.impact];
  const flag = FLAG[event.currency] ?? '🌐';
  const isNow = event.minutesAway !== null && event.minutesAway <= 30;

  return (
    <div
      className={`relative flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all
        ${!event.isUpcoming ? 'opacity-50' : ''}
        ${isNow ? 'bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20' : 'hover:bg-[var(--bg-secondary)]'}`}
    >
      {/* Impact dot */}
      <div className="mt-1 flex-shrink-0">
        <span className={`block w-2.5 h-2.5 rounded-full ${cfg.dot} ${event.impact === 'High' && event.isUpcoming ? 'animate-pulse' : ''}`} />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-snug ${event.isUpcoming ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
            {event.title}
          </p>
          {/* Info toggle (full mode only) */}
          {!compact && CRYPTO_IMPACT[event.currency] && (
            <button
              onClick={() => setShowInfo((s) => !s)}
              className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors flex-shrink-0"
              title="How this affects crypto"
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Currency + time + countdown */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px]">{flag}</span>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
            {event.currency}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">·</span>
          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatDate(event.datetime)} {formatTime(event.datetime)}
          </span>
          {event.isUpcoming && event.minutesAway !== null && (
            <>
              <span className="text-[10px] text-[var(--text-muted)]">·</span>
              <span className={`text-[10px] font-semibold ${isNow ? 'text-[var(--color-danger)] animate-pulse' : 'text-[var(--brand-primary)]'}`}>
                {timeUntil(event.minutesAway)}
              </span>
            </>
          )}
        </div>

        {/* Forecast / Previous */}
        {(event.forecast || event.previous) && (
          <div className="flex items-center gap-3 mt-0.5">
            {event.forecast && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Forecast: <strong className="text-[var(--text-secondary)]">{event.forecast}</strong>
              </span>
            )}
            {event.previous && (
              <span className="text-[10px] text-[var(--text-muted)]">
                Prev: <strong className="text-[var(--text-secondary)]">{event.previous}</strong>
              </span>
            )}
          </div>
        )}

        {/* Crypto impact explanation */}
        {showInfo && CRYPTO_IMPACT[event.currency] && (
          <div className="mt-1.5 p-2 rounded-lg bg-[var(--brand-glow)]/20 border border-[var(--brand-primary)]/20 text-[10px] text-[var(--text-secondary)] leading-relaxed">
            💡 <strong className="text-[var(--brand-primary)]">Crypto relevance:</strong>{' '}
            {CRYPTO_IMPACT[event.currency]}
          </div>
        )}
      </div>

      {/* Impact badge */}
      <span className={`flex-shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${cfg.badge}`}>
        {cfg.label}
      </span>
    </div>
  );
}

// ── Compact widget (Dashboard) ────────────────────────────────────────────────

export function EconomicCalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendarEvents({ upcomingOnly: true, highImpactOnly: true, limit: 5 })
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-xl" />)}
      </div>
    );
  }

  if (events.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-[var(--color-danger)]" />
          High-Impact Events
        </p>
        <a href="/calendar" className="text-[9px] font-semibold text-[var(--brand-primary)] hover:underline">
          Full calendar →
        </a>
      </div>
      {events.map((e) => (
        <EventRow key={e.id} event={e} compact={true} />
      ))}
    </div>
  );
}

// ── Full calendar (News page tab) ─────────────────────────────────────────────

type FilterImpact = 'All' | 'High' | 'Medium';

export function EconomicCalendarFull() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [impactFilter, setImpactFilter] = useState<FilterImpact>('All');
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    if (force) clearCalendarCache();
    try {
      const all = await fetchCalendarEvents({ limit: 100 });
      setEvents(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = events.filter((e) => {
    if (showUpcomingOnly && !e.isUpcoming) return false;
    if (impactFilter === 'High'   && e.impact !== 'High')   return false;
    if (impactFilter === 'Medium' && !['High', 'Medium'].includes(e.impact)) return false;
    return true;
  });

  // Group by day
  const grouped = filtered.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
    const key = ev.datetime.toDateString();
    (acc[key] ??= []).push(ev);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Impact filter */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            {(['All', 'High', 'Medium'] as FilterImpact[]).map((f) => (
              <button
                key={f}
                onClick={() => setImpactFilter(f)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                  impactFilter === f
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f === 'High' ? '🔴 High' : f === 'Medium' ? '🟡 Medium' : '⚪ All'}
              </button>
            ))}
          </div>
          {/* Upcoming only toggle */}
          <button
            onClick={() => setShowUpcomingOnly((s) => !s)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold border transition-all ${
              showUpcomingOnly
                ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)]'
                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)]'
            }`}
          >
            {showUpcomingOnly ? '⏳ Upcoming only' : '📅 All this week'}
          </button>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-danger)] inline-block" /> High impact — major market mover</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--color-warning)] inline-block" /> Medium impact — watch closely</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--text-muted)] inline-block" /> Low impact — informational</span>
        <span className="ml-auto">Tap <Info className="w-3 h-3 inline" /> to see crypto relevance</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2">
          {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--text-muted)]">
          No events match your filters this week.
        </div>
      )}

      {/* Grouped by day */}
      {!loading && Object.entries(grouped).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="space-y-1">
          {/* Day header */}
          <div className="flex items-center gap-2 py-1">
            <CalendarDays className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span className="text-xs font-bold text-[var(--text-primary)]">
              {formatDate(new Date(dateKey))}
            </span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-[10px] text-[var(--text-muted)]">{dayEvents.length} events</span>
          </div>
          <GlassCard hoverEffect={false} className="p-1 space-y-0.5 divide-y divide-[var(--border-subtle)]/40">
            {dayEvents.map((e) => (
              <EventRow key={e.id} event={e} compact={false} />
            ))}
          </GlassCard>
        </div>
      ))}

      {/* Attribution */}
      {!loading && filtered.length > 0 && (
        <p className="text-[10px] text-[var(--text-muted)] text-center pt-2 flex items-center justify-center gap-1">
          Data from{' '}
          <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer"
            className="text-[var(--brand-primary)] hover:underline flex items-center gap-0.5">
            ForexFactory <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {' '}· Events in your local timezone · Not financial advice
        </p>
      )}
    </div>
  );
}
