import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseClient.js';

/**
 * Role-guard middleware that checks if the authenticated user has the specified role.
 * Invokes the PostgreSQL has_role() function defined in the database.
 *
 * Uses `data !== true` rather than `!data` so that a false-y but non-boolean
 * return value (e.g. null, 0) is handled explicitly rather than by coercion.
 */
export function requireRole(role: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking roles',
      });
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('has_role', {
        _user_id: req.user.id,
        _role_name: role,
      });

      if (error || data !== true) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to evaluate role authorization',
        details: err.message,
      });
    }
  };
}

/**
 * Checks if the authenticated user has at least one of the specified roles.
 */
export function requireAnyRole(roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking roles',
      });
    }

    try {
      for (const role of roles) {
        const { data } = await supabaseAdmin.rpc('has_role', {
          _user_id: req.user.id,
          _role_name: role,
        });

        if (data === true) {
          return next();
        }
      }

      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to access this resource',
      });
    } catch (err: any) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to evaluate role authorizations',
        details: err.message,
      });
    }
  };
}

/**
 * Permission-guard middleware checking granular permission via has_permission() RPC.
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before checking permissions',
      });
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('has_permission', {
        _user_id: req.user.id,
        _permission_name: permission,
      });

      if (error || data !== true) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (err: any) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to evaluate permission authorization',
        details: err.message,
      });
    }
  };
}
