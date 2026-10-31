/**
 * Market Data Proxy Routes
 *
 * Proxies market data server-side using CoinGecko (no geo-blocks, no API key).
 * Binance is blocked in India and from some Render regions (451).
 *
 * GET /api/market/tickers   — live prices + 24h change for all crypto symbols
 * GET /api/market/klines    — OHLCV candles for chart rendering
 * GET /api/market/calendar  — ForexFactory economic calendar (CORS proxy)
 */

import { Router, Request, Response } from 'express';

const router = Router();

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

function setCache(res: Response, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

// ── GET /api/market/tickers ───────────────────────────────────────────────────
// Returns 24hr stats matching the Binance ticker shape the frontend expects.

router.get('/tickers', async (_req: Request, res: Response) => {
  try {
    const ids = Object.values(SYMBOL_TO_GECKO).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=false`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`CoinGecko ${response.status}`);

    const data: Record<string, { usd: number; usd_24h_change: number; usd_24h_vol: number }> = await response.json();

    // Shape the response to match what the frontend's BinanceTicker24h interface expects
    const tickers = Object.entries(GECKO_TO_SYMBOL).map(([geckoId, symbol]) => {
      const info = data[geckoId];
      if (!info) return null;
      return {
        symbol,
        lastPrice: String(info.usd),
        priceChangePercent: String(info.usd_24h_change ?? 0),
        highPrice: String(info.usd),
        lowPrice: String(info.usd),
        volume: '0',
        quoteVolume: String(info.usd_24h_vol ?? 0),
      };
    }).filter(Boolean);

    setCache(res, 15);
    res.json(tickers);
  } catch (err: any) {
    res.status(502).json({ error: 'Market data unavailable', message: err.message });
  }
});

// ── GET /api/market/klines ────────────────────────────────────────────────────
// Returns OHLCV candles using CoinGecko's OHLC endpoint.
// Query params: symbol (e.g. BTCUSDT), interval (ignored — returns 4h candles), days

router.get('/klines', async (req: Request, res: Response) => {
  try {
    const { symbol, limit } = req.query;
    if (!symbol) { res.status(400).json({ error: 'symbol is required' }); return; }

    const geckoId = SYMBOL_TO_GECKO[String(symbol)];
    if (!geckoId) { res.status(400).json({ error: `Unknown symbol: ${symbol}` }); return; }

    // CoinGecko OHLC: days=1→48 candles (30m), days=7→168 (1h), days=14→336 (2h), days=90→360 (4h)
    // Choose days based on requested limit to get the right granularity
    const requestedLimit = parseInt(String(limit ?? '500'));
    let days = 7;
    if (requestedLimit <= 48) days = 1;
    else if (requestedLimit <= 168) days = 7;
    else if (requestedLimit <= 336) days = 14;
    else days = 90;

    const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/ohlc?vs_currency=usd&days=${days}`;
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`CoinGecko OHLC ${response.status}`);

    // CoinGecko returns [[timestamp_ms, open, high, low, close], ...]
    // Binance klines format: [[open_time, open, high, low, close, volume, ...]]
    // We map to Binance format so the frontend doesn't need to change
    const ohlc: number[][] = await response.json();
    const binanceFormat = ohlc.map(([t, o, h, l, c]) => [t, o, h, l, c, 0]);

    setCache(res, 60);
    res.json(binanceFormat);
  } catch (err: any) {
    res.status(502).json({ error: 'Klines unavailable', message: err.message });
  }
});

// ── GET /api/market/calendar ──────────────────────────────────────────────────
// Proxies ForexFactory weekly economic calendar.

router.get('/calendar', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(
      'https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=eb5f46f2c7f42d78e90eda5ab41bc2ed',
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) throw new Error(`Calendar ${response.status}`);
    const data = await response.json();
    setCache(res, 900);
    res.json(data);
  } catch (err: any) {
    res.status(502).json({ error: 'Calendar unavailable', message: err.message });
  }
});

export default router;
