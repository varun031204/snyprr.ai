import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProfilesService } from '../services/profiles.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { parseUUIDParam } from '../utils/validation.js';

const listTradersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Username must only contain letters, numbers, and underscores').optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional().nullable(),
  phone: z.string().optional().nullable(),
});

export class ProfilesController {
  static async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Authentication required', 401);
      }
      const profile = await ProfilesService.getMyProfile(req.supabase, req.user.id);
      res.json({ data: profile });
    } catch (err) {
      next(err);
    }
  }

  static async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Authentication required', 401);
      }
      const validated = updateProfileSchema.parse(req.body);
      const updated = await ProfilesService.updateMyProfile(req.supabase, req.user.id, validated);
      res.json({
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTraderProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const id = parseUUIDParam(req.params['id'], 'trader profile id');
      const trader = await ProfilesService.getTraderProfile(req.supabase, id);
      res.json({ data: trader });
    } catch (err) {
      next(err);
    }
  }

  static async getMyTraderProfile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Authentication required', 401);
      }
      const trader = await ProfilesService.getMyTraderProfile(req.supabase, req.user.id);
      res.json({ data: trader });
    } catch (err) {
      next(err);
    }
  }

  static async listTraders(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const { limit, offset } = listTradersQuerySchema.parse(req.query);
      const traders = await ProfilesService.listTraders(req.supabase, limit, offset);
      res.json({ data: traders, count: traders.length });
    } catch (err) {
      next(err);
    }
  }
}
