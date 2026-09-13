import { create } from 'zustand';
import { MOCK_TICKERS } from '../services/mock/mockData';
import { CandleData, MarketTicker } from '../types';

interface MarketState {
  activeSymbol: string;
  tickers: MarketTicker[];
  candleCache: Record<string, CandleData[]>;
  setActiveSymbol: (symbol: string) => void;
  updateTickerPrice: (symbol: string, newPrice: number) => void;
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
    const volume = Math.floor(Math.random() * 500) + 100;

    candles.push({ time, open, high, low, close, volume });
    current = close;
  }
  return candles;
};

export const useMarketStore = create<MarketState>((set) => ({
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

  setActiveSymbol: (symbol: string) => set({ activeSymbol: symbol }),

  updateTickerPrice: (symbol: string, newPrice: number) =>
    set((state) => ({
      tickers: state.tickers.map((t) => (t.symbol === symbol ? { ...t, price: newPrice } : t)),
    })),
}));
