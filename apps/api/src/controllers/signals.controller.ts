import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { SignalsService } from '../services/signals.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { parseUUIDParam } from '../utils/validation.js';

const createSignalSchema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  instrument: z.string().min(1, 'Instrument is required'),
  entry_price: z.number().positive('Entry price must be positive').optional().nullable(),
  stop_loss_price: z.number().positive('Stop loss price must be positive'),
  take_profit_1: z.number().positive('Take profit 1 must be positive'),
  take_profit_2: z.number().positive().optional().nullable(),
  take_profit_3: z.number().positive().optional().nullable(),
  time_frame: z.string().min(1, 'Time frame is required'),
  buying_wall: z.number().positive('Buying wall must be positive'),
  selling_wall: z.number().positive('Selling wall must be positive'),
  analysis: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
});

// Status transitions are intentionally excluded from this schema.
// Status must only change through dedicated action endpoints:
//   POST /:id/publish  → PUBLISHED
//   POST /:id/cancel   → CANCELLED
// .strict() causes Zod to reject any unrecognised keys (including "status")
// with a 422, making the prohibition explicit rather than silently stripping it.
const updateSignalSchema = z.object({
  entry_price: z.number().positive().optional().nullable(),
  stop_loss_price: z.number().positive().optional(),
  take_profit_1: z.number().positive().optional(),
  take_profit_2: z.number().positive().optional().nullable(),
  take_profit_3: z.number().positive().optional().nullable(),
  buying_wall: z.number().positive().optional(),
  selling_wall: z.number().positive().optional(),
  analysis: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).strict();

const listSignalsQuerySchema = z.object({
  status: z.enum([
    'DRAFT',
    'PUBLISHED',
    'ACTIVE',
    'PARTIALLY_COMPLETED',
    'COMPLETED',
    'STOP_LOSS_HIT',
    'CANCELLED',
    'EXPIRED',
    'INVALIDATED',
  ]).optional(),
  trader_id: z.string().uuid().optional(),
  direction: z.enum(['LONG', 'SHORT']).optional(),
  instrument: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export class SignalsController {
  static async listSignals(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const filters = listSignalsQuerySchema.parse(req.query);
      const signals = await SignalsService.listSignals(req.supabase, filters);
      res.json({
        data: signals,
        count: signals.length,
        limit: filters.limit,
        offset: filters.offset,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSignalById(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const id = parseUUIDParam(req.params['id'], 'signal id');
      const signal = await SignalsService.getSignalById(req.supabase, id);

      // Increment view count (fire-and-forget, non-blocking)
      SignalsService.incrementViews(req.supabase, id).catch(() => {/* silent */});

      res.json({ data: signal });
    } catch (err) {
      next(err);
    }
  }

  static async createSignal(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase || !req.user) {
        throw new AppError('Database client unavailable', 500);
      }
      const validated = createSignalSchema.parse(req.body);

      // Resolve trader_profiles.id from the authenticated user's auth.users.id
      const { data: traderProfile, error: tpError } = await req.supabase
        .from('trader_profiles')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle();

      if (tpError || !traderProfile) {
        throw new AppError('Trader profile not found for this account. Contact admin to assign trader role.', 404);
      }

      const signal = await SignalsService.createSignal(req.supabase, {
        ...validated,
        trader_id: traderProfile.id,
      });
      res.status(201).json({
        message: `Signal created with status: ${validated.status ?? 'DRAFT'}`,
        data: signal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSignal(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const id = parseUUIDParam(req.params['id'], 'signal id');
      const validated = updateSignalSchema.parse(req.body);
      const signal = await SignalsService.updateSignal(req.supabase, id, validated);
      res.json({
        message: 'Signal updated successfully',
        data: signal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async publishSignal(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const id = parseUUIDParam(req.params['id'], 'signal id');
      const signal = await SignalsService.publishSignal(req.supabase, id);
      res.json({
        message: 'Signal published successfully to subscribers',
        data: signal,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelSignal(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.supabase) {
        throw new AppError('Database client unavailable', 500);
      }
      const id = parseUUIDParam(req.params['id'], 'signal id');
      const signal = await SignalsService.cancelSignal(req.supabase, id);
      res.json({
        message: 'Signal cancelled successfully',
        data: signal,
      });
    } catch (err) {
      next(err);
    }
  }
}
