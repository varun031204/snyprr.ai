/**
 * signalsService.ts
 * Real HTTP implementation of IPredictionApi — backed by /api/signals
 *
 * Adapts the backend snake_case trading_signals shape → frontend Prediction type.
 */

import type { Prediction, PredictionDirection, PredictionStatus, PredictionVisibility } from '../../types';
import type { IPredictionApi } from './apiClient';
import type { ApiResponse, PaginatedResponse } from './types';
import { httpGet, httpPatch, httpPost } from './httpClient';

// ─── Backend shape ────────────────────────────────────────────────────────────

interface BackendSignal {
  id: string;
  trader_id: string;
  direction: string;
  status: string;
  instrument: string;
  entry_price: number | null;
  stop_loss_price: number;
  take_profit_1: number;
  take_profit_2: number | null;
  take_profit_3: number | null;
  time_frame: string;
  buying_wall: number;
  selling_wall: number;
  analysis: string | null;
  notes: string | null;
  likes_count: number;
  views_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  trader?: {
    id: string;
    display_name: string;
    bio: string | null;
    is_active: boolean;
  } | null;
}

interface BackendListResponse {
  data: BackendSignal[];
  count: number;
  limit: number;
  offset: number;
}

interface BackendSingleResponse {
  data: BackendSignal;
}

// ─── Adapter ──────────────────────────────────────────────────────────────────

function toFrontendPrediction(s: BackendSignal): Prediction {
  return {
    id: s.id,
    traderId: s.trader_id,
    trader: {
      id: s.trader?.id ?? s.trader_id,
      displayName: s.trader?.display_name ?? 'snyprr.ai Desk',
      handle: '@snyprr',
      avatar: '/snyprr-logo.png',
      verifiedBadge: true,
      winRate: 0,
    },
    title: `${s.instrument} ${s.direction} (${s.time_frame})`,
    instrument: s.instrument,
    category: inferCategory(s.instrument),
    direction: s.direction as PredictionDirection,
    entryPrice: s.entry_price ?? s.buying_wall,
    buyingZone: s.buying_wall,
    sellingZone: s.selling_wall,
    stopLoss: s.stop_loss_price,
    takeProfit: s.take_profit_1,
    takeProfit2: s.take_profit_2 ?? undefined,
    takeProfit3: s.take_profit_3 ?? undefined,
    riskRewardRatio: computeRRR(s),
    timeframe: s.time_frame,
    strategy: 'Key Price Zones',
    analysis: s.analysis ?? '',
    tags: [s.instrument.split('/')[0], s.direction, s.time_frame],
    status: s.status as PredictionStatus,
    visibility: 'PUBLIC' as PredictionVisibility,
    createdAt: s.created_at,
    publishedAt: s.published_at ?? undefined,
    updatedAt: s.updated_at,
    likesCount: s.likes_count,
    viewsCount: s.views_count,
    isSaved: false,
  };
}

function inferCategory(instrument: string): Prediction['category'] {
  const upper = instrument.toUpperCase();
  if (upper.includes('BTC') || upper.includes('ETH') || upper.includes('SOL') || upper.includes('USDT') || upper.includes('USDC')) return 'CRYPTO';
  if (upper.includes('EUR') || upper.includes('GBP') || upper.includes('JPY') || upper.includes('USD') || upper.includes('CHF') || upper.includes('AUD')) return 'FOREX';
  if (upper.includes('GOLD') || upper.includes('SILVER') || upper.includes('OIL') || upper.includes('XAU') || upper.includes('XAG')) return 'COMMODITIES';
  if (upper.includes('SPX') || upper.includes('NAS') || upper.includes('DJI') || upper.includes('FTSE')) return 'INDICES';
  return 'STOCKS';
}

function computeRRR(s: BackendSignal): number {
  const entry = s.entry_price ?? s.buying_wall;
  if (!entry || !s.stop_loss_price || !s.take_profit_1) return 0;
  const risk = Math.abs(entry - s.stop_loss_price);
  const reward = Math.abs(s.take_profit_1 - entry);
  if (risk === 0) return 0;
  return parseFloat((reward / risk).toFixed(2));
}

// ─── Service ──────────────────────────────────────────────────────────────────

class SignalsService implements IPredictionApi {
  async getPredictions(filters?: {
    instrument?: string;
    direction?: string;
    status?: string;
    timeframe?: string;
    traderId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResponse<Prediction>> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 12;
    const offset = (page - 1) * pageSize;

    const params: Record<string, string | number | boolean | undefined> = {
      limit: pageSize,
      offset,
    };
    if (filters?.direction) params.direction = filters.direction;
    if (filters?.status) params.status = filters.status;
    if (filters?.instrument) params.instrument = filters.instrument;
    if (filters?.traderId) params.trader_id = filters.traderId;
    // Note: text search is client-side filtered from the result set for now
    // (no full-text search endpoint on backend yet)

    const raw = await httpGet<BackendListResponse>('/api/signals', params);
    let predictions = (raw.data ?? []).map(toFrontendPrediction);

    // Client-side search filter
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      predictions = predictions.filter(
        (p) =>
          p.instrument.toLowerCase().includes(q) ||
          p.title.toLowerCase().includes(q) ||
          p.strategy.toLowerCase().includes(q)
      );
    }
    // Client-side timeframe filter
    if (filters?.timeframe) {
      predictions = predictions.filter((p) => p.timeframe === filters.timeframe);
    }

    const totalItems = predictions.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      success: true,
      data: predictions,
      pagination: { page, pageSize, totalItems, totalPages },
      timestamp: new Date().toISOString(),
    };
  }

  async getPredictionById(id: string): Promise<ApiResponse<Prediction>> {
    const raw = await httpGet<BackendSingleResponse>(`/api/signals/${id}`);
    return {
      success: true,
      data: toFrontendPrediction(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async createPrediction(data: Partial<Prediction>): Promise<ApiResponse<Prediction>> {
    const body = {
      direction: data.direction,
      instrument: data.instrument,
      entry_price: data.entryPrice ?? null,
      stop_loss_price: data.stopLoss,
      take_profit_1: data.takeProfit,
      take_profit_2: data.takeProfit2 ?? null,
      take_profit_3: data.takeProfit3 ?? null,
      buying_wall: data.buyingZone,
      selling_wall: data.sellingZone,
      time_frame: data.timeframe ?? '1h',
      analysis: data.analysis ?? null,
      status: 'PUBLISHED',
    };
    const raw = await httpPost<{ data: BackendSignal }>('/api/signals', body);
    return {
      success: true,
      data: toFrontendPrediction(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async updatePrediction(id: string, data: Partial<Prediction>): Promise<ApiResponse<Prediction>> {
    const body: Record<string, unknown> = {};
    if (data.entryPrice !== undefined) body.entry_price = data.entryPrice;
    if (data.stopLoss !== undefined) body.stop_loss_price = data.stopLoss;
    if (data.takeProfit !== undefined) body.take_profit_1 = data.takeProfit;
    if (data.takeProfit2 !== undefined) body.take_profit_2 = data.takeProfit2;
    if (data.takeProfit3 !== undefined) body.take_profit_3 = data.takeProfit3;
    if (data.buyingZone !== undefined) body.buying_wall = data.buyingZone;
    if (data.sellingZone !== undefined) body.selling_wall = data.sellingZone;
    if (data.analysis !== undefined) body.analysis = data.analysis;

    const raw = await httpPatch<{ data: BackendSignal }>(`/api/signals/${id}`, body);
    return {
      success: true,
      data: toFrontendPrediction(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async publishPrediction(id: string): Promise<ApiResponse<Prediction>> {
    const raw = await httpPost<{ data: BackendSignal }>(`/api/signals/${id}/publish`);
    return {
      success: true,
      data: toFrontendPrediction(raw.data),
      timestamp: new Date().toISOString(),
    };
  }

  async closePrediction(id: string, outcome: Prediction['outcome']): Promise<ApiResponse<Prediction>> {
    // Map to cancel on the backend (closest equivalent in V1 — no close endpoint yet)
    const status = outcome?.status === 'TARGET_HIT' ? 'COMPLETED' : 'CANCELLED';
    const raw = await httpPost<{ data: BackendSignal }>(`/api/signals/${id}/cancel`);
    const prediction = toFrontendPrediction(raw.data);
    prediction.outcome = outcome;
    prediction.status = status as PredictionStatus;
    return {
      success: true,
      data: prediction,
      timestamp: new Date().toISOString(),
    };
  }
}

export const signalsService = new SignalsService();

// ─── Chart Drawings Persistence ───────────────────────────────────────────────
// Uses localStorage as primary storage now. When backend adds a `drawings JSONB`
// column to trading_signals, swap localStorage calls for httpPatch/httpGet.

const DRAWINGS_KEY = (predictionId: string) => `chart_drawings_${predictionId}`;

export function saveChartDrawings(predictionId: string, drawings: object[]): void {
  try {
    localStorage.setItem(DRAWINGS_KEY(predictionId), JSON.stringify(drawings));
    // TODO: when backend supports it, also call:
    // httpPatch(`/api/signals/${predictionId}/drawings`, { drawings })
  } catch {
    // Storage quota or serialization error — silently ignore
  }
}

export function loadChartDrawings(predictionId: string): object[] {
  try {
    const raw = localStorage.getItem(DRAWINGS_KEY(predictionId));
    if (!raw) return [];
    return JSON.parse(raw) as object[];
  } catch {
    return [];
  }
}

