/**
 * paperTrading.routes.ts
 *
 * All routes require authentication (JWT).
 * Financial operations are server-side only.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as ptc from '../controllers/paperTrading.controller.js';

const router = Router();

// All paper trading routes require authentication
router.use(requireAuth);

// Account
router.get('/account',          ptc.getAccount);
router.post('/account/reset',   ptc.resetAccount);
router.get('/account/ledger',   ptc.getLedger);

// Positions
router.get('/positions',        ptc.getOpenPositions);
router.get('/positions/history', ptc.getPositionHistory);
router.get('/positions/:id',    ptc.getPositionById);

// Orders
router.post('/orders',          ptc.openPosition);
router.post('/positions/:id/close', ptc.closePosition);

// Internal: price-based trigger evaluation
// Called by the market price poller — can also be secured with an internal API key if needed
router.post('/evaluate-triggers', ptc.triggerPriceEvaluation);

export default router;
