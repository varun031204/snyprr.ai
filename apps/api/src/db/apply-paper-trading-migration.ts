/**
 * Apply the paper trading migration to the live Supabase database.
 * Idempotent — uses IF NOT EXISTS so it can be re-run safely.
 */
import { db } from './pool.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// From apps/api/src/db/ → repo root is 4 levels up
const migrationPath = join(__dirname, '../../../../supabase/migrations/20261018000000_paper_trading_engine.sql');

async function applyMigration() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦  Applying paper trading migration...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const sql = readFileSync(migrationPath, 'utf8');
  console.log(`📄 Migration file: ${migrationPath}`);
  console.log(`📏 Size: ${(sql.length / 1024).toFixed(2)} KB`);

  try {
    await db.query(sql);
    console.log('✅ Migration applied successfully');

    // Verify tables exist
    const tables = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('paper_accounts','paper_positions','paper_ledger')
      ORDER BY table_name;
    `);
    console.log('📊 Verified tables:');
    for (const row of tables.rows) console.log(`   ✓ ${row.table_name}`);

    // Verify functions
    const fns = await db.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('get_or_create_paper_account','open_paper_position','close_paper_position','reset_paper_account')
      ORDER BY routine_name;
    `);
    console.log('⚙️  Verified functions:');
    for (const row of fns.rows) console.log(`   ✓ ${row.routine_name}`);

    // Verify RLS policies
    const policies = await db.query(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('paper_accounts','paper_positions','paper_ledger')
      ORDER BY policyname;
    `);
    console.log(`🔒 RLS policies: ${policies.rows.length} created`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉  Paper trading engine ready for use');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    if (err.position) console.error('   Position:', err.position);
    process.exit(1);
  } finally {
    await db.end();
  }
}

applyMigration();
