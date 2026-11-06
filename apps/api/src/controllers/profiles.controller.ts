import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ProfilesService } from '../services/profiles.service.js';
import { AppError } from '../middleware/error.middleware.js';
import { parseUUIDParam } from '../utils/validation.js';
import { supabaseAdmin } from '../config/supabaseClient.js';

// Common weak/compromised passwords to reject
const WEAK_PASSWORDS = new Set([
  'password', 'password1', 'password123', 'Password1', 'Password1!',
  '12345678', '123456789', 'qwerty123', 'iloveyou1', 'admin1234',
  'letmein1', 'welcome1', 'monkey123', 'dragon123', 'master123',
]);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

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

  /**
   * POST /api/profiles/me/password
   *
   * Securely change the authenticated user's password.
   *
   * Security steps:
   *  1. Validate schema (length, complexity, not same as current)
   *  2. Reject known weak passwords
   *  3. Re-authenticate with current password to verify identity
   *  4. Update via Supabase Admin API (bcrypt internally, never stores plain text)
   *  5. Return generic error messages to prevent info leakage
   */
  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);

      // 1. Validate body
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // 2. New must differ from current
      if (currentPassword === newPassword) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'New password must be different from your current password.',
        });
      }

      // 3. Reject weak/compromised passwords
      if (WEAK_PASSWORDS.has(newPassword)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'This password is too common. Please choose a stronger password.',
        });
      }

      // 4. Verify current password by re-authenticating
      //    Use the user's email from the Supabase user object
      const userEmail = req.user.email;
      if (!userEmail) {
        throw new AppError('Cannot verify identity — no email on account', 400);
      }

      const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        // Return a generic message to avoid confirming which field is wrong
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Current password is incorrect.',
        });
      }

      // 5. Update password via Admin API (Supabase handles bcrypt hashing)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        req.user.id,
        { password: newPassword }
      );

      if (updateError) {
        // Log internally but return a generic error to the client
        console.error('[changePassword] Admin updateUserById error:', updateError.message);
        throw new AppError('Failed to update password. Please try again.', 500);
      }

      // 6. Success — do NOT log the new password anywhere
      res.json({
        message: 'Password changed successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
