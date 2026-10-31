/**
 * Market Data Proxy Routes
 *
 * Proxies market data server-side using CoinGecko (no geo-blocks, no API key).
 * Results are cached server-side to stay well within CoinGecko's 30 req/min limit.
 *
 * GET /api/market/tickers   — live prices + 24h change for all crypto symbols
 * GET /api/market/klines    — OHLCV candles for chart rendering
 * GET /api/market/calendar  — ForexFactory economic calendar (CORS proxy)
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ── Server-side cache to avoid rate-limiting CoinGecko ────────────────────────
// CoinGecko free = 30 req/min. Multiple users + 10s polling = instant rate-limit.
// Cache server-side so all users share one CoinGecko call.

interface CacheEntry<T> { data: T; fetchedAt: number }
const tickerCache: CacheEntry<any> | null = null;
const klineCache = new Map<string, CacheEntry<any>>();
const calendarCache: CacheEntry<any> | null = null;

let _tickerCache: CacheEntry<any[]> | null = null;
let _calendarCache: CacheEntry<any[]> | null = null;
const _klineCache = new Map<string, CacheEntry<any[]>>();

const TICKER_TTL = 30_000;   // 30s
const KLINE_TTL = 120_000;  // 2min
const CALENDAR_TTL = 900_000;  // 15min

// ── CoinGecko ID map ──────────────────────────────────────────────────────────

const SYMBOL_TO_GECKO: Record<string, string> = {
  BTCUSDT: 'bitcoin',
  ETHUSDT: 'ethereum',
  SOLUSDT: 'solana',
  XRPUSDT: 'ripple',
};

const GECKO_TO_SYMBOL: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  solana: 'SOLUSDT',
  ripple: 'XRPUSDT',
};

function setHttpCache(res: Response, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

// ── GET /api/market/tickers ───────────────────────────────────────────────────

router.get('/tickers', async (_req: Request, res: Response) => {
  try {
    // Return server-side cache if fresh
    if (_tickerCache && Date.now() - _tickerCache.fetchedAt < TICKER_TTL) {
      setHttpCache(res, 15);
      res.json(_tickerCache.data);
      return;
    }

    const ids = Object.values(SYMBOL_TO_GECKO).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`);

    const data: Record<string, { usd: number; usd_24h_change?: number; usd_24h_vol?: number }> = await response.json();

    const tickers = Object.entries(GECKO_TO_SYMBOL).map(([geckoId, symbol]) => {
      const info = data[geckoId];
      if (!info) return null;
      return {
        symbol,
        lastPrice: String(info.usd),
        priceChangePercent: String((info.usd_24h_change ?? 0).toFixed(4)),
        highPrice: String(info.usd),
        lowPrice: String(info.usd),
        volume: '0',
        quoteVolume: String(Math.round(info.usd_24h_vol ?? 0)),
      };
    }).filter(Boolean) as any[];

    _tickerCache = { data: tickers, fetchedAt: Date.now() };
    setHttpCache(res, 15);
    res.json(tickers);
  } catch (err: any) {
    // Return stale cache rather than error if available
    if (_tickerCache) { res.json(_tickerCache.data); return; }
    res.status(502).json({ error: 'Market data unavailable', message: err.message });
  }
});

// ── GET /api/market/klines ────────────────────────────────────────────────────

router.get('/klines', async (req: Request, res: Response) => {
  try {
    const { symbol, limit } = req.query;
    if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }

    const symStr = String(symbol);
    const geckoId = SYMBOL_TO_GECKO[symStr];
    if (!geckoId) { res.status(400).json({ error: `Unknown symbol: ${symbol}` }); return; }

    const requestedLimit = parseInt(String(limit ?? '500'));
    let days = 7;
    if (requestedLimit <= 48) days = 1;
    else if (requestedLimit <= 168) days = 7;
    else if (requestedLimit <= 336) days = 14;
    else days = 90;

    const cacheKey = `${symStr}_${days}`;
    const cached = _klineCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < KLINE_TTL) {
      setHttpCache(res, 60);
      res.json(cached.data);
      return;
    }

    const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`CoinGecko OHLC ${response.status}`);

    // CoinGecko: [[timestamp_ms, open, high, low, close], ...]
    // Binance format: [[open_time, open, high, low, close, volume, ...]]
    const ohlc: number[][] = await response.json();
    const binanceFormat = ohlc.map(([t, o, h, l, c]) => [t, o, h, l, c, 0]);

    _klineCache.set(cacheKey, { data: binanceFormat, fetchedAt: Date.now() });
    setHttpCache(res, 60);
    res.json(binanceFormat);
  } catch (err: any) {
    const cacheKey = `${String(req.query.symbol)}_7`;
    const stale = _klineCache.get(cacheKey);
    if (stale) { res.json(stale.data); return; }
    res.status(502).json({ error: 'Klines unavailable', message: err.message });
  }
});

// ── GET /api/market/calendar ──────────────────────────────────────────────────

router.get('/calendar', async (_req: Request, res: Response) => {
  try {
    if (_calendarCache && Date.now() - _calendarCache.fetchedAt < CALENDAR_TTL) {
      setHttpCache(res, 900);
      res.json(_calendarCache.data);
      return;
    }

    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=eb5f46f2c7f42d78e90eda5ab41bc2ed',
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`Calendar ${response.status}`);
    const data = await response.json();
    (_calendarCache as any) = { data, fetchedAt: Date.now() };
    setHttpCache(res, 900);
    res.json(data);
  } catch (err: any) {
    if (_calendarCache) { res.json(_calendarCache.data); return; }
    res.status(502).json({ error: 'Calendar unavailable', message: err.message });
  }
});

export default router;
