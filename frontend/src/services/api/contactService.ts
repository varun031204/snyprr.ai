/**
 * contactService.ts
 * Sends contact form submissions to our own backend (POST /api/contact).
 * Replaces the Formspree integration — no third-party account needed.
 */

import { httpPost, httpGet, httpPatch } from './httpClient';
import type { ApiResponse } from './types';

export interface ContactFormPayload {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  source?: string;
}

export interface ContactMessage {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  source: string;
  status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactSubmitResult {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
}

// ── Public: submit a contact message ─────────────────────────────────────────
export async function submitContactMessage(
  payload: ContactFormPayload,
): Promise<ContactSubmitResult> {
  try {
    const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';
    // Use a raw fetch here so this works for both authenticated and public users
    // without requiring an auth token to be present.
    const res = await fetch(`${BASE_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
        source: payload.source ?? 'public',
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok) {
      return { success: true, id: json.id, message: json.message };
    }

    // Extract the most useful error message from Zod validation errors
    let errorMsg = json.message ?? json.error ?? `Submission failed (${res.status}). Please try again.`;
    if (json.details?.fieldErrors) {
      const fields = Object.entries(json.details.fieldErrors as Record<string, string[]>);
      if (fields.length > 0) {
        errorMsg = fields.map(([field, msgs]) => `${field}: ${msgs[0]}`).join(', ');
      }
    }
    return { success: false, error: errorMsg };
  } catch {
    return { success: false, error: 'Network error — please check your connection and try again.' };
  }
}

// ── Authenticated user: get their own submissions ────────────────────────────
export async function getMyContactMessages() {
  return httpGet<{ data: ContactMessage[] }>('/api/contact/my');
}
export interface ListContactParams {
  status?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export async function adminListContacts(params: ListContactParams = {}) {
  return httpGet<{ data: ContactMessage[]; total: number; limit: number; offset: number }>(
    '/api/admin/contact',
    { status: params.status, category: params.category, limit: params.limit, offset: params.offset },
  );
}

// ── Admin: update status/notes ────────────────────────────────────────────────
export async function adminUpdateContactStatus(
  id: string,
  status: ContactMessage['status'],
  adminNotes?: string,
): Promise<ApiResponse<ContactMessage>> {
  return httpPatch<ApiResponse<ContactMessage>>(`/api/admin/contact/${id}`, { status, adminNotes });
}
