import { db } from './pool.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '../../../../supabase/migrations/20261106000000_email_verified_activation.sql');

async function run() {
  console.log('📦 Applying email verification activation migration...');
  try {
    const sql = readFileSync(path, 'utf8');
    await db.query(sql);
    console.log('✅ Done: profiles now only activate after email OTP verification');
  } catch (err: any) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally { await db.end(); }
}
run();
