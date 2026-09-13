import { db } from './pool.js';
import { supabaseAdmin } from './supabase.js';
import { env } from '../config/env.js';

export async function verifyConnections(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log('🔍 Testing Supabase & PostgreSQL connections...');
  console.log(`🌐 Supabase URL: ${env.SUPABASE_URL}`);
  console.log('----------------------------------------------------');

  let allSuccess = true;

  // 1. Direct PostgreSQL query check
  try {
    const startTime = Date.now();
    const res = await db.query('SELECT NOW() as db_time, current_database() as db_name, version() as version');
    const latency = Date.now() - startTime;
    console.log(`✅ [PostgreSQL] Direct connection OK (${latency}ms)`);
    console.log(`   Database: ${res.rows[0].db_name}`);
    console.log(`   Server Time: ${res.rows[0].db_time}`);
  } catch (err: any) {
    allSuccess = false;
    console.error('❌ [PostgreSQL] Connection failed:', err.message);
  }

  // 2. Supabase Admin API check
  try {
    const startTime = Date.now();
    const { error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
    const latency = Date.now() - startTime;
    if (error) throw error;
    console.log(`✅ [Supabase API] Admin client authentication OK (${latency}ms)`);
  } catch (err: any) {
    allSuccess = false;
    console.error('❌ [Supabase API] Admin connection failed:', err.message);
  }

  console.log('----------------------------------------------------');
  if (allSuccess) {
    console.log('🎉 All database and Supabase connections verified successfully!');
  } else {
    console.log('⚠️ Some connection checks failed. Please check your credentials in apps/api/.env');
  }
  console.log('----------------------------------------------------');

  return allSuccess;
}

// Auto-run if executed directly
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('check-connection.ts')) {
  verifyConnections()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal verification error:', err);
      process.exit(1);
    });
}
