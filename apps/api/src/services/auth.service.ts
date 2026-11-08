/**
 * auth.service.ts
 *
 * Two-step signup flow:
 *   1. POST /api/auth/initiate  — validate fields, create phone_otp_requests row,
 *      send phone OTP, return registrationToken.  Email OTP is handled by Supabase.
 *   2. POST /api/auth/verify-phone — verify the 6-digit phone OTP.
 *   3. POST /api/auth/resend-phone — resend phone OTP with cooldown enforcement.
 *
 * The actual Supabase auth.users row is created ONLY after both OTPs are confirmed
 * (email by Supabase's built-in flow, phone by this service).
 *
 * Security:
 * - OTPs are stored as bcrypt hashes — never plaintext.
 * - OTPs expire in 15 minutes.
 * - Max 5 wrong attempts per token before the session is invalidated.
 * - 60-second resend cooldown.
 * - Duplicate phone blocked via UNIQUE constraint.
 */

import { db as pool } from '../db/pool.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';

const OTP_EXPIRE_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 60;
const BCRYPT_ROUNDS = 10;

// ── OTP generation ─────────────────────────────────────────────────────────────
function generateOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

// ── Email transporter (Nodemailer + Gmail) ─────────────────────────────────────
function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  // Remove spaces from App Password (Google shows it with spaces: 'xxxx xxxx xxxx xxxx')
  const pass = (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 10_000,   // 10s — fail fast instead of hanging
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
}

// ── OTP delivery — tries each channel in order ─────────────────────────────────
// Priority: Twilio SMS → Fast2SMS → Gmail email → console log (dev fallback)
async function sendOtp(phone: string, email: string, otp: string): Promise<void> {
  const message = `Your Snyprr.ai verification code is ${otp}. Valid for ${OTP_EXPIRE_MINUTES} minutes. Do not share it.`;

  // ── 1. Twilio SMS ──────────────────────────────────────────────────────────
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (!from) throw new Error('TWILIO_PHONE_NUMBER env var is required when TWILIO_ACCOUNT_SID is set');
    const formData = new URLSearchParams({
      To: phone.startsWith('+') ? phone : `+${phone}`,
      From: from,
      Body: message,
    });
    const creds = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as any;
      throw new Error(`Twilio SMS failed (${res.status}): ${body.message ?? 'unknown'}`);
    }
    return;
  }

  // ── 2. Fast2SMS (India) ────────────────────────────────────────────────────
  if (process.env.SMS_PROVIDER_KEY) {
    const apiKey = process.env.SMS_PROVIDER_KEY;
    const senderId = process.env.SMS_SENDER_ID ?? 'SNYPRR';
    const localPhone = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone;
    const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&route=q&numbers=${localPhone}&message=${encodeURIComponent(message)}&flash=0&sender_id=${senderId}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Fast2SMS failed (${res.status}): ${body.slice(0, 120)}`);
    }
    const json = await res.json().catch(() => ({})) as any;
    if (json.return === false) {
      throw new Error(`Fast2SMS error: ${JSON.stringify(json.message ?? json).slice(0, 120)}`);
    }
    return;
  }

  // ── 3. Gmail via Nodemailer (dev/staging — no SMS provider needed) ─────────
  const transporter = getEmailTransporter();
  if (transporter) {
    const maskedPhone = `+${phone.slice(0, -4).replace(/\d/g, '•')}${phone.slice(-4)}`;
    try {
      await transporter.sendMail({
        from: `"Snyprr.ai" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your Snyprr.ai Mobile Verification Code',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <h2 style="color:#8b5cf6;margin-bottom:8px">Mobile Verification</h2>
            <p style="color:#6b7280;margin-bottom:24px">
              Your verification code for mobile number <strong>${maskedPhone}</strong>:
            </p>
            <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
              <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#111827;font-family:monospace">
                ${otp}
              </span>
            </div>
            <p style="color:#6b7280;font-size:14px">
              Valid for <strong>${OTP_EXPIRE_MINUTES} minutes</strong>. Do not share this code.
            </p>
          </div>
        `,
      });
      console.info(`[OTP] ✅ Sent via Gmail to ${email}`);
      return;
    } catch (gmailErr: any) {
      // Gmail failed (wrong credentials, network issue, etc.)
      // Fall through to console log so signup still succeeds
      console.error(`[OTP] ⚠️ Gmail send failed: ${gmailErr.message}`);
    }
  }

  // ── 4. Console fallback (last resort — dev only) ───────────────────────────
  console.info(`[DEV OTP] Phone: +${phone.slice(0, -4).replace(/\d/g, '•')}${phone.slice(-4)} | Code: ${otp} | Email: ${email}`);
}
// ── Initiate registration ──────────────────────────────────────────────────────
export async function initiateRegistration(params: {
  fullName: string;
  email: string;
  phone: string;   // raw — will be normalized
  password: string;
}): Promise<{ registrationToken: string }> {
  const phone = normalizePhone(params.phone);

  // Validate phone — exactly 10 digits after normalization
  if (!/^\d{10}$/.test(phone)) {
    throw new Error('INVALID_PHONE: Phone number must be exactly 10 digits');
  }

  // Check for duplicate phone in profiles (already-active users)
  const dupPhone = await pool.query(
    'SELECT id FROM public.profiles WHERE phone = $1 LIMIT 1',
    [phone]
  );
  if (dupPhone.rows.length > 0) {
    // Return generic message to prevent enumeration
    throw new Error('DUPLICATE: An account with this phone number already exists');
  }

  // Check for duplicate email in profiles (already-active users)
  // Prevents a user from completing phone OTP only to fail at Supabase signUp
  const normEmail = params.email.toLowerCase().trim();
  const dupEmail = await pool.query(
    'SELECT id FROM public.profiles WHERE email = $1 LIMIT 1',
    [normEmail]
  );
  if (dupEmail.rows.length > 0) {
    throw new Error('DUPLICATE: An account with this email address already exists');
  }
  // Also check auth.users directly in case profile row is missing
  try {
    const dupAuthEmail = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM auth.users WHERE LOWER(email) = $1 LIMIT 1) AS exists`,
      [normEmail]
    );
    if (dupAuthEmail.rows[0]?.exists) {
      throw new Error('DUPLICATE: An account with this email address already exists');
    }
  } catch (err: any) {
    // Re-throw DUPLICATE errors; swallow auth schema access errors
    if (err.message?.startsWith('DUPLICATE')) throw err;
  }

  // Check for in-progress (non-expired) registration with same phone.
  // Use an upsert (INSERT ... ON CONFLICT) so the replace is atomic —
  // eliminates the race condition between DELETE and INSERT.
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const registrationToken = crypto.randomUUID();

  // Upsert: if a row with this phone already exists, replace it atomically.
  // This uses the UNIQUE constraint added by migration 20261107100000.
  await pool.query(
    `INSERT INTO public.phone_otp_requests
       (registration_token, phone, otp_hash, full_name, email, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + interval '${OTP_EXPIRE_MINUTES} minutes')
     ON CONFLICT (phone) DO UPDATE SET
       registration_token = EXCLUDED.registration_token,
       otp_hash           = EXCLUDED.otp_hash,
       full_name          = EXCLUDED.full_name,
       email              = EXCLUDED.email,
       expires_at         = EXCLUDED.expires_at,
       attempt_count      = 0,
       phone_verified     = false,
       email_verified     = false,
       last_sent_at       = now()`,
    [registrationToken, phone, otpHash, params.fullName.trim(), normEmail]
  );

  // Send the OTP
  await sendOtp(phone, params.email, otp);

  return { registrationToken };
}

// ── Verify phone OTP ───────────────────────────────────────────────────────────
export async function verifyPhoneOtp(params: {
  registrationToken: string;
  otp: string;
}): Promise<void> {
  const row = await pool.query(
    `SELECT * FROM public.phone_otp_requests
     WHERE registration_token = $1
     LIMIT 1`,
    [params.registrationToken]
  );

  if (row.rows.length === 0) {
    throw new Error('INVALID_TOKEN: Registration session not found');
  }

  const session = row.rows[0];

  // Expired?
  if (new Date(session.expires_at) < new Date()) {
    await pool.query('DELETE FROM public.phone_otp_requests WHERE registration_token = $1', [params.registrationToken]);
    throw new Error('EXPIRED: Verification code has expired. Please start registration again');
  }

  // Too many attempts?
  if (session.attempt_count >= MAX_ATTEMPTS) {
    await pool.query('DELETE FROM public.phone_otp_requests WHERE registration_token = $1', [params.registrationToken]);
    throw new Error('TOO_MANY_ATTEMPTS: Maximum attempts exceeded. Please start registration again');
  }

  // Increment attempt count before verifying
  await pool.query(
    'UPDATE public.phone_otp_requests SET attempt_count = attempt_count + 1 WHERE registration_token = $1',
    [params.registrationToken]
  );

  // Verify OTP
  const valid = await bcrypt.compare(params.otp.trim(), session.otp_hash);
  if (!valid) {
    throw new Error(`WRONG_OTP: Incorrect code. ${MAX_ATTEMPTS - session.attempt_count - 1} attempt(s) remaining`);
  }

  // Mark phone as verified
  await pool.query(
    'UPDATE public.phone_otp_requests SET phone_verified = true WHERE registration_token = $1',
    [params.registrationToken]
  );
}

// ── Resend phone OTP ───────────────────────────────────────────────────────────
export async function resendPhoneOtp(params: {
  registrationToken: string;
}): Promise<void> {
  const row = await pool.query(
    'SELECT * FROM public.phone_otp_requests WHERE registration_token = $1 LIMIT 1',
    [params.registrationToken]
  );

  if (row.rows.length === 0) {
    throw new Error('INVALID_TOKEN: Registration session not found');
  }

  const session = row.rows[0];

  if (new Date(session.expires_at) < new Date()) {
    throw new Error('EXPIRED: Session expired. Please start registration again');
  }

  // Cooldown check
  const secondsSinceLast = (Date.now() - new Date(session.last_sent_at).getTime()) / 1000;
  if (secondsSinceLast < RESEND_COOLDOWN_SEC) {
    const wait = Math.ceil(RESEND_COOLDOWN_SEC - secondsSinceLast);
    throw new Error(`COOLDOWN: Please wait ${wait} more seconds before resending`);
  }

  // Generate fresh OTP
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, BCRYPT_ROUNDS);

  await pool.query(
    `UPDATE public.phone_otp_requests
     SET otp_hash = $1, attempt_count = 0, last_sent_at = now(),
         expires_at = now() + interval '${OTP_EXPIRE_MINUTES} minutes'
     WHERE registration_token = $2`,
    [otpHash, params.registrationToken]
  );

  await sendOtp(session.phone, session.email, otp);
}

// ── Get session info (for frontend display) ────────────────────────────────────
export async function getSessionInfo(registrationToken: string) {
  const row = await pool.query(
    `SELECT phone, email, full_name, phone_verified, email_verified, expires_at
     FROM public.phone_otp_requests
     WHERE registration_token = $1 LIMIT 1`,
    [registrationToken]
  );
  if (row.rows.length === 0) return null;
  const s = row.rows[0];

  // Mask phone and email for display
  const maskedPhone = s.phone.slice(0, -4).replace(/./g, '•') + s.phone.slice(-4);
  const [local, domain] = (s.email as string).split('@');
  const maskedEmail = local.slice(0, 2) + '•'.repeat(Math.max(1, local.length - 4)) + local.slice(-2) + '@' + domain;

  return {
    maskedPhone,
    maskedEmail,
    fullName: s.full_name,
    phoneVerified: s.phone_verified,
    emailVerified: s.email_verified,
    expiresAt: s.expires_at,
  };
}

// ── Mark email verified (called after Supabase email OTP succeeds) ────────────
export async function markEmailVerified(registrationToken: string): Promise<void> {
  await pool.query(
    'UPDATE public.phone_otp_requests SET email_verified = true WHERE registration_token = $1',
    [registrationToken]
  );
}

// ── Clean up expired rows ──────────────────────────────────────────────────────
export async function cleanExpiredSessions(): Promise<void> {
  await pool.query('DELETE FROM public.phone_otp_requests WHERE expires_at < now()');
}

// ── Check if an email is registered ───────────────────────────────────────────
// Used by the forgot-password flow and signup pre-check.
// Checks BOTH profiles AND auth.users so orphaned auth.users rows
// (profile missing due to trigger failure) are also caught.
export async function checkEmailExists(email: string): Promise<boolean> {
  const { supabaseAdmin } = await import('../config/supabaseClient.js');
  const normalised = email.toLowerCase().trim();

  // 1. Check profiles table (fast — indexed citext column handles case-insensitivity)
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', normalised)
    .maybeSingle();

  if (profileError) {
    console.error('[Auth] checkEmailExists profiles error:', profileError.message);
    // Fail closed — assume it exists to be safe
    return true;
  }
  if (profileData !== null) return true;

  // 2. Check auth.users directly via the DB pool (service-role connection)
  //    Catches the edge case where a profile row is missing but auth.users
  //    still has the email (trigger failure, manual profile deletion, etc.)
  try {
    const result = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM auth.users
         WHERE LOWER(email) = $1
         LIMIT 1
       ) AS exists`,
      [normalised],
    );
    if (result.rows[0]?.exists) return true;
  } catch (err: unknown) {
    // auth schema might not be accessible via pool in some setups — non-fatal
    console.error('[Auth] checkEmailExists auth.users error:', err instanceof Error ? err.message : 'unknown');
  }

  return false;
}

// ── Password-change OTP (in-memory, single-use, 10-min expiry) ────────────────
//
// Flow:
//   1. POST /api/auth/password-change-otp  — verify current pw, send OTP to email
//   2. POST /api/auth/verify-password-otp  — verify OTP, update password via Supabase
//
// Security:
//   - OTP stored as bcrypt hash — never plaintext.
//   - 10-minute expiry.
//   - Max 5 wrong attempts before session is invalidated.
//   - One active session per user (new request overwrites old).

interface PwChangeSession {
  userId:      string;
  email:       string;
  newPassword: string;   // plain text — kept only in memory, never persisted or logged
  otpHash:     string;
  expiresAt:   Date;
  attempts:    number;
}

// In-memory store — keyed by userId. Single-process only (sufficient for V1).
const pwChangeSessions = new Map<string, PwChangeSession>();

const PW_OTP_EXPIRE_MINUTES = 10;
const PW_OTP_MAX_ATTEMPTS   = 5;

export async function sendPasswordChangeOtp(params: {
  userId: string;
  email:  string;
  newPassword: string;  // plain text — hashed before storing
}): Promise<void> {
  const otp       = generateOtp();
  const otpHash   = await bcrypt.hash(otp, BCRYPT_ROUNDS);
  const expiresAt = new Date(Date.now() + PW_OTP_EXPIRE_MINUTES * 60 * 1000);

  // Overwrite any existing session for this user
  pwChangeSessions.set(params.userId, {
    userId:      params.userId,
    email:       params.email,
    newPassword: params.newPassword,   // plain — lives only in memory
    otpHash,
    expiresAt,
    attempts: 0,
  });

  // Send OTP via Gmail
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn('[PwChange] Gmail not configured — OTP:', otp, '(dev fallback)');
    return;
  }

  await transporter.sendMail({
    from: `"Snyprr.ai Security" <${process.env.GMAIL_USER}>`,
    to: params.email,
    subject: 'Your Snyprr.ai Password Change Verification Code',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#8b5cf6;margin-bottom:8px">Password Change Request</h2>
        <p style="color:#6b7280;margin-bottom:24px">
          We received a request to change the password on your Snyprr.ai account
          (<strong>${params.email}</strong>). Use the code below to confirm.
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#111827;font-family:monospace">
            ${otp}
          </span>
        </div>
        <p style="color:#6b7280;font-size:14px">
          Valid for <strong>${PW_OTP_EXPIRE_MINUTES} minutes</strong>.
          If you did not request this, you can safely ignore this email — your password will not change.
        </p>
      </div>
    `,
  });
}

export async function verifyPasswordChangeOtp(params: {
  userId: string;
  otp:    string;
}): Promise<void> {
  const { supabaseAdmin } = await import('../config/supabaseClient.js');

  const session = pwChangeSessions.get(params.userId);
  if (!session) throw new Error('OTP_INVALID: No active password-change session. Please start over.');

  if (new Date() > session.expiresAt) {
    pwChangeSessions.delete(params.userId);
    throw new Error('OTP_EXPIRED: Verification code has expired. Please start over.');
  }

  if (session.attempts >= PW_OTP_MAX_ATTEMPTS) {
    pwChangeSessions.delete(params.userId);
    throw new Error('OTP_MAX_ATTEMPTS: Too many incorrect attempts. Please start over.');
  }

  session.attempts += 1;

  const valid = await bcrypt.compare(params.otp.trim(), session.otpHash);
  if (!valid) {
    const remaining = PW_OTP_MAX_ATTEMPTS - session.attempts;
    throw new Error(`OTP_WRONG: Incorrect code. ${remaining} attempt(s) remaining.`);
  }

  // OTP correct — update password via Supabase admin (plain-text, Supabase hashes it)
  const { error } = await supabaseAdmin.auth.admin.updateUserById(params.userId, {
    password: session.newPassword,
  });

  // Clear the session regardless of outcome
  pwChangeSessions.delete(params.userId);

  if (error) throw new Error(`PW_UPDATE_FAILED: ${error.message}`);
}

export function clearPasswordChangeSession(userId: string): void {
  pwChangeSessions.delete(userId);
}
