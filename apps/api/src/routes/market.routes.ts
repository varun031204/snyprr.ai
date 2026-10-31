/**
 * Market Data Proxy Routes
 *
 * Uses data-api.binance.vision — Binance's official CDN mirror that bypasses
 * India geo-blocks and Render IP restrictions. No API key required.
 * Results are cached server-side to reduce external calls.
 *
 * GET /api/market/tickers   — live prices + 24h change
 * GET /api/market/klines    — OHLCV candles
 * GET /api/market/calendar  — ForexFactory economic calendar
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Binance Vision CDN mirror — works from India + Render US regions
const BINANCE_VISION = 'https://data-api.binance.vision';

// ── Server-side cache ─────────────────────────────────────────────────────────

interface CacheEntry { data: any; fetchedAt: number }
let _tickerCache: CacheEntry | null = null;
let _calendarCache: CacheEntry | null = null;
const _klineCache = new Map<string, CacheEntry>();

const TICKER_TTL = 30_000;   // 30s
const KLINE_TTL = 120_000;  // 2min
const CALENDAR_TTL = 900_000;  // 15min

function setHttpCache(res: Response, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

// ── GET /api/market/tickers ───────────────────────────────────────────────────

router.get('/tickers', async (_req: Request, res: Response) => {
  try {
    if (_tickerCache && Date.now() - _tickerCache.fetchedAt < TICKER_TTL) {
      setHttpCache(res, 15);
      res.json(_tickerCache.data);
      return;
    }

    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];

    // Fetch 24hr stats and current price in parallel
    const [statsRes, priceRes] = await Promise.all([
      fetch(
        `${BINANCE_VISION}/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
        { signal: AbortSignal.timeout(10_000) }
      ),
      fetch(
        `${BINANCE_VISION}/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
        { signal: AbortSignal.timeout(10_000) }
      ),
    ]);

    if (!statsRes.ok) throw new Error(`Binance Vision stats ${statsRes.status}`);
    if (!priceRes.ok) throw new Error(`Binance Vision price ${priceRes.status}`);

    const statsData: any[] = await statsRes.json();
    // statsData already has lastPrice, priceChangePercent etc — return as-is
    // (matches the BinanceTicker24h interface on the frontend)

    _tickerCache = { data: statsData, fetchedAt: Date.now() };
    setHttpCache(res, 15);
    res.json(statsData);
  } catch (err: any) {
    if (_tickerCache) { res.json(_tickerCache.data); return; }
    res.status(502).json({ error: 'Market data unavailable', message: err.message });
  }
});

// ── GET /api/market/klines ────────────────────────────────────────────────────

router.get('/klines', async (req: Request, res: Response) => {
  try {
    const { symbol, interval = '1h', startTime, endTime, limit = '500' } = req.query;
    if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }

    const cacheKey = `${symbol}_${interval}_${startTime}_${endTime}_${limit}`;
    const cached = _klineCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < KLINE_TTL) {
      setHttpCache(res, 60);
      res.json(cached.data);
      return;
    }

    const params = new URLSearchParams({
      symbol: String(symbol),
      interval: String(interval),
      limit: String(limit),
    });
    if (startTime) params.set('startTime', String(startTime));
    if (endTime) params.set('endTime', String(endTime));

    const response = await fetch(
      `${BINANCE_VISION}/api/v3/klines?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) throw new Error(`Binance Vision klines ${response.status}`);

    const data = await response.json();
    _klineCache.set(cacheKey, { data, fetchedAt: Date.now() });
    setHttpCache(res, 60);
    res.json(data);
  } catch (err: any) {
    const staleKey = `${req.query.symbol}_${req.query.interval || '1h'}_${req.query.startTime}_${req.query.endTime}_${req.query.limit || '500'}`;
    const stale = _klineCache.get(staleKey);
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
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!response.ok) throw new Error(`Calendar ${response.status}`);
    const data = await response.json();
    _calendarCache = { data, fetchedAt: Date.now() };
    setHttpCache(res, 900);
    res.json(data);
  } catch (err: any) {
    if (_calendarCache) { res.json(_calendarCache.data); return; }
    res.status(502).json({ error: 'Calendar unavailable', message: err.message });
  }
});

export default router;
