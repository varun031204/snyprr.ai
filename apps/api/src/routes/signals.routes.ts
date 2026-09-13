import { Router } from 'express';
import { SignalsController } from '../controllers/signals.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

/**
 * Signals Routes
 * - GET / : List signals (Subscribers see PUBLISHED, Traders see own drafts + published, Admin sees all)
 * - GET /:id : Get single signal
 * - POST / : Create draft signal (Trader only)
 * - PATCH /:id : Update signal (Trader only, RLS validates ownership)
 * - POST /:id/publish : Publish signal (Trader only)
 * - POST /:id/cancel : Cancel signal (Trader only)
 */

router.get('/', requireAuth, SignalsController.listSignals);
router.get('/:id', requireAuth, SignalsController.getSignalById);

router.post('/', requireAuth, requireRole('trader'), SignalsController.createSignal);
router.patch('/:id', requireAuth, requireRole('trader'), SignalsController.updateSignal);
router.post('/:id/publish', requireAuth, requireRole('trader'), SignalsController.publishSignal);
router.post('/:id/cancel', requireAuth, requireRole('trader'), SignalsController.cancelSignal);

export default router;
