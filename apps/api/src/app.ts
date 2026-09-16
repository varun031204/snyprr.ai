import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { db } from './db/pool.js';
import { supabaseAdmin } from './config/supabaseClient.js';
import { errorHandler } from './middleware/error.middleware.js';

import signalsRouter from './routes/signals.routes.js';
import profilesRouter from './routes/profiles.routes.js';
import subscriptionsRouter from './routes/subscriptions.routes.js';
import adminRouter from './routes/admin.routes.js';
import chatRouter from './routes/chat.routes.js';

export const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Explicit 50 kb body size limit — prevents large-payload DoS attempts.
// The Express default is 100 kb; being explicit makes the limit visible and reviewable.
app.use(express.json({ limit: '50kb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Rate limiting ──────────────────────────────────────────────────────────
// Global limiter: 200 requests per minute per IP across all routes.
// Keeps the Supabase auth API quota safe and limits brute-force attempts.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 200,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please slow down and try again in a moment.',
  },
  skip: () => env.NODE_ENV === 'test', // Bypass in test environment
});

// Tighter limiter on auth-touching routes that call Supabase auth on every request.
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many authentication attempts. Please wait a moment.',
  },
  skip: () => env.NODE_ENV === 'test',
});

app.use(globalLimiter);

// Apply the tighter auth limiter to all /api routes (every /api route runs requireAuth
// which calls supabaseAdmin.auth.getUser on every request).
app.use('/api', authLimiter);

// 1. Basic Health Endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'tradebeast-backend-api',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 2. Comprehensive DB / Supabase live connectivity health check
app.get('/health/db', async (_req, res) => {
  try {
    const dbStart = Date.now();
    const dbRes = await db.query('SELECT NOW() as db_time');
    const dbLatency = Date.now() - dbStart;

    const sbStart = Date.now();
    const { error: sbError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const sbLatency = Date.now() - sbStart;

    if (sbError) {
      return res.status(500).json({
        status: 'error',
        postgres: { status: 'healthy', latencyMs: dbLatency, time: dbRes.rows[0].db_time },
        supabase: { status: 'error', error: sbError.message },
      });
    }

    res.json({
      status: 'healthy',
      postgres: {
        status: 'connected',
        latencyMs: dbLatency,
        serverTime: dbRes.rows[0].db_time,
      },
      supabase: {
        status: 'connected',
        latencyMs: sbLatency,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});

// Mount domain routes
app.use('/api/signals', signalsRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chat', chatRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested API endpoint does not exist',
  });
});

// Global Error Handler
app.use(errorHandler);
