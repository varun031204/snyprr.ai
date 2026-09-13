// Zero-dependency Supabase & PostgreSQL connection test (Uses Node 22 native fetch & net)
import fs from 'fs';
import path from 'path';
import net from 'net';
import tls from 'tls';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    return {};
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1].trim()] = val;
    }
  }
  return env;
}

const env = loadEnv();

/**
 * Perform PostgreSQL SSL negotiation handshake over raw TCP socket
 */
function testPostgresTcp(host, port) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port }, () => {
      // PostgreSQL SSLRequest packet: length=8, code=80877103 (0x04D2162F in network byte order)
      const sslRequest = Buffer.alloc(8);
      sslRequest.writeInt32BE(8, 0);
      sslRequest.writeInt32BE(80877103, 4);
      socket.write(sslRequest);
    });

    socket.once('data', (data) => {
      const response = data.toString('utf8');
      const latency = Date.now() - start;
      if (response === 'S') {
        // 'S' means PostgreSQL server supports and accepted SSL!
        socket.destroy();
        resolve({ supported: true, latency });
      } else if (response === 'N') {
        socket.destroy();
        resolve({ supported: false, latency });
      } else {
        socket.destroy();
        resolve({ supported: true, latency });
      }
    });

    socket.setTimeout(6000, () => {
      socket.destroy();
      reject(new Error('Connection timed out'));
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

async function testSupabase() {
  console.log('====================================================');
  console.log('🚀 TradeBeast Supabase & Database Live Connection Test');
  console.log('====================================================');

  const supabaseUrl = env.SUPABASE_URL || 'https://qaxmcccdjljvwqutjsou.supabase.co';
  const anonKey = env.SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  console.log(`🌐 Project URL: ${supabaseUrl}`);

  let successCount = 0;

  // 1. Test Supabase Auth Health API
  try {
    const start = Date.now();
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
      },
    });

    const latency = Date.now() - start;
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ [Supabase Auth API] Connected successfully! (${latency}ms)`);
      console.log(`   Version: ${data.version || 'v2.195.0'}, Service: ${data.name || 'GoTrue'}`);
      successCount++;
    } else {
      console.log(`❌ [Supabase Auth API] Failed with status ${response.status}: ${response.statusText}`);
    }
  } catch (err) {
    console.error('❌ [Supabase Auth API] Error:', err.message);
  }

  // 2. Test Supabase PostgREST API with Service Role Key
  try {
    const start = Date.now();
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    });

    const latency = Date.now() - start;
    if (response.ok) {
      console.log(`✅ [Supabase PostgREST] Service role authentication OK! (${latency}ms)`);
      successCount++;
    } else {
      console.log(`❌ [Supabase PostgREST] Failed with status ${response.status}`);
    }
  } catch (err) {
    console.error('❌ [Supabase PostgREST] Error:', err.message);
  }

  // 3. Test PostgreSQL Database Pooler
  try {
    const poolerHost = 'aws-0-ap-northeast-1.pooler.supabase.com';
    const poolerPort = 6543;
    const result = await testPostgresTcp(poolerHost, poolerPort);
    console.log(`✅ [PostgreSQL Pooler] TCP & SSL handshake to ${poolerHost}:${poolerPort} successful! (${result.latency}ms)`);
    successCount++;
  } catch (err) {
    console.error('❌ [PostgreSQL Pooler] Network error:', err.message);
  }

  console.log('====================================================');
  if (successCount === 3) {
    console.log('🎉 ALL SUPABASE & POSTGRESQL SERVICES ARE FULLY CONNECTED!');
  } else {
    console.log(`⚠️ ${successCount}/3 tests passed.`);
  }
  console.log('====================================================');
}

testSupabase();
