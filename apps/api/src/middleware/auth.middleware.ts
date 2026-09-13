import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, supabaseForUser } from '../config/supabaseClient.js';

/**
 * Validates the Supabase-issued JWT and attaches an RLS-aware client to the request.
 * Any route protected with requireAuth will have req.user and req.supabase available.
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
