/**
 * usePaperTradingQuery.ts
 *
 * React Query hooks for the paper trading backend API.
 * Every balance-changing operation goes through the backend.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';
import { useUIStore } from '../state/useUIStore';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PaperAccount {
  id: string;
  user_id: string;
  balance: string;
  starting_balance: string;
  total_realised_pnl: string;
  total_fees: string;
  reset_count: number;
  locked_margin: string;
  open_positions_count: number;
  created_at: string;
  updated_at: string;
}

export type PaperDirection = 'LONG' | 'SHORT';

export type PaperPositionStatus =
  | 'OPEN' | 'CLOSED' | 'LIQUIDATED'
  | 'SL_HIT' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT';

export interface PaperPosition {
  id: string;
  user_id: string;
  instrument: string;
  direction: PaperDirection;
  size: string;
  notional_usd: string;
  margin_usd: string;
  leverage: number;
  entry_price: string;
  liquidation_price: string;
  stop_loss: string | null;
  take_profit_1: string | null;
  take_profit_2: string | null;
  take_profit_3: string | null;
  close_price: string | null;
  closed_at: string | null;
  realised_pnl: string | null;
  fee: string;
  status: PaperPositionStatus;
  close_reason: string | null;
  note: string;
  opened_at: string;
  updated_at: string;
}

export interface PaperLedgerEntry {
  id: string;
  user_id: string;
  position_id: string | null;
  entry_type: string;
  amount: string;
  balance_after: string;
  note: string;
  created_at: string;
}

export interface OpenOrderParams {
  instrument: string;
  direction: PaperDirection;
  notionalUsd: number;
  leverage: number;
  marketPrice: number;
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  note?: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────
export const paperKeys = {
  account:   ['paper', 'account']   as const,
  positions: ['paper', 'positions'] as const,
  history:   ['paper', 'history']   as const,
  ledger:    ['paper', 'ledger']    as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────
export function usePaperAccount() {
  return useQuery<PaperAccount>({
    queryKey: paperKeys.account,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PaperAccount }>('/api/paper/account');
      return res.data;
    },
    refetchInterval: 30_000,
    retry: 2,
  });
}

export function usePaperPositions() {
  return useQuery<PaperPosition[]>({
    queryKey: paperKeys.positions,
    queryFn: async () => {
      const res = await apiClient.get<{ data: PaperPosition[] }>('/api/paper/positions');
      return res.data;
    },
    refetchInterval: 10_000,
    retry: 2,
  });
}

export function usePaperHistory(limit = 50) {
  return useQuery<PaperPosition[]>({
    queryKey: [...paperKeys.history, limit],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PaperPosition[] }>(`/api/paper/positions/history?limit=${limit}`);
      return res.data;
    },
    retry: 2,
  });
}

export function usePaperLedger(limit = 50) {
  return useQuery<PaperLedgerEntry[]>({
    queryKey: [...paperKeys.ledger, limit],
    queryFn: async () => {
      const res = await apiClient.get<{ data: PaperLedgerEntry[] }>(`/api/paper/account/ledger?limit=${limit}`);
      return res.data;
    },
    retry: 2,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────
export function useOpenPaperPosition() {
  const qc = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async (params: OpenOrderParams) => {
      const res = await apiClient.post<{ data: PaperPosition; meta: any }>('/api/paper/orders', {
        instrument:   params.instrument,
        direction:    params.direction,
        notionalUsd:  params.notionalUsd,
        leverage:     params.leverage,
        marketPrice:  params.marketPrice,
        stopLoss:     params.stopLoss ?? null,
        takeProfit1:  params.takeProfit1 ?? null,
        takeProfit2:  params.takeProfit2 ?? null,
        takeProfit3:  params.takeProfit3 ?? null,
        note:         params.note ?? '',
      });
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: paperKeys.account });
      qc.invalidateQueries({ queryKey: paperKeys.positions });
      addToast({
        type: 'success',
        title: 'Position Opened',
        message: `Filled at $${parseFloat(res.meta.fillPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} · Fee $${parseFloat(res.meta.fee).toFixed(2)}`,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.detail || err.message || 'Order failed';
      addToast({ type: 'danger', title: 'Order Failed', message: msg });
    },
  });
}

export function useClosePaperPosition() {
  const qc = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async ({ positionId, marketPrice }: { positionId: string; marketPrice: number }) => {
      const res = await apiClient.post<{ data: PaperPosition; meta: any }>(
        `/api/paper/positions/${positionId}/close`,
        { marketPrice }
      );
      return res;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: paperKeys.account });
      qc.invalidateQueries({ queryKey: paperKeys.positions });
      qc.invalidateQueries({ queryKey: paperKeys.history });
      const pnl = parseFloat(res.data.realised_pnl ?? '0');
      addToast({
        type: pnl >= 0 ? 'success' : 'danger',
        title: pnl >= 0 ? 'Position Closed — Profit' : 'Position Closed — Loss',
        message: `P&L: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)} at $${parseFloat(res.meta.fillPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err.message || 'Close failed';
      addToast({ type: 'danger', title: 'Close Failed', message: msg });
    },
  });
}

export function useResetPaperAccount() {
  const qc = useQueryClient();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<{ data: PaperAccount; message: string }>('/api/paper/account/reset', {});
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paperKeys.account });
      qc.invalidateQueries({ queryKey: paperKeys.positions });
      qc.invalidateQueries({ queryKey: paperKeys.history });
      qc.invalidateQueries({ queryKey: paperKeys.ledger });
      addToast({ type: 'info', title: 'Account Reset', message: 'Virtual balance restored to $10,000' });
    },
    onError: (err: any) => {
      addToast({ type: 'danger', title: 'Reset Failed', message: err.message || 'Could not reset account' });
    },
  });
}

// ── Price evaluation trigger ──────────────────────────────────────────────────
// Called periodically by the trading page to check SL/TP/liquidation server-side
export async function triggerPriceEvaluation(prices: Array<{ instrument: string; price: number }>) {
  try {
    await apiClient.post('/api/paper/evaluate-triggers', { prices });
  } catch {
    // Non-critical — triggers will be re-evaluated on next call
  }
}
