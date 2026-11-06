/**
 * Formspree Integration
 *
 * Sends contact form submissions to Formspree so responses land in your
 * email inbox without needing a dedicated backend contact endpoint.
 *
 * Setup:
 *  1. Create a free account at https://formspree.io/
 *  2. Create a new form — copy the Form ID (looks like "xpwzgkqr")
 *  3. Paste it as VITE_FORMSPREE_FORM_ID in frontend/.env
 *
 * Docs: https://formspree.io/docs/
 */

export interface ContactFormPayload {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  /** Optional: "support" | "developer" — labels the submission source */
  _source?: string;
}

export interface FormspreeResult {
  ok: boolean;
  /** User-facing error message if ok === false */
  error?: string;
}

/**
 * Submit a contact form to Formspree.
 *
 * Formspree conventions used here:
 *   _subject  — sets the email subject in your inbox
 *   _replyto  — makes "Reply" in your email client go directly to the user
 *
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function submitContactForm(
  payload: ContactFormPayload,
): Promise<FormspreeResult> {
  const formId = import.meta.env.VITE_FORMSPREE_FORM_ID as string | undefined;

  if (!formId || formId === 'YOUR_FORM_ID') {
    console.warn(
      '[Formspree] VITE_FORMSPREE_FORM_ID is not set in frontend/.env. ' +
      'Create a form at https://formspree.io and add the ID to your .env file.',
    );
    // In dev (no ID set), simulate success so the UI flow is still testable
    if (import.meta.env.DEV) {
      await new Promise((r) => setTimeout(r, 700));
      console.info('[Formspree] DEV simulation — would have submitted:', payload);
      return { ok: true };
    }
    return { ok: false, error: 'Contact form is not configured. Please try again later.' };
  }

  try {
    const response = await fetch(`https://formspree.io/f/${formId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        email: payload.email,
        category: payload.category,
        subject: payload.subject,
        message: payload.message,
        // Formspree special fields
        _subject: `[${payload.category}] ${payload.subject}`,
        _replyto: payload.email,
        _source: payload._source ?? 'contact-form',
      }),
    });

    if (response.ok) {
      return { ok: true };
    }

    // Formspree returns JSON errors on 4xx
    const data = await response.json().catch(() => ({}));
    const errorMsg =
      data?.errors?.[0]?.message ??
      data?.error ??
      `Submission failed (${response.status}). Please try again.`;

    return { ok: false, error: errorMsg };
  } catch (err) {
    return {
      ok: false,
      error: 'Network error — please check your connection and try again.',
    };
  }
}
