/**
 * paperTrading.controller.ts
 *
 * HTTP handlers for the paper trading engine.
 * All financial operations delegated to paperTrading.service.ts
 * which uses atomic DB functions — never trusts client-supplied balances or P&L.
 */

import type { Request, Response, NextFunction } from 'express';
import * as pt from '../services/paperTrading.service.js';

// ── Account ───────────────────────────────────────────────────────────────────
export async function getAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await pt.getAccountSummary(req.user!.id);
    res.json({ data: account });
  } catch (err) { next(err); }
}

export async function resetAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await pt.resetAccount(req.user!.id);
    res.json({ data: account, message: 'Demo account reset successfully' });
  } catch (err) { next(err); }
}

export async function getLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 200);
    const entries = await pt.getLedger(req.user!.id, limit);
    res.json({ data: entries });
  } catch (err) { next(err); }
}

// ── Positions ─────────────────────────────────────────────────────────────────
export async function getOpenPositions(req: Request, res: Response, next: NextFunction) {
  try {
    const positions = await pt.getOpenPositions(req.user!.id);
    res.json({ data: positions });
  } catch (err) { next(err); }
}

export async function getPositionHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string || '50'), 500);
    const positions = await pt.getPositionHistory(req.user!.id, limit);
    res.json({ data: positions });
  } catch (err) { next(err); }
}

export async function getPositionById(req: Request, res: Response, next: NextFunction) {
  try {
    const pos = await pt.getPositionById(req.user!.id, req.params.id);
    if (!pos) return res.status(404).json({ error: 'Position not found' });
    res.json({ data: pos });
  } catch (err) { next(err); }
}

// ── Order execution ───────────────────────────────────────────────────────────
export async function openPosition(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      instrument, direction, notionalUsd, leverage,
      marketPrice, stopLoss, takeProfit1, takeProfit2, takeProfit3, note,
    } = req.body;

    // Basic type coercions — service layer does full validation
    const result = await pt.openMarketOrder(req.user!.id, {
      instrument:   String(instrument || ''),
      direction:    String(direction || '') as 'LONG' | 'SHORT',
      notionalUsd:  parseFloat(notionalUsd),
      leverage:     parseInt(leverage) || 1,
      marketPrice:  parseFloat(marketPrice),
      stopLoss:     stopLoss   != null ? parseFloat(stopLoss)   : null,
      takeProfit1:  takeProfit1 != null ? parseFloat(takeProfit1) : null,
      takeProfit2:  takeProfit2 != null ? parseFloat(takeProfit2) : null,
      takeProfit3:  takeProfit3 != null ? parseFloat(takeProfit3) : null,
      note:         typeof note === 'string' ? note.slice(0, 280) : '',
    });

    res.status(201).json({
      data: result.position,
      meta: {
        fillPrice: result.fillPrice,
        fee:       result.fee,
        slippage:  result.slippage,
        message: `${direction} position opened on ${instrument}`,
      },
    });
  } catch (err: any) {
    if (err.message?.startsWith('INSUFFICIENT_BALANCE')) {
      return res.status(422).json({ error: 'Insufficient virtual balance', detail: err.message });
    }
    if (err.message?.startsWith('INVALID_')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

export async function closePosition(req: Request, res: Response, next: NextFunction) {
  try {
    const { marketPrice } = req.body;
    if (!marketPrice || isNaN(parseFloat(marketPrice)))
      return res.status(400).json({ error: 'marketPrice is required' });

    const result = await pt.closePosition(
      req.user!.id,
      req.params.id,
      parseFloat(marketPrice),
      'MANUAL'
    );

    res.json({
      data: result.position,
      meta: {
        fillPrice: result.fillPrice,
        message: `Position closed at $${result.fillPrice.toFixed(2)}`,
      },
    });
  } catch (err: any) {
    if (err.message?.includes('POSITION_NOT_FOUND')) {
      return res.status(404).json({ error: 'Position not found or already closed' });
    }
    if (err.message?.startsWith('INVALID_')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

// ── Price-triggered evaluation (internal — called by market price update handler) ──
export async function triggerPriceEvaluation(req: Request, res: Response, next: NextFunction) {
  try {
    const { prices } = req.body; // [{ instrument, price }]
    if (!Array.isArray(prices)) return res.status(400).json({ error: 'prices array required' });

    const updates = prices
      .filter((p: any) => p.instrument && typeof p.price === 'number' && p.price > 0)
      .map((p: any) => ({ instrument: String(p.instrument), price: Number(p.price) }));

    await pt.evaluatePositionsForTriggers(updates);
    res.json({ ok: true, evaluated: updates.length });
  } catch (err) { next(err); }
}
