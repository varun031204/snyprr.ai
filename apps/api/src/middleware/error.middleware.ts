import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode = 400, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Handle body-parser JSON parse failures (malformed request body).
  // body-parser sets err.type = 'entity.parse.failed' and err.status = 400.
  // Without this branch the error falls through to the 500 catch-all.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body contains invalid JSON',
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation Error',
      message: 'Request input failed validation',
      details: err.flatten(),
    });
  }

  // Handle AppError custom exceptions
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }

  // Handle Supabase / PostgREST errors
  if (err?.code && (err?.message || err?.details)) {
    return res.status(400).json({
      error: 'Database Error',
      code: err.code,
      message: err.message,
      details: err.details || err.hint,
    });
  }

  // Unexpected / unclassified errors.
  if (process.env.NODE_ENV === 'development') {
    console.error('[Unhandled Error]:', err);
  } else {
    console.error('[Unhandled Error]:', {
      message: err?.message ?? 'Unknown error',
      code: err?.code,
      name: err?.name,
    });
  }


  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
}
