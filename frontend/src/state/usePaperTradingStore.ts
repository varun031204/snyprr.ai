import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PTDirection = 'LONG' | 'SHORT';

export interface PaperTrade {
  id: string;
  instrument: string;
  direction: PTDirection;
  entryPrice: number;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  margin: number;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  closePrice?: number;
  pnl?: number;
  pnlPct?: number;
}

interface PaperTradingState {
  balance: number;
  initialBalance: number;
  trades: PaperTrade[];
  openTrade: (trade: Omit<PaperTrade, 'id' | 'status' | 'openedAt'>) => string | null;
  closeTrade: (id: string, closePrice: number) => void;
  resetAccount: () => void;
}

const INITIAL_BALANCE = 10_000;

export const usePaperTradingStore = create<PaperTradingState>()(
  persist(
    (set, get) => ({
      balance: INITIAL_BALANCE,
      initialBalance: INITIAL_BALANCE,
      trades: [],

      openTrade: (trade) => {
        if (trade.margin > get().balance) return null;
        const id = `pt_${Date.now()}`;
        set((s) => ({
          balance: s.balance - trade.margin,
          trades: [{ ...trade, id, status: 'OPEN', openedAt: new Date().toISOString() }, ...s.trades],
        }));
        return id;
      },

      closeTrade: (id, closePrice) => {
        set((s) => {
          const trade = s.trades.find((t) => t.id === id);
          if (!trade || trade.status !== 'OPEN') return s;
          const priceDiff = trade.direction === 'LONG'
            ? closePrice - trade.entryPrice
            : trade.entryPrice - closePrice;
          const pnl = (priceDiff / trade.entryPrice) * trade.margin;
          const pnlPct = (priceDiff / trade.entryPrice) * 100;
          return {
            balance: s.balance + trade.margin + pnl,
            trades: s.trades.map((t) =>
              t.id === id ? { ...t, status: 'CLOSED', closedAt: new Date().toISOString(), closePrice, pnl, pnlPct } : t
            ),
          };
        });
      },

      resetAccount: () => set({ balance: INITIAL_BALANCE, trades: [] }),
    }),
    { name: 'snyprr_paper_trading' }
  )
);
