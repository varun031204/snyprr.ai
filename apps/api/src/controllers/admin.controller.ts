import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/admin.service.js';
import { parseUUIDParam } from '../utils/validation.js';

const listUsersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const assignRoleSchema = z.object({
  role: z.enum(['user', 'subscriber', 'trader', 'admin']),
});

const updateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BLOCKED', 'PENDING_VERIFICATION']),
});

export class AdminController {
  static async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = listUsersQuerySchema.parse(req.query);
      const result = await AdminService.listUsers(limit, offset);
      res.json({ data: result });
    } catch (err) {
      next(err);
    }
  }

  static async assignRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseUUIDParam(req.params['id'], 'user id');
      const { role } = assignRoleSchema.parse(req.body);
      const result = await AdminService.assignRole(id, role);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async removeRole(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseUUIDParam(req.params['id'], 'user id');
      const { role } = assignRoleSchema.parse(req.body);
      const result = await AdminService.removeRole(id, role);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseUUIDParam(req.params['id'], 'user id');
      const { status } = updateStatusSchema.parse(req.body);
      const updated = await AdminService.updateUserStatus(id, status);
      res.json({
        message: `Account status updated to ${status}`,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPlatformStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getPlatformStats();
      res.json({ data: stats });
    } catch (err) {
      next(err);
    }
  }
}
