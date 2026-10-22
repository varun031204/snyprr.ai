/**
 * priceService.ts
 *
 * Fetches live market prices from CoinGecko (no API key required for free tier)
 * and formats them as a context string for injection into AI prompts.
 */

// ── Supported instruments and their CoinGecko IDs ─────────────────────────────
const CRYPTO_IDS: Record<string, string> = {
  bitcoin:  'BTC',
  ethereum: 'ETH',
  'ripple': 'XRP',
  'solana': 'SOL',
  'binancecoin': 'BNB',
  'dogecoin': 'DOGE',
};

interface CoinGeckoResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
    usd_24h_vol: number;
    usd_market_cap: number;
  };
}

export interface LivePriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
}

let cachedPrices: LivePriceData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION_MS = 60_000; // 1 minute cache

/**
 * Fetch live crypto prices from CoinGecko free API.
 * Returns cached data if fetched within the last minute.
 */
export async function fetchLivePrices(): Promise<LivePriceData[]> {
  const now = Date.now();
  if (cachedPrices.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
    return cachedPrices;
  }

  try {
    const ids = Object.keys(CRYPTO_IDS).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

    const data: CoinGeckoResponse = await res.json();

    cachedPrices = Object.entries(data).map(([coinId, info]) => ({
      symbol: CRYPTO_IDS[coinId] ?? coinId.toUpperCase(),
      price: info.usd,
      change24h: info.usd_24h_change,
      volume24h: info.usd_24h_vol,
    }));

    lastFetchTime = now;
    return cachedPrices;
  } catch (err) {
    console.warn('[priceService] Failed to fetch live prices:', err);
    return cachedPrices; // return last known if fetch fails
  }
}

/**
 * Format live prices into a compact context string for AI prompt injection.
 */
export function formatPriceContext(prices: LivePriceData[]): string {
  if (prices.length === 0) return '';

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const lines = prices.map((p) => {
    const direction = p.change24h >= 0 ? '▲' : '▼';
    const changeAbs = Math.abs(p.change24h).toFixed(2);
    return `  • ${p.symbol}/USDT: $${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${direction}${changeAbs}% (24h)`;
  });

  return `\n\n[LIVE MARKET DATA as of ${now} IST]\n${lines.join('\n')}\n\nUse the above live prices in your response. These are actual current market prices fetched in real-time.`;
}

/**
 * Convenience: fetch prices and return formatted context string.
 */
export async function getLivePriceContext(): Promise<string> {
  const prices = await fetchLivePrices();
  return formatPriceContext(prices);
}
