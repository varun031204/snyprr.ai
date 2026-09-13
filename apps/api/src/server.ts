import { app } from './app.js';
import { env } from './config/env.js';
import { db } from './db/pool.js';

const PORT = env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 TradeBeast Phase 2 API Server Running on Port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔌 Database Status: http://localhost:${PORT}/health/db`);
  console.log(`📡 Supabase Endpoint: ${env.SUPABASE_URL}`);
  console.log('====================================================');
});

// ── Graceful shutdown ──────────────────────────────────────────────────────
const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('🔌 Closing PostgreSQL pool connections...');
    await db.end();
    console.log('✅ Server terminated cleanly.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT',  () => handleShutdown('SIGINT'));

// ── Global error safety nets ───────────────────────────────────────────────
// An unhandled rejection or uncaught exception outside the Express request
// cycle (e.g. in a background timer, event emitter, or pool callback) would
// otherwise silently crash the process in Node 18+ with no log.
// Log the error details (message + code only — no stack traces in production)
// then exit so the process manager can restart cleanly.

process.on('unhandledRejection', (reason: unknown) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  const code = (reason as any)?.code;
  console.error('[Fatal] Unhandled promise rejection:', { message: msg, code });
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Fatal] Uncaught exception:', { message: err.message, code: (err as any).code });
  process.exit(1);
});
