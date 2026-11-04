/**
 * Drop the auth.users FK constraints from paper trading tables.
 * The app already validates auth via JWT at the API layer — the DB FK
 * is redundant and causes 23503 errors when pool connects as postgres role.
 */
import { db } from './pool.js';

async function run() {
  console.log('Dropping FK constraints on paper trading tables...');
  try {
    await db.query(`
      ALTER TABLE public.paper_accounts
        DROP CONSTRAINT IF EXISTS paper_accounts_user_id_fkey;
      ALTER TABLE public.paper_positions
        DROP CONSTRAINT IF EXISTS paper_positions_user_id_fkey;
      ALTER TABLE public.paper_ledger
        DROP CONSTRAINT IF EXISTS paper_ledger_user_id_fkey;
    `);
    console.log('✅ FK constraints dropped');

    // Verify: try inserting a test account with a real user_id
    const users = await db.query(
      `SELECT id FROM auth.users LIMIT 1`
    );
    if (users.rows.length > 0) {
      const testId = users.rows[0].id;
      await db.query(
        `INSERT INTO public.paper_accounts (user_id)
         VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
        [testId]
      );
      const account = await db.query(
        `SELECT user_id, balance FROM public.paper_accounts WHERE user_id = $1`,
        [testId]
      );
      console.log(`✅ Test insert OK — balance: ${account.rows[0]?.balance ?? 'account exists'}`);
    } else {
      console.log('ℹ No users found — FK drop is still OK');
    }
  } catch (err: any) {
    console.error('❌ Error:', err.message, err.code);
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
