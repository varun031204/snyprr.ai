export type UserRole = 'ADMIN' | 'TRADER' | 'USER';

export type Permission =
  | 'manage_users'
  | 'manage_traders'
  | 'moderate_predictions'
  | 'manage_subscriptions'
  | 'view_audit_logs'
  | 'manage_settings'
  | 'create_prediction'
  | 'edit_prediction'
  | 'publish_prediction'
  | 'close_prediction'
  | 'view_trader_performance'
  | 'view_predictions'
  | 'follow_trader'
  | 'subscribe_trader'
  | 'manage_watchlist'
  | 'track_prediction';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  subscriptionTier?: 'FREE' | 'PRO' | 'VIP';
  bio?: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  permissions: Permission[];
}

export interface TraderProfile {
  id: string;
  userId: string;
  displayName: string;
  handle: string;
  avatar: string;
  bio: string;
  verifiedBadge: boolean;
  joinedDate: string;
  followersCount: number;
  subscribersCount: number;
  totalPredictions: number;
  winRate: number; // Percentage (e.g. 76.4)
  avgRiskReward: number; // e.g. 2.85
  featuredMarkets: string[];
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export type PredictionDirection = 'LONG' | 'SHORT';

export type PredictionStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ACTIVE'
  | 'TARGET_HIT'
  | 'STOP_HIT'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

export type PredictionVisibility = 'PUBLIC' | 'SUBSCRIBERS_ONLY' | 'EXCLUSIVE';

export interface PredictionOutcome {
  status: 'TARGET_HIT' | 'STOP_HIT' | 'CLOSED_MANUALLY' | 'EXPIRED';
  exitPrice: number;
  closedAt: string;
  returnPercentage: number;
  pnlMultiplier?: number;
  summaryNotes?: string;
}

export interface Prediction {
  id: string;
  traderId: string;
  trader: {
    id: string;
    displayName: string;
    handle: string;
    avatar: string;
    verifiedBadge: boolean;
    winRate: number;
  };
  title: string;
  instrument: string; // e.g. 'BTC/USDT', 'ETH/USDT', 'GOLD'
  category: 'CRYPTO' | 'FOREX' | 'STOCKS' | 'INDICES' | 'COMMODITIES';
  direction: PredictionDirection;
  entryPrice: number;
  buyingZone?: number;
  sellingZone?: number;
  stopLoss?: number;
  takeProfit?: number;   // TP1 (primary)
  takeProfit2?: number;  // TP2 (optional)
  takeProfit3?: number;  // TP3 (optional)
  riskRewardRatio?: number; // Calculated (e.g., 3.2)
  timeframe: string; // e.g. '15m', '1h', '4h', '1d'
  strategy: string; // e.g. 'Breakout & Retest', 'Smart Money Concepts'
  analysis: string; // Markdown detailed reasoning
  tags: string[];
  status: PredictionStatus;
  visibility: PredictionVisibility;
  createdAt: string;
  publishedAt?: string;
  updatedAt: string;
  outcome?: PredictionOutcome;
  chartSnapshotUrl?: string;
  likesCount: number;
  viewsCount: number;
  isSaved?: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  isPopular?: boolean;
  badge?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING';
  currentPeriodEnd: string;
  subscribedTraderIds: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'PREDICTION_PUBLISHED' | 'PREDICTION_STATUS_CHANGE' | 'NEW_FOLLOWER' | 'SUBSCRIPTION_UPDATE' | 'SYSTEM';
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface TraderJournalEntry {
  id: string;
  traderId: string;
  date: string;
  title: string;
  content: string;
  linkedPredictionIds: string[];
  tags: string[];
  mindsetRating: number; // 1-5
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: 'USER' | 'TRADER' | 'PREDICTION' | 'SETTING' | 'SUBSCRIPTION';
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  category: 'CRYPTO' | 'FOREX' | 'STOCKS' | 'COMMODITIES';
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ─── Chart Drawing Types ───────────────────────────────────────────────────────

export type DrawingTool =
  | 'pointer'
  // ── Lines ───────────────────────────────────────────────────────────────────
  | 'horizontal'
  | 'vertical'
  | 'trendline'
  | 'ray'
  | 'extended'
  // ── Channels ────────────────────────────────────────────────────────────────
  | 'channel'
  | 'pitchfork'
  // ── Fibonacci ───────────────────────────────────────────────────────────────
  | 'fibretracement'
  | 'fibextension'
  | 'fibchannel'
  // ── Shapes ──────────────────────────────────────────────────────────────────
  | 'rectangle'
  | 'circle'
  | 'triangle'
  // ── Arrows ──────────────────────────────────────────────────────────────────
  | 'arrow_up'
  | 'arrow_down'
  // ── Measure ─────────────────────────────────────────────────────────────────
  | 'price_range'
  | 'date_price_range'
  // ── Positions ───────────────────────────────────────────────────────────────
  | 'long'
  | 'short'
  // ── Freehand / Text ─────────────────────────────────────────────────────────
  | 'brush'
  | 'text';

interface BaseDrawing {
  id: string;
  color: string;
  opacity: number;
}

// ── Existing ─────────────────────────────────────────────────────────────────

export interface HorizontalLineDrawing extends BaseDrawing {
  type: 'horizontal';
  price: number;
}

export interface TrendLineDrawing extends BaseDrawing {
  type: 'trendline';
  price1: number;
  price2: number;
  barIndex1: number;
  barIndex2: number;
}

export interface LongPositionDrawing extends BaseDrawing {
  type: 'long';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  barIndex1: number;
  barIndex2: number;
}

export interface ShortPositionDrawing extends BaseDrawing {
  type: 'short';
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  barIndex1: number;
  barIndex2: number;
}

export interface RectangleDrawing extends BaseDrawing {
  type: 'rectangle';
  price1: number;
  price2: number;
  barIndex1: number;
  barIndex2: number;
}

export interface BrushDrawing extends BaseDrawing {
  type: 'brush';
  points: Array<{ price: number; barIndex: number }>;
}

export interface TextDrawing extends BaseDrawing {
  type: 'text';
  price: number;
  barIndex: number;
  text: string;
  fontSize: number;
}

// ── New Line Types ────────────────────────────────────────────────────────────

/** Vertical line anchored to a bar index */
export interface VerticalLineDrawing extends BaseDrawing {
  type: 'vertical';
  barIndex: number;
}

/** Ray: starts at point, extends infinitely to the right */
export interface RayDrawing extends BaseDrawing {
  type: 'ray';
  price1: number;
  price2: number;
  barIndex1: number;
  barIndex2: number;
}

/** Extended line: extends infinitely in both directions */
export interface ExtendedLineDrawing extends BaseDrawing {
  type: 'extended';
  price1: number;
  price2: number;
  barIndex1: number;
  barIndex2: number;
}

// ── Channel ───────────────────────────────────────────────────────────────────

/**
 * Parallel Channel: defined by two baseline points (bar1→bar2) plus a
 * channel width offset in price space.
 */
export interface ChannelDrawing extends BaseDrawing {
  type: 'channel';
  price1: number;
  price2: number;
  barIndex1: number;
  barIndex2: number;
  /** Price offset for the parallel second line */
  offsetPrice: number;
  /** true while the user is still dragging the baseline (phase=1),
   *  false once they click the offset point (phase=2, committed) */
  phase: 1 | 2;
}

// ── Pitchfork (Andrews) ───────────────────────────────────────────────────────

/**
 * Andrews Pitchfork: 3 anchor points.
 * handle (p1) → left tine tip (p2) → right tine tip (p3).
 * Median line runs from p1 through midpoint of p2-p3.
 */
export interface PitchforkDrawing extends BaseDrawing {
  type: 'pitchfork';
  price1: number; barIndex1: number; // pivot / handle
  price2: number; barIndex2: number; // upper tine
  price3: number; barIndex3: number; // lower tine
  /** 1 = setting p1, 2 = setting p2, 3 = setting p3 (committed) */
  phase: 1 | 2 | 3;
}

// ── Fibonacci ─────────────────────────────────────────────────────────────────

export interface FibRetracementDrawing extends BaseDrawing {
  type: 'fibretracement';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
  /** Levels to draw, e.g. [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] */
  levels: number[];
}

export interface FibExtensionDrawing extends BaseDrawing {
  type: 'fibextension';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
  price3: number; barIndex3: number;
  /** Extension levels e.g. [0, 0.618, 1, 1.272, 1.618, 2, 2.618] */
  levels: number[];
  /** 1 = setting p1→p2, 2 = setting p3 (committed) */
  phase: 1 | 2 | 3;
}

export interface FibChannelDrawing extends BaseDrawing {
  type: 'fibchannel';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
  price3: number; barIndex3: number;
  levels: number[];
  phase: 1 | 2 | 3;
}

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface CircleDrawing extends BaseDrawing {
  type: 'circle';
  /** Center anchor */
  centerPrice: number;
  centerBarIndex: number;
  /** Radius anchor point (price at edge) */
  edgePrice: number;
  edgeBarIndex: number;
}

export interface TriangleDrawing extends BaseDrawing {
  type: 'triangle';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
  price3: number; barIndex3: number;
  phase: 1 | 2 | 3;
}

// ── Arrows ────────────────────────────────────────────────────────────────────

export interface ArrowUpDrawing extends BaseDrawing {
  type: 'arrow_up';
  price: number;
  barIndex: number;
}

export interface ArrowDownDrawing extends BaseDrawing {
  type: 'arrow_down';
  price: number;
  barIndex: number;
}

// ── Measure ───────────────────────────────────────────────────────────────────

export interface PriceRangeDrawing extends BaseDrawing {
  type: 'price_range';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
}

export interface DatePriceRangeDrawing extends BaseDrawing {
  type: 'date_price_range';
  price1: number; barIndex1: number;
  price2: number; barIndex2: number;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type ChartDrawing =
  // original
  | HorizontalLineDrawing
  | TrendLineDrawing
  | LongPositionDrawing
  | ShortPositionDrawing
  | RectangleDrawing
  | BrushDrawing
  | TextDrawing
  // new lines
  | VerticalLineDrawing
  | RayDrawing
  | ExtendedLineDrawing
  // channels
  | ChannelDrawing
  | PitchforkDrawing
  // fib
  | FibRetracementDrawing
  | FibExtensionDrawing
  | FibChannelDrawing
  // shapes
  | CircleDrawing
  | TriangleDrawing
  // arrows
  | ArrowUpDrawing
  | ArrowDownDrawing
  // measure
  | PriceRangeDrawing
  | DatePriceRangeDrawing;
