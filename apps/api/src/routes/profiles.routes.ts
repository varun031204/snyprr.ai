import { Router } from 'express';
import { ProfilesController } from '../controllers/profiles.controller.js';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

/**
 * Profile Routes
 * - GET /me : Get current user profile, assigned roles, and subscription status
 * - PATCH /me : Update current user full_name, avatar, username, or phone
 * - GET /traders : List all active trader profiles (public)
 * - GET /traders/me : Get authenticated user's trader profile
 * - GET /traders/:id : Get public trader profile by ID
 */

router.get('/me', requireAuth, ProfilesController.getMyProfile);
router.patch('/me', requireAuth, ProfilesController.updateMyProfile);

router.get('/traders', optionalAuth, ProfilesController.listTraders);
router.get('/traders/me', requireAuth, requireRole('trader'), ProfilesController.getMyTraderProfile);
router.get('/traders/:id', optionalAuth, ProfilesController.getTraderProfile);

export default router;
