/**
 * Market Data Proxy Routes
 *
 * Proxies Binance API calls server-side so the frontend doesn't
 * need to contact Binance directly — solving geo-blocks (India)
 * and browser CORS issues.
 *
 * GET /api/market/tickers   — 24hr price + change for crypto symbols
 * GET /api/market/klines    — OHLCV candles for a symbol/interval/range
 * GET /api/market/calendar  — ForexFactory economic calendar (CORS proxy)
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function setCache(res: Response, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

// ── GET /api/market/tickers ───────────────────────────────────────────────────
// Returns 24hr stats for all supported crypto symbols.
// Frontend uses this for the price ticker bar on the dashboard.

router.get('/tickers', async (_req: Request, res: Response) => {
  try {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'];
    const symbolsParam = encodeURIComponent(JSON.stringify(symbols));
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!response.ok) throw new Error(`Binance ${response.status}`);
    const data = await response.json();
    setCache(res, 15); // cache 15 seconds
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Market data unavailable', message: err.message });
  }
});

// ── GET /api/market/klines ────────────────────────────────────────────────────
// Returns OHLCV candles.
// Query params: symbol, interval, startTime, endTime, limit

router.get('/klines', async (req: Request, res: Response) => {
  try {
    const { symbol, interval = '1h', startTime, endTime, limit = '500' } = req.query;
    if (!symbol) {
      res.status(400).json({ error: 'symbol is required' });
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
      `https://api.binance.com/api/v3/klines?${params.toString()}`,
      { signal: AbortSignal.timeout(15_000) }
    );
    if (!response.ok) throw new Error(`Binance ${response.status}`);
    const data = await response.json();
    setCache(res, 30); // cache 30 seconds
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Klines unavailable', message: err.message });
  }
});

// ── GET /api/market/calendar ──────────────────────────────────────────────────
// Proxies the ForexFactory weekly economic calendar JSON.
// The source URL has CORS restrictions from browsers.

router.get('/calendar', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=eb5f46f2c7f42d78e90eda5ab41bc2ed',
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!response.ok) throw new Error(`Calendar source ${response.status}`);
    const data = await response.json();
    setCache(res, 900); // cache 15 minutes — calendar rarely changes
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Calendar unavailable', message: err.message });
  }
});

export default router;
