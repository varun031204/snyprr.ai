import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';

const router = Router();

/**
 * All admin routes require authentication and the 'admin' role.
 */
router.use(requireAuth, requireRole('admin'));

router.get('/stats', AdminController.getPlatformStats);
router.get('/users', AdminController.listUsers);
router.post('/users/:id/roles', AdminController.assignRole);
router.delete('/users/:id/roles', AdminController.removeRole);
router.patch('/users/:id/status', AdminController.updateUserStatus);

export default router;
