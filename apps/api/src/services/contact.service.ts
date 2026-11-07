/**
 * contact.service.ts
 *
 * Handles all contact/support form submissions:
 *  - Stores the message in public.contact_messages (Supabase)
 *  - Sends an email notification to the support inbox (Gmail/Nodemailer)
 *  - Admin CRUD: list, filter, update status
 */

import { supabaseAdmin } from '../config/supabaseClient.js';
import { AppError } from '../middleware/error.middleware.js';
import nodemailer from 'nodemailer';

// ── Email transporter (reuses the same Gmail setup as OTP) ────────────────────
function getEmailTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = (process.env.GMAIL_APP_PASSWORD ?? '').replace(/\s/g, '');
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
}

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'General Inquiry',
  TECHNICAL: 'Technical / Bug Report',
  SUBSCRIPTION: 'Plans & Subscriptions',
  PARTNERSHIP: 'Partnership & Business',
  VERIFICATION: 'Trader Verification',
  FEEDBACK: 'Feature Request / Feedback',
  DEV_TEAM: 'Developer Team',
};

// ── Submit a new contact message ──────────────────────────────────────────────
export interface SubmitContactParams {
  userId?: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  source: string;
}

export async function submitContact(params: SubmitContactParams): Promise<{ id: string }> {
  // 1. Persist to DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('contact_messages')
    .insert({
      user_id: params.userId ?? null,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      category: params.category,
      subject: params.subject.trim(),
      message: params.message.trim(),
      source: params.source,
      status: 'NEW',
    })
    .select('id')
    .single();

  if (error) {
    throw new AppError(`Failed to save contact message: ${error.message}`, 500);
  }

  // 2. Send email notification (non-fatal — don't let email failure block the user)
  const transporter = getEmailTransporter();
  if (transporter) {
    const categoryLabel = CATEGORY_LABELS[params.category] ?? params.category;
    const notifyTo = process.env.GMAIL_USER!;
    const adminUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/admin/contact`;

    transporter.sendMail({
      from: `"Snyprr.ai Support" <${process.env.GMAIL_USER}>`,
      to: notifyTo,
      replyTo: params.email,
      subject: `[${categoryLabel}] ${params.subject}`,
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#0f0f13;color:#e5e7eb;border-radius:16px">
          <div style="margin-bottom:20px">
            <img src="${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/logo.png" alt="Snyprr.ai" height="32" style="opacity:0.9" />
          </div>
          <h2 style="color:#8b5cf6;margin:0 0 4px">New Support Message</h2>
          <p style="color:#6b7280;font-size:12px;margin:0 0 24px">Received via ${params.source} · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>

          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
            <tr><td style="padding:8px 12px;background:#1a1a24;border-radius:8px 8px 0 0;color:#9ca3af;width:110px">From</td><td style="padding:8px 12px;background:#1a1a24;color:#e5e7eb">${params.name} &lt;${params.email}&gt;</td></tr>
            <tr><td style="padding:8px 12px;background:#141420;color:#9ca3af">Category</td><td style="padding:8px 12px;background:#141420;color:#e5e7eb">${categoryLabel}</td></tr>
            <tr><td style="padding:8px 12px;background:#1a1a24;color:#9ca3af">Subject</td><td style="padding:8px 12px;background:#1a1a24;color:#e5e7eb">${params.subject}</td></tr>
            <tr><td style="padding:8px 12px;background:#141420;border-radius:0 0 8px 8px;color:#9ca3af;vertical-align:top">Message</td><td style="padding:8px 12px;background:#141420;border-radius:0 0 8px 8px;color:#e5e7eb;white-space:pre-wrap">${params.message}</td></tr>
          </table>

          <a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background:#8b5cf6;color:white;border-radius:10px;text-decoration:none;font-weight:600;font-size:13px">
            View in Admin Panel →
          </a>

          <p style="margin-top:24px;font-size:11px;color:#4b5563">
            Ticket ID: ${data.id}<br/>
            Reply to this email to respond directly to the user.
          </p>
        </div>
      `,
    }).catch((err: Error) => {
      console.error('[Contact] Email notification failed:', err.message);
    });
  }

  return { id: data.id };
}

// ── Admin: list all messages with optional filters ────────────────────────────
export interface ListContactParams {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function listContacts(params: ListContactParams = {}) {
  const { status, category, limit = 50, offset = 0 } = params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabaseAdmin as any)
    .from('contact_messages')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'ALL') query = query.eq('status', status);
  if (category && category !== 'ALL') query = query.eq('category', category);

  const { data, error, count } = await query;

  if (error) throw new AppError(`Failed to list contact messages: ${error.message}`, 500);

  return { messages: data ?? [], total: count ?? 0, limit, offset };
}

// ── Admin: update message status / notes ──────────────────────────────────────
export async function updateContactStatus(
  id: string,
  status: string,
  adminNotes?: string,
) {
  const update: Record<string, unknown> = { status };
  if (adminNotes !== undefined) update.admin_notes = adminNotes;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('contact_messages')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new AppError(`Failed to update contact message: ${error.message}`, 500);
  return data;
}

// ── User: get own submissions ─────────────────────────────────────────────────
export async function getMyContacts(userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('contact_messages')
    .select('id, category, subject, message, status, admin_notes, source, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new AppError(`Failed to fetch your messages: ${error.message}`, 500);
  return data ?? [];
}
