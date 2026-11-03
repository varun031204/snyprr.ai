/**
 * paperTrading.service.ts
 *
 * Server-side paper trading engine.
 * All balance changes go through atomic PostgreSQL functions.
 * Never exposes service-role key to the client.
 *
 * Fee model: 0.05% of notional per trade (taker fee, both open and close).
 * Slippage: 0.05% simulated on market orders (applied to execution price).
 * Limit orders are not currently supported — all orders execute as market.
 */

import { db as pool } from '../db/pool.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const FEE_RATE = 0.0005;   // 0.05% taker fee
const SLIPPAGE = 0.0005;   // 0.05% market slippage
const MAX_LEVERAGE = 100;
const MIN_NOTIONAL = 1;      // minimum $1 notional

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcLiquidationPrice(direction: 'LONG' | 'SHORT', entryPrice: number, leverage: number): number {
  // Simplified: liq when loss = margin (i.e. 100% margin loss)
  const offset = entryPrice / leverage;
  return direction === 'LONG'
    ? Math.max(0, entryPrice - offset)
    : entryPrice + offset;
}

function applySlippage(price: number, direction: 'LONG' | 'SHORT'): number {
  // Market buy (LONG open): slightly higher fill; SHORT open: slightly lower
  const factor = direction === 'LONG' ? 1 + SLIPPAGE : 1 - SLIPPAGE;
  return price * factor;
}

// ── Account ───────────────────────────────────────────────────────────────────
export async function getOrCreateAccount(userId: string) {
  const res = await pool.query(
    'SELECT * FROM public.get_or_create_paper_account($1)',
    [userId]
  );
  return res.rows[0];
}

export async function getAccount(userId: string) {
  const res = await pool.query(
    'SELECT * FROM public.paper_accounts WHERE user_id = $1',
    [userId]
  );
  if (res.rows.length === 0) return getOrCreateAccount(userId);
  return res.rows[0];
}

// ── Positions ─────────────────────────────────────────────────────────────────
export async function getOpenPositions(userId: string) {
  const res = await pool.query(
    `SELECT * FROM public.paper_positions
     WHERE user_id = $1 AND status = 'OPEN'
     ORDER BY opened_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getPositionHistory(userId: string, limit = 50) {
  const res = await pool.query(
    `SELECT * FROM public.paper_positions
     WHERE user_id = $1 AND status != 'OPEN'
     ORDER BY closed_at DESC NULLS LAST
     LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function getPositionById(userId: string, positionId: string) {
  const res = await pool.query(
    'SELECT * FROM public.paper_positions WHERE id = $1 AND user_id = $2',
    [positionId, userId]
  );
  return res.rows[0] ?? null;
}

// ── Order execution ───────────────────────────────────────────────────────────
export interface OpenOrderParams {
  instrument: string;
  direction: 'LONG' | 'SHORT';
  notionalUsd: number;       // USD position size
  leverage: number;
  marketPrice: number;       // current market price at submission
  stopLoss?: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  note?: string;
}

export async function openMarketOrder(userId: string, params: OpenOrderParams) {
  const {
    instrument, direction, leverage, marketPrice,
    stopLoss, takeProfit1, takeProfit2, takeProfit3, note = '',
  } = params;
  let { notionalUsd } = params;

  // Validate inputs
  if (!instrument || !['LONG', 'SHORT'].includes(direction))
    throw new Error('INVALID_PARAMS: instrument and direction required');
  if (!Number.isFinite(leverage) || leverage < 1 || leverage > MAX_LEVERAGE)
    throw new Error(`INVALID_LEVERAGE: must be 1–${MAX_LEVERAGE}`);
  if (!Number.isFinite(notionalUsd) || notionalUsd < MIN_NOTIONAL)
    throw new Error(`INVALID_SIZE: minimum notional is $${MIN_NOTIONAL}`);
  if (!Number.isFinite(marketPrice) || marketPrice <= 0)
    throw new Error('INVALID_PRICE: market price must be a positive number');

  // Apply slippage to get actual fill price
  const fillPrice = applySlippage(marketPrice, direction);

  // Calculate position metrics
  const marginUsd = notionalUsd / leverage;
  const size = notionalUsd / fillPrice;           // base currency units
  const liqPrice = calcLiquidationPrice(direction, fillPrice, leverage);
  const fee = notionalUsd * FEE_RATE;            // open fee

  // Validate SL/TP logic
  if (stopLoss != null && stopLoss <= 0)
    throw new Error('INVALID_STOP_LOSS');
  if (takeProfit1 != null && takeProfit1 <= 0)
    throw new Error('INVALID_TAKE_PROFIT');

  // Directional SL/TP sanity checks
  if (direction === 'LONG') {
    if (stopLoss != null && stopLoss >= fillPrice)
      throw new Error('INVALID_STOP_LOSS: SL must be below entry for LONG');
    if (takeProfit1 != null && takeProfit1 <= fillPrice)
      throw new Error('INVALID_TAKE_PROFIT: TP must be above entry for LONG');
  } else {
    if (stopLoss != null && stopLoss <= fillPrice)
      throw new Error('INVALID_STOP_LOSS: SL must be above entry for SHORT');
    if (takeProfit1 != null && takeProfit1 >= fillPrice)
      throw new Error('INVALID_TAKE_PROFIT: TP must be below entry for SHORT');
  }

  // Execute atomically via DB function
  const res = await pool.query(
    `SELECT * FROM public.open_paper_position(
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
    )`,
    [
      userId, instrument, direction,
      size.toFixed(10), notionalUsd.toFixed(8), marginUsd.toFixed(8),
      leverage, fillPrice.toFixed(10), liqPrice.toFixed(10),
      stopLoss ?? null, takeProfit1 ?? null, takeProfit2 ?? null, takeProfit3 ?? null,
      fee.toFixed(8), note,
    ]
  );

  return {
    position: res.rows[0],
    fillPrice,
    fee,
    slippage: fillPrice - marketPrice,
  };
}

// ── Close position ─────────────────────────────────────────────────────────────
export async function closePosition(
  userId: string,
  positionId: string,
  marketPrice: number,
  reason: 'MANUAL' | 'SL' | 'TP1' | 'TP2' | 'TP3' | 'LIQUIDATION' = 'MANUAL'
) {
  if (!Number.isFinite(marketPrice) || marketPrice <= 0)
    throw new Error('INVALID_PRICE');

  // For manual close, apply slippage in opposite direction
  const direction = reason === 'MANUAL' ? null : null; // resolved in DB
  let fillPrice = marketPrice;
  if (reason === 'MANUAL') {
    // Get position to determine direction for slippage
    const pos = await getPositionById(userId, positionId);
    if (!pos) throw new Error('POSITION_NOT_FOUND');
    // Close direction is opposite to open: LONG close = sell (fills slightly lower)
    fillPrice = pos.direction === 'LONG'
      ? marketPrice * (1 - SLIPPAGE)
      : marketPrice * (1 + SLIPPAGE);
  }

  const res = await pool.query(
    'SELECT * FROM public.close_paper_position($1, $2, $3, $4)',
    [positionId, userId, fillPrice.toFixed(10), reason]
  );

  return { position: res.rows[0], fillPrice };
}

// ── SL/TP/Liquidation evaluation (called from price update handler) ──────────
export interface PriceUpdate {
  instrument: string;
  price: number;
}

export async function evaluatePositionsForTriggers(updates: PriceUpdate[]): Promise<void> {
  if (updates.length === 0) return;

  // Build instrument→price map
  const priceMap: Record<string, number> = {};
  for (const u of updates) priceMap[u.instrument] = u.price;
  const instruments = Object.keys(priceMap);

  // Fetch all open positions for updated instruments
  const res = await pool.query(
    `SELECT * FROM public.paper_positions
     WHERE status = 'OPEN' AND instrument = ANY($1::text[])`,
    [instruments]
  );

  if (res.rows.length === 0) return;

  // Evaluate each position
  const closures: Array<{ id: string; userId: string; price: number; reason: string }> = [];

  for (const pos of res.rows) {
    const price = priceMap[pos.instrument];
    if (!price) continue;

    const direction: 'LONG' | 'SHORT' = pos.direction;
    const sl = pos.stop_loss ? parseFloat(pos.stop_loss) : null;
    const tp1 = pos.take_profit_1 ? parseFloat(pos.take_profit_1) : null;
    const tp2 = pos.take_profit_2 ? parseFloat(pos.take_profit_2) : null;
    const tp3 = pos.take_profit_3 ? parseFloat(pos.take_profit_3) : null;
    const liq = parseFloat(pos.liquidation_price);

    // Liquidation check (highest priority)
    if (direction === 'LONG' && price <= liq) {
      closures.push({ id: pos.id, userId: pos.user_id, price: liq, reason: 'LIQUIDATION' });
      continue;
    }
    if (direction === 'SHORT' && price >= liq) {
      closures.push({ id: pos.id, userId: pos.user_id, price: liq, reason: 'LIQUIDATION' });
      continue;
    }

    // Stop loss
    if (sl != null) {
      if (direction === 'LONG' && price <= sl) {
        closures.push({ id: pos.id, userId: pos.user_id, price: sl, reason: 'SL' });
        continue;
      }
      if (direction === 'SHORT' && price >= sl) {
        closures.push({ id: pos.id, userId: pos.user_id, price: sl, reason: 'SL' });
        continue;
      }
    }

    // Take profits: TP3 → TP2 → TP1 (highest TP first for LONGs, lowest for SHORTs)
    // Check from closest to furthest in profit direction
    const tpChecks = direction === 'LONG'
      ? [{ level: tp3, reason: 'TP3' }, { level: tp2, reason: 'TP2' }, { level: tp1, reason: 'TP1' }]
      : [{ level: tp3, reason: 'TP3' }, { level: tp2, reason: 'TP2' }, { level: tp1, reason: 'TP1' }];

    // For TP: LONG hits when price >= TP; SHORT hits when price <= TP
    for (const { level, reason } of tpChecks) {
      if (level == null) continue;
      if (direction === 'LONG' && price >= level) {
        closures.push({ id: pos.id, userId: pos.user_id, price: level, reason });
        break;
      }
      if (direction === 'SHORT' && price <= level) {
        closures.push({ id: pos.id, userId: pos.user_id, price: level, reason });
        break;
      }
    }
  }

  // Execute closures sequentially (each uses a DB transaction)
  for (const c of closures) {
    try {
      await pool.query(
        'SELECT * FROM public.close_paper_position($1, $2, $3, $4)',
        [c.id, c.userId, c.price.toFixed(10), c.reason]
      );
    } catch (err: any) {
      // Position may already be closed by a concurrent request — ignore
      if (!err.message?.includes('POSITION_NOT_FOUND_OR_ALREADY_CLOSED')) {
        console.error('[PaperEngine] closure error:', err.message);
      }
    }
  }
}

// ── Reset account ─────────────────────────────────────────────────────────────
export async function resetAccount(userId: string) {
  const res = await pool.query(
    'SELECT * FROM public.reset_paper_account($1)',
    [userId]
  );
  return res.rows[0];
}

// ── Ledger ────────────────────────────────────────────────────────────────────
export async function getLedger(userId: string, limit = 100) {
  const res = await pool.query(
    `SELECT * FROM public.paper_ledger
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

// ── Account summary with computed equity ─────────────────────────────────────
export async function getAccountSummary(userId: string) {
  const account = await getAccount(userId);
  const openPositions = await getOpenPositions(userId);

  // Equity = available balance + sum of all open position margins
  // (unrealised P&L requires live prices — computed client-side from this data)
  const lockedMargin = openPositions.reduce(
    (sum: number, p: any) => sum + parseFloat(p.margin_usd), 0
  );

  return {
    ...account,
    locked_margin: lockedMargin.toFixed(8),
    open_positions_count: openPositions.length,
  };
}
