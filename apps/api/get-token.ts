/**
 * get-token.ts — Local development helper
 *
 * Signs in an existing Supabase user with email + password using the
 * PUBLIC anon key only. Prints the access_token so you can use it for
 * manual API testing against http://localhost:4000
 *
 * Usage:
 *   npx tsx get-token.ts <email> <password>
 *
 * Example:
 *   npx tsx get-token.ts alice@example.com MyPassword123!
 *
 * This script does NOT use or expose the service-role key.
 * It is safe to run locally. Do NOT commit real passwords to version control.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const email    = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('\nUsage: npx tsx get-token.ts <email> <password>\n');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!  // public key only — safe to use in dev scripts
);

console.log(`\nSigning in as: ${email}`);

const { data, error } = await supabase.auth.signInWithPassword({ email, password });

if (error || !data.session) {
  console.error(`\n❌ Sign-in failed: ${error?.message ?? 'No session returned'}`);
  console.error('   Check your email and password, and confirm the user exists in Supabase.\n');
  process.exit(1);
}

const { access_token, token_type, expires_in } = data.session;
const user = data.user;

console.log('\n✅ Sign-in successful!\n');
console.log('─'.repeat(60));
console.log(`User ID    : ${user.id}`);
console.log(`Email      : ${user.email}`);
console.log(`Token type : ${token_type}`);
console.log(`Expires in : ${expires_in}s (${Math.round(expires_in / 60)} min)`);
console.log('─'.repeat(60));

console.log('\n📋 ACCESS TOKEN (copy this):\n');
console.log(access_token);

console.log('\n─'.repeat(60));
console.log('\n🧪 Ready-to-run curl commands:\n');

const API = 'http://localhost:4000';
console.log('# GET /api/profiles/me');
console.log(`curl -s "${API}/api/profiles/me" \\`);
console.log(`  -H "Authorization: Bearer ${access_token}" | npx prettier --parser json\n`);

console.log('# GET /api/signals');
console.log(`curl -s "${API}/api/signals" \\`);
console.log(`  -H "Authorization: Bearer ${access_token}" | npx prettier --parser json\n`);

console.log('# GET /api/subscriptions/me');
console.log(`curl -s "${API}/api/subscriptions/me" \\`);
console.log(`  -H "Authorization: Bearer ${access_token}" | npx prettier --parser json\n`);

console.log('─'.repeat(60));
console.log('\n💡 To use in PowerShell, set the token as a variable:\n');
console.log(`$TOKEN = "${access_token}"`);
console.log(`Invoke-RestMethod "${API}/api/profiles/me" -Headers @{ Authorization = "Bearer $TOKEN" }`);
console.log(`Invoke-RestMethod "${API}/api/subscriptions/me" -Headers @{ Authorization = "Bearer $TOKEN" }`);
console.log('');
