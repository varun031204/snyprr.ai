import { db } from './pool.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(__dirname, '../../../../supabase/migrations/20261018100000_phone_otp.sql');

async function run() {
  console.log('📦 Applying phone OTP migration...');
  const sql = readFileSync(migrationPath, 'utf8');
  try {
    await db.query(sql);
    console.log('✅ phone_otp_requests table created');
    const t = await db.query(`SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='phone_otp_requests'`);
    console.log('✓ Table verified:', t.rows[0].count === '1' ? 'exists' : 'missing');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally { await db.end(); }
}
run();
