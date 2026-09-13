import { Request, Response, NextFunction } from 'express';
import { SubscriptionsService } from '../services/subscriptions.service.js';
import { AppError } from '../middleware/error.middleware.js';

export class SubscriptionsController {
  static async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const plans = await SubscriptionsService.getPlans(req.supabase);
      res.json({ data: plans });
    } catch (err) {
      next(err);
    }
  }

  static async getMySubscriptions(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Authentication required', 401);
      }
      const subs = await SubscriptionsService.getMySubscriptions(req.supabase, req.user.id);
      res.json({ data: subs });
    } catch (err) {
      next(err);
    }
  }

  static async getMyPayments(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Authentication required', 401);
      }
      const payments = await SubscriptionsService.getMyPayments(req.supabase, req.user.id);
      res.json({ data: payments });
    } catch (err) {
      next(err);
    }
  }
}
