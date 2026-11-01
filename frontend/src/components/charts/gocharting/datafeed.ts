/**
 * GoCharting Datafeed
 *
 * Provides historical + real-time data to the GoCharting SDK.
 * All Binance calls are routed through the backend proxy (/api/market/*)
 * to avoid India geo-blocks on api.binance.com.
 */

// ── Local types (replaces @gocharting/chart-sdk imports) ─────────────────────

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

// ── Config ────────────────────────────────────────────────────────────────────

const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
};

const RESOLUTION_MAP: Record<string, string> = {
  // Sub-minute (GoCharting supports these; we map to 1m kline from Binance)
  '10s': '1m', '15s': '1m', '30s': '1m', '45s': '1m',
  // Minutes
  '1m': '1m', '2m': '1m', '3m': '3m', '5m': '5m',
  '15m': '15m', '30m': '30m',
  // Hours
  '1h': '1h', '2h': '2h', '4h': '4h',
  '6h': '6h', '12h': '12h',
  // Days / weeks / months
  '1D': '1d', '1W': '1w', '1M': '1M',
  // Legacy TV-compat numeric format
  '1': '1m', '3': '3m', '5': '5m', '15': '15m', '30': '30m',
  '60': '1h', '120': '2h', '240': '4h', '360': '6h', '720': '12h',
};

const PRECISION: Record<string, { prec: number; tickSize: number; quote: string; session: string }> = {
  'BTC/USDT': { prec: 2, tickSize: 0.1, quote: 'USDT', session: '24x7' },
  'ETH/USDT': { prec: 2, tickSize: 0.01, quote: 'USDT', session: '24x7' },
  'SOL/USDT': { prec: 3, tickSize: 0.001, quote: 'USDT', session: '24x7' },
  'XRP/USDT': { prec: 4, tickSize: 0.0001, quote: 'USDT', session: '24x7' },
  'GOLD': { prec: 2, tickSize: 0.01, quote: 'USD', session: '24x7' },
  'SILVER': { prec: 3, tickSize: 0.001, quote: 'USD', session: '24x7' },
};

// Backend proxy base URL — routes all Binance calls server-side to avoid geo-blocks
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:4000';

// ── Helpers ───────────────────────────────────────────────────────────────────

function toBinanceInterval(resolution: any): string {
  if (typeof resolution === 'string') return RESOLUTION_MAP[resolution] ?? '1h';
  if (resolution?.type) return RESOLUTION_MAP[resolution.type] ?? '1h';
  if (resolution?.baseType) return RESOLUTION_MAP[resolution.baseType] ?? '1h';
  if (resolution?.scale === 'hours') return `${resolution.units ?? 1}h`;
  if (resolution?.scale === 'days') return '1d';
  if (resolution?.scale === 'weeks') return '1w';
  if (resolution?.scale === 'minutes') return `${resolution.units ?? 1}m`;
  return '1h';
}

async function fetchProxyKlines(
  binanceSymbol: string,
  interval: string,
  fromMs: number,
  toMs: number,
  limit = 1000,
): Promise<BarsResult> {
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

async function fetchLatestCandle(
  binanceSymbol: string,
  interval: string,
): Promise<Bar | null> {
  try {
    const params = new URLSearchParams({ symbol: binanceSymbol, interval, limit: '1' });
    const res = await fetch(`${API_BASE}/api/market/klines?${params.toString()}`);
    if (!res.ok) return null;
    const raw: any[][] = await res.json();
    if (!raw.length) return null;
    const k = raw[0];
    return {
      time: Number(k[0]), open: parseFloat(k[1]), high: parseFloat(k[2]),
      low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    };
  } catch { return null; }
}

function syntheticBars(instrument: string): BarsResult {
  const BASE: Record<string, { price: number; vol: number; prec: number }> = {
    'BTC/USDT': { price: 70000, vol: 0.012, prec: 2 },
    'ETH/USDT': { price: 2400, vol: 0.014, prec: 2 },
    'SOL/USDT': { price: 180, vol: 0.018, prec: 2 },
    'XRP/USDT': { price: 1.30, vol: 0.016, prec: 4 },
    'GOLD': { price: 2700, vol: 0.0035, prec: 2 },
    'SILVER': { price: 32, vol: 0.0075, prec: 3 },
  };
  const cfg = BASE[instrument] ?? { price: 100, vol: 0.01, prec: 2 };
  const now = Date.now();
  let p = cfg.price;
  let seed = 0;
  for (let i = 0; i < instrument.length; i++) seed = (seed << 5) - seed + instrument.charCodeAt(i);
  seed = Math.abs(seed) || 5381;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const bars: Bar[] = [];
  for (let i = 299; i >= 0; i--) {
    const t = now - i * 3600_000;
    const drift = (rand() - 0.49) * cfg.vol * p;
    const open = parseFloat(p.toFixed(cfg.prec));
    const close = parseFloat((p - drift).toFixed(cfg.prec));
    const sp = Math.abs(close - open);
    bars.push({
      time: t, open, close,
      high: parseFloat((Math.max(open, close) + rand() * (sp + p * 0.001)).toFixed(cfg.prec)),
      low: parseFloat((Math.min(open, close) - rand() * (sp + p * 0.001)).toFixed(cfg.prec)),
      volume: 0,
    });
    p = parseFloat(close.toFixed(cfg.prec));
  }
  return { bars };
}

// ── Datafeed factory ──────────────────────────────────────────────────────────

interface Sub {
  ws: WebSocket | null;
  binanceSymbol: string;
  interval: string;
  pollTimer?: ReturnType<typeof setInterval>;
}

export function createSnyprDatafeed(): Datafeed {
  const subs = new Map<string, Sub>();

  // ── resolveSymbol ──────────────────────────────────────────────────────────
  function resolveSymbol(
    symbolName: string,
    onResolve: (si: SymbolInfo) => void,
    onError: (err: string) => void,
  ) {
    const cfg = PRECISION[symbolName];
    if (!cfg) { onError(`Unknown instrument: ${symbolName}`); return; }

    const isForex = symbolName === 'GOLD' || symbolName === 'SILVER';
    const exchange = isForex ? 'OANDA' : 'BINANCE';
    const segment = isForex ? 'FOREX' : 'SPOT';

    setTimeout(() => onResolve({
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
        name: exchange.toLowerCase(), code: exchange, zone: 'Etc/UTC',
        hours: Array.from({ length: 7 }, () => ({ open: true })),
        valid_intervals: ['1', '5', '15', '30', '60', '240', '1D', '1W'],
      },
    }), 0);
  }

  // ── getBars ────────────────────────────────────────────────────────────────
  async function getBars(
    symbolInfo: SymbolInfo,
    resolution: any,
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
        return await fetchProxyKlines(binanceSym, interval, fromMs, toMs);
      } catch { /* proxy not available yet — fall through to synthetic */ }
    }
    return syntheticBars(instrument);
  }

  // ── subscribeTicks ─────────────────────────────────────────────────────────
  function subscribeTicks(
    symbolInfo: SymbolInfo,
    resolution: any,
    onRealtimeCallback: (data: any) => void,
    subscriberUID: string,
  ) {
    const instrument = symbolInfo.symbol;
    const binanceSym = INSTRUMENT_TO_BINANCE[instrument];
    const interval = toBinanceInterval(resolution);

    if (binanceSym) {
      let ws: WebSocket | null = null;
      let lastMsgTime = 0;
      let pollTimer: ReturnType<typeof setInterval> | undefined;

      const onKlineMsg = (ev: MessageEvent) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.e !== 'kline' || !msg.k) return;
          lastMsgTime = Date.now();
          if (pollTimer) { clearInterval(pollTimer); pollTimer = undefined; }
          onRealtimeCallback({
            time: Number(msg.k.t), open: parseFloat(msg.k.o),
            high: parseFloat(msg.k.h), low: parseFloat(msg.k.l),
            close: parseFloat(msg.k.c), volume: parseFloat(msg.k.v),
          });
        } catch { }
      };

      const startPoll = () => {
        if (pollTimer) return;
        pollTimer = setInterval(async () => {
          if (Date.now() - lastMsgTime < 8000) return;
          const candle = await fetchLatestCandle(binanceSym, interval);
          if (candle) onRealtimeCallback(candle);
        }, 30_000);
      };

      // Try Binance Vision CDN WebSocket first (bypasses India geo-block),
      // then fall back to stream.binance.com, then fall back to polling
      const wsUrls = [
        `wss://data-api.binance.vision/ws/${binanceSym.toLowerCase()}@kline_${interval}`,
        `wss://stream.binance.com:9443/ws/${binanceSym.toLowerCase()}@kline_${interval}`,
      ];

      const tryWs = (idx: number) => {
        if (idx >= wsUrls.length) { startPoll(); return; }
        try {
          ws = new WebSocket(wsUrls[idx]);
          ws.onopen = () => startPoll(); // watchdog alongside WS
          ws.onerror = () => { ws = null; tryWs(idx + 1); };
          ws.onmessage = onKlineMsg;
        } catch { tryWs(idx + 1); }
      };

      tryWs(0);

      subs.set(subscriberUID, { ws, binanceSymbol: binanceSym, interval, pollTimer });
    } else {
      // Commodities — poll gold-api.com
      const pollTimer = setInterval(async () => {
        try {
          const sym = instrument === 'GOLD' ? 'XAU' : 'XAG';
          const res = await fetch(`https://api.gold-api.com/price/${sym}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.price) onRealtimeCallback({
            time: Date.now(), open: data.price, high: data.price,
            low: data.price, close: data.price, volume: 0,
          });
        } catch { }
      }, 15000);
      subs.set(subscriberUID, { ws: null, binanceSymbol: '', interval, pollTimer });
    }
  }

  // ── unsubscribeTicks / destroy ─────────────────────────────────────────────
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
