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

// ── Symbol maps ───────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

const BINANCE_TO_APP: Record<string, string> = {
  BTCUSDT: 'BTC/USDT', ETHUSDT: 'ETH/USDT',
  SOLUSDT: 'SOL/USDT', XRPUSDT: 'XRP/USDT',
};
const APP_SYMBOLS = Object.keys(BINANCE_TO_APP); // ['BTCUSDT', ...]

// ── Real-time WebSocket (Binance Vision CDN — bypasses India geo-block) ───────
// wss://data-api.binance.vision is Binance's Cloudflare CDN mirror.
// When connected, it pushes a price update on every trade — true real-time.
// Falls back to stream.binance.com, then to HTTP polling if both fail.

function startRealtimePrices() {
  const streams = APP_SYMBOLS.map(s => `${s.toLowerCase()}@miniTicker`).join('/');

  const wsUrls = [
    `wss://data-api.binance.vision/stream?streams=${streams}`,
    `wss://stream.binance.com:9443/stream?streams=${streams}`,
  ];

  let wsConnected = false;

  const tryWs = (idx: number) => {
    if (idx >= wsUrls.length) {
      // All WebSocket URLs failed — start HTTP polling fallback
      startHttpPolling();
      return;
    }

    const ws = new WebSocket(wsUrls[idx]);
    let pingTimer: ReturnType<typeof setInterval>;

    ws.onopen = () => {
      wsConnected = true;
      // Keep alive with ping every 20s (Binance WS closes after 24h inactivity)
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'ping' }));
      }, 20_000);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        // Combined stream wraps payload in { stream: "...", data: {...} }
        const data = msg.data ?? msg;
        if (data.e !== '24hrMiniTicker') return;
        const appSymbol = BINANCE_TO_APP[data.s];
        if (!appSymbol) return;
        const price = parseFloat(data.c); // c = current close (last price)
        if (isNaN(price) || price <= 0) return;
        useMarketStore.getState().updateTickerPrice(appSymbol, price);
      } catch { /* ignore malformed messages */ }
    };

    ws.onerror = () => {
      clearInterval(pingTimer);
      wsConnected = false;
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      if (wsConnected) {
        // Was connected but dropped — reconnect after 3s
        wsConnected = false;
        setTimeout(() => tryWs(0), 3000);
      } else {
        // Never connected (geo-blocked) — try next URL
        tryWs(idx + 1);
      }
    };
  };

  tryWs(0);
}

// ── HTTP polling fallback (via backend proxy) ─────────────────────────────────
// Used when both WebSocket URLs fail (strict network environments).

interface BinanceTicker24h {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

async function fetchBinanceTickers(): Promise<Partial<MarketTicker>[]> {
  try {
    const res = await fetch(`${API_BASE}/api/market/tickers`);
    if (!res.ok) return [];
    const data: BinanceTicker24h[] = await res.json();
    return data.map((t) => ({
      symbol: BINANCE_TO_APP[t.symbol] ?? t.symbol,
      price: parseFloat(t.lastPrice),
      change24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
      volume24h: parseFloat(t.quoteVolume),
    }));
  } catch { return []; }
}

async function fetchCommodityPrice(instrument: string): Promise<number | null> {
  try {
    const sym = instrument === 'GOLD' ? 'XAU' : 'XAG';
    const res = await fetch(`https://api.gold-api.com/price/${sym}`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.price === 'number' ? data.price : null;
  } catch { return null; }
}

function startHttpPolling() {
  const poll = async () => {
    const [cryptoUpdates, goldPrice, silverPrice] = await Promise.all([
      fetchBinanceTickers(),
      fetchCommodityPrice('GOLD'),
      fetchCommodityPrice('SILVER'),
    ]);

    const current = useMarketStore.getState().tickers;
    const updated = current.map((ticker) => {
      const cu = cryptoUpdates.find((c) => c.symbol === ticker.symbol);
      if (cu?.price) return { ...ticker, price: cu.price, change24h: cu.change24h ?? ticker.change24h };
      if (ticker.symbol === 'GOLD' && goldPrice != null) return { ...ticker, price: goldPrice };
      if (ticker.symbol === 'SILVER' && silverPrice != null) return { ...ticker, price: silverPrice };
      return ticker;
    });
    useMarketStore.setState({ tickers: updated });
  };

  poll(); // immediate
  setInterval(poll, 30_000); // every 30s
}

// ── Zustand store ─────────────────────────────────────────────────────────────

export const useMarketStore = create<MarketState>((set, get) => ({
  activeSymbol: 'BTC/USDT',
  tickers: MOCK_TICKERS,
  candleCache: {
    'BTC/USDT': generateCandles(77000),
    'ETH/USDT': generateCandles(2400),
    'SOL/USDT': generateCandles(180),
    'XRP/USDT': generateCandles(1.30),
    'GOLD': generateCandles(2700),
    'SILVER': generateCandles(32),
  },

  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),

  updateTickerPrice: (symbol, newPrice) =>
    set((state) => ({
      tickers: state.tickers.map((t) => t.symbol === symbol ? { ...t, price: newPrice } : t),
    })),

  refreshTickers: async () => {
    const [cryptoUpdates, goldPrice, silverPrice] = await Promise.all([
      fetchBinanceTickers(),
      fetchCommodityPrice('GOLD'),
      fetchCommodityPrice('SILVER'),
    ]);
    const updated = get().tickers.map((ticker) => {
      const cu = cryptoUpdates.find((c) => c.symbol === ticker.symbol);
      if (cu?.price) return { ...ticker, price: cu.price, change24h: cu.change24h ?? ticker.change24h };
      if (ticker.symbol === 'GOLD' && goldPrice != null) return { ...ticker, price: goldPrice };
      if (ticker.symbol === 'SILVER' && silverPrice != null) return { ...ticker, price: silverPrice };
      return ticker;
    });
    set({ tickers: updated });
  },
}));

// ── Start real-time price feed on app load ─────────────────────────────────────
// 1. Try Binance Vision WebSocket (CDN, bypasses India geo-block) — sub-second updates
// 2. Try stream.binance.com — sub-second updates (may be blocked in India)
// 3. Fall back to HTTP polling every 30s via backend proxy

startRealtimePrices();

// Also do one immediate HTTP fetch so prices are correct before WS connects
useMarketStore.getState().refreshTickers();
