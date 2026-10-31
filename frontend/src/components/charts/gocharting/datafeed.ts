/**
 * GoCharting Datafeed
 *
 * Provides historical + real-time data to the GoCharting SDK:
 *   - Crypto (BTC, ETH, SOL, XRP)  →  Binance REST + WebSocket
 *   - Commodities (GOLD, SILVER)    →  gold-api.com polling
 *
 * The datafeed fulfils the GoCharting `Datafeed` contract:
 *   - resolveSymbol()   – returns SymbolInfo metadata
 *   - getBars()         – returns BarsResult (array of Bar objects)
 *   - subscribeTicks()  – opens a Binance WebSocket and fires the
 *                         chart's RealtimeCallback on every kline tick
 *   - unsubscribeTicks()– closes the WebSocket for that subscription
 *   - destroy()         – tears down all open connections
 */

// Local type definitions — SDK types previously from @gocharting/chart-sdk
// which is now loaded via CDN instead of npm.

export interface SymbolInfo {
  symbol: string;
  full_name: string;
  name?: string;
  description: string;
  exchange: string;
  segment?: string;
  type: string;
  asset_type?: string;
  ticker: string;
  session: string;
  timezone: string;
  has_intraday: boolean;
  has_daily?: boolean;
  supported_resolutions: string[];
  tick_size?: number;
  display_tick_size?: number;
  max_tick_precision?: number;
  quote_currency: string;
  delay_seconds?: number;
  data_status?: string;
  tradeable?: boolean;
  exchange_info?: {
    name: string;
    code: string;
    zone: string;
    hours?: Array<{ open: boolean }>;
    valid_intervals?: string[];
  };
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BarsResult {
  bars: Bar[];
  meta?: { noData?: boolean; nextTime?: number };
}

export interface PeriodParams {
  from: Date | number;
  to: Date | number;
  firstDataRequest?: boolean;
  countBack?: number;
  rows?: number;
}

export interface Datafeed {
  resolveSymbol(symbolName: string, onResolve: (si: SymbolInfo) => void, onError: (err: string) => void): void;
  getBars(symbolInfo: SymbolInfo, resolution: string | any, periodParams: PeriodParams): Promise<BarsResult>;
  subscribeTicks?(symbolInfo: SymbolInfo, resolution: string | any, onRealtimeCallback: (data: any) => void, subscriberUID: string): void;
  unsubscribeTicks?(subscriberUID: string): void;
  destroy?(): void;
}

// ── Instrument maps ────────────────────────────────────────────────────────────

const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
};

/** Map from GoCharting interval type → Binance interval string */
const RESOLUTION_MAP: Record<string, string> = {
  // GoCharting native format (what the SDK passes to getBars/subscribeTicks)
  '1m': '1m', '2m': '1m', '3m': '3m', '5m': '5m',
  '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h',
  '6h': '6h', '12h': '12h',
  '1D': '1d', '1W': '1w', '1M': '1M',
  // Legacy numeric format (TV-compat, kept just in case)
  '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
  '60': '1h', '120': '2h', '240': '4h', '360': '6h', '720': '12h',
};

/** Precision config per instrument */
const PRECISION: Record<string, { prec: number; tickSize: number; quote: string; session: string }> = {
  'BTC/USDT': { prec: 2, tickSize: 0.1, quote: 'USDT', session: '24x7' },
  'ETH/USDT': { prec: 2, tickSize: 0.01, quote: 'USDT', session: '24x7' },
  'SOL/USDT': { prec: 3, tickSize: 0.001, quote: 'USDT', session: '24x7' },
  'XRP/USDT': { prec: 4, tickSize: 0.0001, quote: 'USDT', session: '24x7' },
  'GOLD': { prec: 2, tickSize: 0.01, quote: 'USD', session: '24x7' },
  'SILVER': { prec: 3, tickSize: 0.001, quote: 'USD', session: '24x7' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function toBinanceInterval(resolution: string | { type?: string; baseType?: string; scale?: string | number; units?: string | number }): string {
  if (typeof resolution === 'string') {
    return RESOLUTION_MAP[resolution] ?? '1h';
  }
  // Resolution object — type / baseType are the GoCharting native strings like "1h", "4h", "1D"
  const r = resolution as any;
  if (r.type) return RESOLUTION_MAP[r.type] ?? '1h';
  if (r.baseType) return RESOLUTION_MAP[r.baseType] ?? '1h';
  // Fallback: reconstruct from scale/units
  if (r.scale === 'hours') return `${r.units ?? 1}h`;
  if (r.scale === 'days') return '1d';
  if (r.scale === 'weeks') return '1w';
  if (r.scale === 'minutes') return `${r.units ?? 1}m`;
  return '1h';
}

// ── API proxy base URL ────────────────────────────────────────────────────────
// All Binance calls go through the backend proxy to avoid India geo-blocks
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

async function fetchBinanceBars(binanceSymbol: string, interval: string, fromMs: number, toMs: number): Promise<BarsResult> {
  const limit = 1000;
  const params = new URLSearchParams({
    symbol: binanceSymbol,
    interval,
    startTime: String(fromMs),
    endTime: String(toMs),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE}/api/market/klines?${params.toString()}`);
  if (!res.ok) throw new Error(`Klines proxy ${res.status}`);
  const raw: any[][] = await res.json();
  const bars = raw.map(k => ({
    time: Number(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
  return { bars, meta: bars.length === 0 ? { noData: true } : undefined };
}

async function fetchCommodityBars(instrument: string): Promise<BarsResult> {
  // For commodities we generate synthetic historical bars since there's no
  // free historical REST API. We return 300 hourly candles ending now.
  const cfg = PRECISION[instrument] ?? { prec: 2 };
  const basePrice = instrument === 'GOLD' ? 2684.5 : 31.85;
  const vol = instrument === 'GOLD' ? 0.0035 : 0.0075;
  const now = Date.now();
  let p = basePrice;
  let seed = 0;
  for (let i = 0; i < instrument.length; i++) seed = (seed << 5) - seed + instrument.charCodeAt(i);
  seed = Math.abs(seed) || 5381;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const bars = [];
  const count = 300;
  for (let i = count - 1; i >= 0; i--) {
    const t = now - i * 3600_000;
    const drift = (rand() - 0.49) * vol * p;
    const open = parseFloat(p.toFixed(cfg.prec));
    const close = parseFloat((p - drift).toFixed(cfg.prec));
    const sp = Math.abs(close - open);
    bars.push({
      time: t,
      open,
      high: parseFloat((Math.max(open, close) + rand() * (sp + p * 0.001)).toFixed(cfg.prec)),
      low: parseFloat((Math.min(open, close) - rand() * (sp + p * 0.001)).toFixed(cfg.prec)),
      close,
      volume: 0,
    });
    p = parseFloat(close.toFixed(cfg.prec));
  }
  return { bars };
}

// ── WebSocket subscriptions ────────────────────────────────────────────────────

interface Sub {
  ws: WebSocket;
  binanceSymbol: string;
  interval: string;
  pollTimer?: ReturnType<typeof setInterval>;
}

// ── Datafeed factory ──────────────────────────────────────────────────────────

export function createSnyprDatafeed(): Datafeed {
  const subs = new Map<string, Sub>();

  function resolveSymbol(
    symbolName: string,
    onResolve: (si: SymbolInfo) => void,
    onError: (err: string) => void,
  ) {
    // symbolName arrives as the `instrument` string from our CHART_ITEMS
    const cfg = PRECISION[symbolName];
    if (!cfg) {
      onError(`Unknown instrument: ${symbolName}`);
      return;
    }

    const isForex = symbolName === 'GOLD' || symbolName === 'SILVER';
    const exchange = isForex ? 'OANDA' : 'BINANCE';
    const segment = isForex ? 'FOREX' : 'SPOT';

    const si: SymbolInfo = {
      symbol: symbolName,
      full_name: `${exchange}:${segment}:${symbolName}`,
      name: symbolName,
      description: symbolName,
      exchange,
      segment,
      type: isForex ? 'forex' : 'crypto',
      asset_type: isForex ? 'COMMODITY' : 'CRYPTO',
      ticker: symbolName,
      session: cfg.session,
      timezone: 'Etc/UTC',
      has_intraday: true,
      has_daily: true,
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
      tick_size: cfg.tickSize,
      display_tick_size: cfg.tickSize,
      max_tick_precision: cfg.prec,
      quote_currency: cfg.quote,
      delay_seconds: 0,
      data_status: 'streaming',
      tradeable: false,
      exchange_info: {
        name: exchange.toLowerCase(),
        code: exchange,
        zone: 'Etc/UTC',
        hours: Array.from({ length: 7 }, () => ({ open: true })),
        valid_intervals: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
      },
    };

    // resolveSymbol must call onResolve async (per GoCharting docs)
    setTimeout(() => onResolve(si), 0);
  }

  async function getBars(
    symbolInfo: SymbolInfo,
    resolution: string | any,
    periodParams: PeriodParams,
  ): Promise<BarsResult> {
    const instrument = symbolInfo.symbol;
    const binanceSym = INSTRUMENT_TO_BINANCE[instrument];
    const interval = toBinanceInterval(resolution);
    const fromMs = periodParams.from instanceof Date
      ? periodParams.from.getTime()
      : Number(periodParams.from) > 1e12
        ? Number(periodParams.from)
        : Number(periodParams.from) * 1000;
    const toMs = periodParams.to instanceof Date
      ? periodParams.to.getTime()
      : Number(periodParams.to) > 1e12
        ? Number(periodParams.to)
        : Number(periodParams.to) * 1000;

    if (binanceSym) {
      try {
        return await fetchBinanceBars(binanceSym, interval, fromMs, toMs);
      } catch {
        // fallthrough
      }
    }
    return fetchCommodityBars(instrument);
  }

  function subscribeTicks(
    symbolInfo: SymbolInfo,
    resolution: string | any,
    onRealtimeCallback: (data: any) => void,
    subscriberUID: string,
  ) {
    const instrument = symbolInfo.symbol;
    const binanceSym = INSTRUMENT_TO_BINANCE[instrument];
    const interval = toBinanceInterval(resolution);

    if (binanceSym) {
      const wsUrl = `wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_${interval}`;
      let ws: WebSocket;
      let lastMsgTime = 0;
      let pollTimer: ReturnType<typeof setInterval> | undefined;

      const startPoll = () => {
        if (pollTimer) return;
        pollTimer = setInterval(async () => {
          if (Date.now() - lastMsgTime < 8000) return; // WS is live
          try {
            const params = new URLSearchParams({ symbol: binanceSym, interval, limit: '1' });
            const res = await fetch(`${API_BASE}/api/market/klines?${params.toString()}`);
            if (!res.ok) return;
            const raw: any[][] = await res.json();
            if (!raw.length) return;
            const k = raw[0];
            onRealtimeCallback({
              time: Number(k[0]),
              open: parseFloat(k[1]),
              high: parseFloat(k[2]),
              low: parseFloat(k[3]),
              close: parseFloat(k[4]),
              volume: parseFloat(k[5]),
            });
          } catch { }
        }, 5000);
      };

      try {
        ws = new WebSocket(wsUrl);
        ws.onopen = () => startPoll();
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.e !== 'kline' || !msg.k) return;
            lastMsgTime = Date.now();
            // Stop the poll timer since WS is live
            if (pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
            onRealtimeCallback({
              time: Number(msg.k.t),
              open: parseFloat(msg.k.o),
              high: parseFloat(msg.k.h),
              low: parseFloat(msg.k.l),
              close: parseFloat(msg.k.c),
              volume: parseFloat(msg.k.v),
            });
          } catch { }
        };
        ws.onerror = () => startPoll();
        subs.set(subscriberUID, { ws, binanceSymbol: binanceSym, interval, pollTimer });
      } catch {
        startPoll();
        // Create a placeholder so unsubscribe has something to clean up
        subs.set(subscriberUID, { ws: null as any, binanceSymbol: binanceSym, interval, pollTimer });
      }
    } else {
      // Commodity: poll gold-api.com every 15 seconds
      const pollTimer = setInterval(async () => {
        try {
          const sym = instrument === 'GOLD' ? 'XAU' : 'XAG';
          const res = await fetch(`https://api.gold-api.com/price/${sym}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.price) {
            onRealtimeCallback({
              time: Date.now(),
              open: data.price,
              high: data.price,
              low: data.price,
              close: data.price,
              volume: 0,
            });
          }
        } catch { }
      }, 15000);
      subs.set(subscriberUID, { ws: null as any, binanceSymbol: '', interval, pollTimer });
    }
  }

  function unsubscribeTicks(subscriberUID: string) {
    const sub = subs.get(subscriberUID);
    if (!sub) return;
    if (sub.pollTimer) clearInterval(sub.pollTimer);
    if (sub.ws) try { sub.ws.close(); } catch { }
    subs.delete(subscriberUID);
  }

  function destroy() {
    for (const [uid] of subs) unsubscribeTicks(uid);
  }

  return { resolveSymbol, getBars, subscribeTicks, unsubscribeTicks, destroy };
}
