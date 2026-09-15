import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  CrosshairMode,
  LineStyle,
  type IChartApi,
} from 'lightweight-charts';
import {
  RotateCcw, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  ZoomIn, ZoomOut, Minus, TrendingUp, TrendingDown, Square,
  Type, MousePointer, Pen, Trash2,
} from 'lucide-react';
import type { Prediction } from '../../types';
import { useUIStore } from '../../state/useUIStore';

// ─── Binance symbol map ───────────────────────────────────────────────────────
const INSTRUMENT_TO_BINANCE: Record<string, string> = {
  'BTC/USDT': 'BTCUSDT',
  'ETH/USDT': 'ETHUSDT',
  'SOL/USDT': 'SOLUSDT',
  'XRP/USDT': 'XRPUSDT',
};

const TIMEFRAME_TO_INTERVAL: Record<string, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w',
};

export type DrawTool = 'cursor' | 'hline' | 'trendline' | 'long' | 'short' | 'rect' | 'brush' | 'text';

interface Point { x: number; y: number; }

interface Drawing {
  id: string;
  tool: DrawTool;
  points: Point[];
  color: string;
  text?: string;
  complete: boolean;
}

interface TradingChartProps {
  tvSymbol: string;
  instrument: string;
  prediction?: Prediction | null;
  timeframe?: string;
  height?: number;
}

// ─── Fetch live Binance klines ────────────────────────────────────────────────
async function fetchCandles(binanceSymbol: string, interval: string, limit = 200) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Binance fetch failed');
  const raw: any[][] = await res.json();
  return raw.map((k) => ({
    time: Math.floor(k[0] / 1000) as any,
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
  }));
}

// ─── Synthetic candle generator ───────────────────────────────────────────────
function getDeterministicCandles(instrument: string, count = 120) {
  const baseConfigs: Record<string, { price: number; volatility: number; precision: number }> = {
    'GOLD':     { price: 2684.5, volatility: 0.0035, precision: 2 },
    'SILVER':   { price: 31.85,  volatility: 0.0075, precision: 3 },
    'BTC/USDT': { price: 92500,  volatility: 0.012,  precision: 2 },
    'ETH/USDT': { price: 3480,   volatility: 0.014,  precision: 2 },
    'SOL/USDT': { price: 186.0,  volatility: 0.018,  precision: 2 },
    'XRP/USDT': { price: 2.45,   volatility: 0.016,  precision: 4 },
  };
  const config = baseConfigs[instrument] || { price: 100, volatility: 0.01, precision: 2 };
  const { price: currentPrice, volatility, precision } = config;
  const now = Math.floor(Date.now() / 1000);
  const intervalSeconds = 3600;
  const candles: any[] = [];
  let runningClose = currentPrice;
  let seed = 0;
  for (let i = 0; i < instrument.length; i++) { seed = (seed << 5) - seed + instrument.charCodeAt(i); seed |= 0; }
  seed = Math.abs(seed) || 5381;
  const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let i = 0; i < count; i++) {
    const time = (now - i * intervalSeconds) as any;
    const drift = (rand() - 0.49) * volatility * runningClose;
    const open = Number((runningClose - drift).toFixed(precision));
    const close = Number(runningClose.toFixed(precision));
    const spread = Math.abs(close - open);
    const high = Number((Math.max(open, close) + rand() * (spread * 0.8 + runningClose * 0.0012)).toFixed(precision));
    const low  = Number((Math.min(open, close) - rand() * (spread * 0.8 + runningClose * 0.0012)).toFixed(precision));
    candles.push({ time, open, high, low, close });
    runningClose = open;
  }
  candles.reverse();
  return candles;
}

// ─── Tool config ──────────────────────────────────────────────────────────────
const TOOLS: { id: DrawTool; icon: React.ReactNode; title: string }[] = [
  { id: 'cursor',    icon: <MousePointer className="w-3.5 h-3.5" />, title: 'Cursor / Pan' },
  { id: 'hline',     icon: <Minus className="w-3.5 h-3.5" />,        title: 'Horizontal Line' },
  { id: 'trendline', icon: <TrendingUp className="w-3.5 h-3.5" />,   title: 'Trend Line' },
  { id: 'long',      icon: <TrendingUp className="w-3.5 h-3.5 text-green-400" />,  title: 'Long Position' },
  { id: 'short',     icon: <TrendingDown className="w-3.5 h-3.5 text-red-400" />,  title: 'Short Position' },
  { id: 'rect',      icon: <Square className="w-3.5 h-3.5" />,       title: 'Rectangle' },
  { id: 'brush',     icon: <Pen className="w-3.5 h-3.5" />,          title: 'Brush' },
  { id: 'text',      icon: <Type className="w-3.5 h-3.5" />,         title: 'Text' },
];

function uid() { return Math.random().toString(36).slice(2); }
