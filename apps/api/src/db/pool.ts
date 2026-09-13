import { Pool } from 'pg';
import { env } from '../config/env.js';

/**
 * PostgreSQL connection pool for direct deterministic database operations.
 * Connects to Supabase PostgreSQL database.
 */
export const db = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production'
    ? { rejectUnauthorized: true }   // Enforce TLS cert verification in production
    : { rejectUnauthorized: false }, // Allow self-signed certs in dev/test (Supabase pooler)
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

db.on('error', (err) => {
  // Log message and code only — never log the full error object which may
  // contain connection string fragments in its stack trace.
  console.error('[DB Pool] Unexpected error on idle client:', {
    message: err.message,
    code: (err as any).code,
  });
});
