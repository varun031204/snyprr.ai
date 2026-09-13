import { Permission, UserRole } from '../types';

export const INSTRUMENTS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin / Tether', category: 'CRYPTO' },
  { symbol: 'ETH/USDT', name: 'Ethereum / Tether', category: 'CRYPTO' },
  { symbol: 'SOL/USDT', name: 'Solana / Tether', category: 'CRYPTO' },
  { symbol: 'XRP/USDT', name: 'XRP / Tether', category: 'CRYPTO' },
  { symbol: 'GOLD', name: 'Gold / USD', category: 'COMMODITIES' },
  { symbol: 'SILVER', name: 'Silver / USD', category: 'COMMODITIES' },
] as const;

export const TIMEFRAMES = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '45m',
  '1h',
  '2h',
  '3h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
] as const;

export const STRATEGIES = [
  'Breakout & Retest',
  'Smart Money Concepts (SMC)',
  'Supply & Demand Zones',
  'Trendline Breakout',
  'Fibonacci Retracement',
  'RSI / MACD Divergence',
  'Liquidity Sweep',
  'Harmonic Pattern',
] as const;

export const CHART_ITEMS = [
  { label: 'BTC/USDT', symbol: 'BINANCE:BTCUSDT', instrument: 'BTC/USDT' },
  { label: 'ETH/USDT', symbol: 'BINANCE:ETHUSDT', instrument: 'ETH/USDT' },
  { label: 'SOL/USDT', symbol: 'BINANCE:SOLUSDT', instrument: 'SOL/USDT' },
  { label: 'XRP/USDT', symbol: 'BINANCE:XRPUSDT', instrument: 'XRP/USDT' },
  { label: 'GOLD',     symbol: 'OANDA:XAUUSD',    instrument: 'GOLD' },
  { label: 'SILVER',   symbol: 'OANDA:XAGUSD',    instrument: 'SILVER' },
] as const;

export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 12,
} as const;

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    'manage_users',
    'manage_traders',
    'moderate_predictions',
    'manage_subscriptions',
    'view_audit_logs',
    'manage_settings',
    'create_prediction',
    'edit_prediction',
    'publish_prediction',
    'close_prediction',
    'view_trader_performance',
    'view_predictions',
    'follow_trader',
    'subscribe_trader',
    'manage_watchlist',
    'track_prediction',
  ],
  TRADER: [
    'create_prediction',
    'edit_prediction',
    'publish_prediction',
    'close_prediction',
    'view_trader_performance',
    'view_predictions',
    'follow_trader',
    'subscribe_trader',
    'manage_watchlist',
    'track_prediction',
  ],
  USER: [
    'view_predictions',
    'follow_trader',
    'subscribe_trader',
    'manage_watchlist',
    'track_prediction',
  ],
};
