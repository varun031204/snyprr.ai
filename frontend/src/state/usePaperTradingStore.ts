/**
 * usePaperTradingStore
 *
 * Paper trading game state with leverage support.
 * Starting balance: $10,000
 * Persisted to localStorage.
 *
 * Leverage mechanics (AGENTS.md rule #19 — decimal-safe):
 * - Margin (collateral deducted from balance) = sizeUsd / leverage
 * - Notional position size stays at sizeUsd
 * - P&L is calculated on full notional → amplified by leverage
 * - Liquidation: when unrealised loss >= margin (position force-closed at ~0 return)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PTDirection = 'LONG' | 'SHORT';
export type PTStatus = 'OPEN' | 'CLOSED' | 'LIQUIDATED';

export interface PaperPosition {
  id: string;
  instrument: string;
  direction: PTDirection;
  /** Notional position size in units */
  size: number;
  /** Notional position value in USD */
  notionalUsd: number;
  /** Margin (collateral) locked from balance = notionalUsd / leverage */
  marginUsd: number;
  /** Leverage multiplier (1–100) */
  leverage: number;
  entryPrice: number;
  /** Liquidation price — auto-computed on open */
  liquidationPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  openedAt: string;
  closedAt: string | null;
  closePrice: number | null;
  status: PTStatus;
  realisedPnl: number | null;
  unrealisedPnl: number | null;
  note: string;
}

interface PaperTradingState {
  balance: number;
  startingBalance: number;
  positions: PaperPosition[];

  /** @returns the new position id, or null when rejected (insufficient margin). */
  openPosition: (params: {
    instrument: string;
    direction: PTDirection;
    size: number;
    entryPrice: number;
    notionalUsd: number;
    leverage: number;
    stopLoss: number | null;
    takeProfit: number | null;
    note: string;
  }) => string | null;

  closePosition: (id: string, closePrice: number) => void;
  liquidatePosition: (id: string) => void;
  resetAccount: () => void;
}

const STARTING_BALANCE = 10_000;

/** Liquidation price: price at which loss = margin */
function calcLiqPrice(direction: PTDirection, entry: number, leverage: number): number {
  const liqOffset = entry / leverage;
  return parseFloat(
    (direction === 'LONG' ? entry - liqOffset : entry + liqOffset).toFixed(8)
  );
}

/** Compute P&L on notional */
function calcPnl(direction: PTDirection, size: number, entry: number, current: number): number {
  const raw = direction === 'LONG'
    ? (current - entry) * size
    : (entry - current) * size;
  return parseFloat(raw.toFixed(2));
}

export const usePaperTradingStore = create<PaperTradingState>()(
  persist(
    (set, get) => ({
      balance: STARTING_BALANCE,
      startingBalance: STARTING_BALANCE,
      positions: [],

      openPosition: ({ instrument, direction, size, entryPrice, notionalUsd, leverage, stopLoss, takeProfit, note }) => {
        const margin = parseFloat((notionalUsd / leverage).toFixed(2));
        const { balance } = get();
        if (margin > balance) return null;

        const position: PaperPosition = {
          id: `pt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          instrument,
          direction,
          size,
          notionalUsd,
          marginUsd: margin,
          leverage,
          entryPrice,
          liquidationPrice: calcLiqPrice(direction, entryPrice, leverage),
          stopLoss,
          takeProfit,
          openedAt: new Date().toISOString(),
          closedAt: null,
          closePrice: null,
          status: 'OPEN',
          realisedPnl: null,
          unrealisedPnl: null,
          note,
        };

        set((state) => ({
          balance: parseFloat((state.balance - margin).toFixed(2)),
          positions: [position, ...state.positions],
        }));

        return position.id;
      },

      closePosition: (id, closePrice) => {
        set((state) => {
          const pos = state.positions.find((p) => p.id === id);
          if (!pos || pos.status !== 'OPEN') return state;

          const pnl = calcPnl(pos.direction, pos.size, pos.entryPrice, closePrice);
          const returned = parseFloat((pos.marginUsd + pnl).toFixed(2));

          return {
            balance: parseFloat((state.balance + Math.max(0, returned)).toFixed(2)),
            positions: state.positions.map((p) =>
              p.id === id ? {
                ...p,
                status: 'CLOSED' as PTStatus,
                closePrice,
                closedAt: new Date().toISOString(),
                realisedPnl: pnl,
                unrealisedPnl: pnl,
              } : p,
            ),
          };
        });
      },

      liquidatePosition: (id) => {
        set((state) => {
          const pos = state.positions.find((p) => p.id === id);
          if (!pos || pos.status !== 'OPEN') return state;

          return {
            positions: state.positions.map((p) =>
              p.id === id ? {
                ...p,
                status: 'LIQUIDATED' as PTStatus,
                closePrice: pos.liquidationPrice,
                closedAt: new Date().toISOString(),
                realisedPnl: -pos.marginUsd,
                unrealisedPnl: -pos.marginUsd,
              } : p,
            ),
          };
        });
      },

      resetAccount: () => set({ balance: STARTING_BALANCE, positions: [] }),
    }),
    {
      name: 'snyprr_paper_trading',
      version: 2,
    },
  ),
);
