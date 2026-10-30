/**
 * calendarService.ts
 *
 * Fetches the upcoming economic calendar from ForexFactory's public JSON feed.
 * No API key or authentication required.
 *
 * Source: nfs.faireconomy.media/ff_calendar_thisweek.json
 * Updates weekly. Events include CPI, Fed decisions, NFP, GDP, PMI etc.
 *
 * We filter and surface events most relevant to crypto/forex traders:
 *   USD, EUR, GBP, JPY, AUD, CNY (currencies whose macro news moves BTC/ETH)
 */

export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'Holiday';

export interface CalendarEvent {
  id:          string;
  title:       string;
  currency:    string;          // ISO currency code e.g. 'USD', 'EUR'
  datetime:    Date;            // UTC Date object
  impact:      ImpactLevel;
  forecast:    string | null;   // e.g. '0.3%', null if not available
  previous:    string | null;   // e.g. '0.2%'
  isUpcoming:  boolean;         // true = hasn't happened yet
  minutesAway: number | null;   // null if in the past; minutes until event
}

// ── Currencies whose macro events directly affect crypto ───────────────────────
const RELEVANT_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CNY', 'CHF', 'CAD',
]);

// ── Keywords that make an event high-market-impact for crypto traders ──────────
export const HIGH_IMPACT_KEYWORDS = [
  'cpi', 'pce', 'inflation', 'interest rate', 'rate decision', 'rate statement',
  'fomc', 'federal reserve', 'fed chair', 'powell',
  'ecb', 'lagarde', 'boe', 'rba', 'boj',
  'nfp', 'non-farm', 'employment', 'unemployment',
  'gdp', 'pmi', 'ism', 'retail sales',
  'jobless claims', 'trade balance',
];

// ── Cache ──────────────────────────────────────────────────────────────────────
let cache: { events: CalendarEvent[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (calendar rarely changes mid-day)

const FF_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=eb5f46f2c7f42d78e90eda5ab41bc2ed';

interface RawEvent {
  title:    string;
  country:  string;
  date:     string;   // ISO 8601 with timezone offset
  impact:   string;
  forecast: string;
  previous: string;
}

function normaliseImpact(raw: string): ImpactLevel {
  switch (raw.trim().toLowerCase()) {
    case 'high':    return 'High';
    case 'medium':  return 'Medium';
    case 'low':     return 'Low';
    default:        return 'Holiday';
  }
}

function isCryptoRelevant(event: RawEvent): boolean {
  if (!RELEVANT_CURRENCIES.has(event.country)) return false;
  if (event.impact === 'Holiday') return false;
  // Always include High impact; for Medium/Low only include keyword matches
  if (event.impact === 'High') return true;
  const lower = event.title.toLowerCase();
  return HIGH_IMPACT_KEYWORDS.some((kw) => lower.includes(kw));
}

function toCalendarEvent(raw: RawEvent, idx: number): CalendarEvent {
  const datetime  = new Date(raw.date);
  const now       = Date.now();
  const diffMs    = datetime.getTime() - now;
  const isUpcoming = diffMs > 0;

  return {
    id:          `ff-${idx}-${raw.date}`,
    title:       raw.title,
    currency:    raw.country,
    datetime,
    impact:      normaliseImpact(raw.impact),
    forecast:    raw.forecast || null,
    previous:    raw.previous || null,
    isUpcoming,
    minutesAway: isUpcoming ? Math.floor(diffMs / 60_000) : null,
  };
}

export async function fetchCalendarEvents(options?: {
  upcomingOnly?: boolean;
  highImpactOnly?: boolean;
  limit?: number;
}): Promise<CalendarEvent[]> {
  const {
    upcomingOnly   = false,
    highImpactOnly = false,
    limit          = 50,
  } = options ?? {};

  // Return cache if fresh
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return applyFilters(cache.events, upcomingOnly, highImpactOnly, limit);
  }

  try {
    const res = await fetch(FF_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw: RawEvent[] = await res.json();

    const events = raw
      .filter(isCryptoRelevant)
      .map(toCalendarEvent)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

    cache = { events, fetchedAt: Date.now() };
    return applyFilters(events, upcomingOnly, highImpactOnly, limit);
  } catch (err) {
    console.warn('[calendarService] fetch failed:', err);
    return cache ? applyFilters(cache.events, upcomingOnly, highImpactOnly, limit) : [];
  }
}

function applyFilters(
  events: CalendarEvent[],
  upcomingOnly: boolean,
  highImpactOnly: boolean,
  limit: number,
): CalendarEvent[] {
  return events
    .filter((e) => !upcomingOnly    || e.isUpcoming)
    .filter((e) => !highImpactOnly  || e.impact === 'High')
    .slice(0, limit);
}

/** Invalidate cache (e.g. on manual refresh) */
export function clearCalendarCache() {
  cache = null;
}
