import { create } from 'zustand';
import { MOCK_TICKERS } from '../services/mock/mockData';
import { CandleData, MarketTicker } from '../types';

interface MarketState {
  activeSymbol: string;
  tickers: MarketTicker[];
  candleCache: Record<string, CandleData[]>;
  setActiveSymbol: (symbol: string) => void;
  updateTickerPrice: (symbol: string, newPrice: number) => void;
  refreshTickers: () => Promise<void>;
}

// Generate sample candle data for visual chart rendering
const generateCandles = (basePrice: number): CandleData[] => {
  const candles: CandleData[] = [];
  let current = basePrice * 0.95;
  const now = Math.floor(Date.now() / 1000);
  const hour = 3600;
  for (let i = 48; i >= 0; i--) {
    const time = now - i * hour;
    const volatility = current * 0.012;
    const open = current;
    const close = current + (Math.random() - 0.48) * volatility;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    candles.push({ time, open, high, low, close, volume: Math.floor(Math.random() * 500) + 100 });
    current = close;
  }
  return candles;
};

// ── API base URL (backend proxy) ──────────────────────────────────────────────
// Market data is proxied through the backend to avoid India geo-blocks on Binance
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

// ── Fetch crypto ticker prices via backend proxy ───────────────────────────────
async function fetchBinanceTickers(): Promise<Partial<MarketTicker>[]> {
  try {
    const res = await fetch(`${API_BASE}/api/market/tickers`);
    if (!res.ok) return [];
    const data: BinanceTicker24h[] = await res.json();

    const symbolMap: Record<string, string> = {
      BTCUSDT: 'BTC/USDT',
      ETHUSDT: 'ETH/USDT',
      SOLUSDT: 'SOL/USDT',
      XRPUSDT: 'XRP/USDT',
    };

    return data.map((t) => ({
      symbol: symbolMap[t.symbol] ?? t.symbol,
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      volume24h: parseFloat(t.quoteVolume),
    }));
  } catch {
    return [];
  }
}

// ── Gold-api.com for commodity spot prices ─────────────────────────────────────
async function fetchCommodityPrice(instrument: string): Promise<number | null> {
  try {
    const sym = instrument === 'GOLD' ? 'XAU' : instrument === 'SILVER' ? 'XAG' : null;
    if (!sym) return null;
    const res = await fetch(`https://api.gold-api.com/price/${sym}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.price === 'number' ? data.price : null;
  } catch {
    return null;
  }
}

// ── Merge live updates into the tickers array ──────────────────────────────────
async function refreshTickersFromAPI(current: MarketTicker[]): Promise<MarketTicker[]> {
  const [cryptoUpdates, goldPrice, silverPrice] = await Promise.all([
    fetchBinanceTickers(),
    fetchCommodityPrice('GOLD'),
    fetchCommodityPrice('SILVER'),
  ]);

  return current.map((ticker) => {
    const cryptoUpdate = cryptoUpdates.find((c) => c.symbol === ticker.symbol);
    if (cryptoUpdate?.price) {
      return {
        ...ticker,
        price: cryptoUpdate.price,
        change24h: cryptoUpdate.change24h ?? ticker.change24h,
        high24h: cryptoUpdate.high24h ?? ticker.high24h,
        low24h: cryptoUpdate.low24h ?? ticker.low24h,
        volume24h: cryptoUpdate.volume24h ?? ticker.volume24h,
      };
    }
    if (ticker.symbol === 'GOLD' && goldPrice != null) return { ...ticker, price: goldPrice };
    if (ticker.symbol === 'SILVER' && silverPrice != null) return { ...ticker, price: silverPrice };
    return ticker;
  });
}

// ── Zustand store ──────────────────────────────────────────────────────────────
export const useMarketStore = create<MarketState>((set, get) => ({
  activeSymbol: 'BTC/USDT',
  tickers: MOCK_TICKERS,
  candleCache: {
    'BTC/USDT': generateCandles(92500),
    'ETH/USDT': generateCandles(3480),
    'SOL/USDT': generateCandles(186.0),
    'XRP/USDT': generateCandles(2.45),
    'GOLD': generateCandles(2684.5),
    'SILVER': generateCandles(31.85),
  },

  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),

  updateTickerPrice: (symbol, newPrice) =>
    set((state) => ({
      tickers: state.tickers.map((t) => t.symbol === symbol ? { ...t, price: newPrice } : t),
    })),

  refreshTickers: async () => {
    const updated = await refreshTickersFromAPI(get().tickers);
    set({ tickers: updated });
  },
}));

// ── Auto-refresh every 60 seconds on module load ──────────────────────────────
// Prices update via the backend proxy (CoinGecko). 60s is enough for a dashboard.
// The backend caches results for 30s so multiple users share one CoinGecko call.
(function startPolling() {
  useMarketStore.getState().refreshTickers(); // immediate first fetch
  setInterval(() => useMarketStore.getState().refreshTickers(), 60_000);
})();
