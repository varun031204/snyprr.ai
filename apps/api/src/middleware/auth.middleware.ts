import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseForUser } from '../config/supabaseClient.js';
import { db } from '../db/pool.js';

/**
 * Validates the Supabase-issued JWT and attaches an RLS-aware client to the request.
 * Also blocks PENDING_VERIFICATION users — they must verify email first.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid, expired, or revoked access token',
      });
    }

    // Block unverified accounts from accessing protected routes
    // Check email_confirmed_at first (fast, no DB query)
    if (!data.user.email_confirmed_at) {
      return res.status(403).json({
        error: 'Email Not Verified',
        message: 'Please verify your email address before continuing.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Also check profile account_status for suspended/blocked accounts
    try {
      const profile = await db.query(
        `SELECT account_status FROM public.profiles WHERE id = $1 LIMIT 1`,
        [data.user.id]
      );
      const status = profile.rows[0]?.account_status;
      if (status === 'PENDING_VERIFICATION') {
        return res.status(403).json({
          error: 'Account Not Activated',
          message: 'Your account is pending email verification.',
          code: 'PENDING_VERIFICATION',
        });
      }
      if (status === 'SUSPENDED' || status === 'BLOCKED') {
        return res.status(403).json({
          error: 'Account Suspended',
          message: 'Your account has been suspended. Please contact support.',
          code: status,
        });
      }
    } catch {
      // Profile check failed — non-fatal, continue (profile may not exist yet)
    }

    req.user = data.user;
    req.token = token;
    req.supabase = supabaseForUser(token);
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication verification failed',
      details: err.message,
    });
  }
}

/**
 * Optional authentication: attaches req.user and req.supabase if token is provided,
 * otherwise sets anonymous req.supabase client.
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const { data } = await supabaseAdmin.auth.getUser(token);
      if (data?.user) {
        req.user = data.user;
        req.token = token;
        req.supabase = supabaseForUser(token);
        return next();
      }
    } catch {
      // Fallback to anonymous
    }
  }

  req.supabase = supabaseForUser('');
  next();
}
