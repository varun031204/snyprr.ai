import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

// POST /api/auth/initiate
// Validates fields, checks for duplicates, sends phone OTP.
// Returns registrationToken — a session key for step 2.
export async function initiateRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const { fullName, email, phone } = req.body;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({ error: 'fullName, email, and phone are required' });
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await authService.initiateRegistration({ fullName, email, phone, password: '' });

    res.json({
      registrationToken: result.registrationToken,
      message: 'Verification code sent to your phone',
    });
  } catch (err: any) {
    if (err.message?.startsWith('INVALID_PHONE') || err.message?.startsWith('DUPLICATE')) {
      return res.status(422).json({ error: err.message.replace(/^[A-Z_]+: /, '') });
    }
    if (err.message?.includes('SMS delivery failed') || err.message?.includes('SMS provider error')) {
      // Still return the token — frontend should show "OTP sent" but we log the failure
      console.error('[Auth] SMS delivery error:', err.message);
      return res.status(202).json({
        registrationToken: null,
        warning: 'SMS delivery issue — check console in dev mode',
        message: err.message,
      });
    }
    next(err);
  }
}

// POST /api/auth/verify-phone
export async function verifyPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const { registrationToken, otp } = req.body;
    if (!registrationToken || !otp) {
      return res.status(400).json({ error: 'registrationToken and otp are required' });
    }
    await authService.verifyPhoneOtp({ registrationToken, otp });
    res.json({ verified: true, message: 'Phone number verified successfully' });
  } catch (err: any) {
    const code = err.message?.split(':')[0];
    const msg  = err.message?.replace(/^[A-Z_]+: /, '');
    if (['INVALID_TOKEN','EXPIRED','TOO_MANY_ATTEMPTS','WRONG_OTP'].includes(code)) {
      return res.status(422).json({ error: msg });
    }
    next(err);
  }
}

// POST /api/auth/resend-phone
export async function resendPhone(req: Request, res: Response, next: NextFunction) {
  try {
    const { registrationToken } = req.body;
    if (!registrationToken) {
      return res.status(400).json({ error: 'registrationToken is required' });
    }
    await authService.resendPhoneOtp({ registrationToken });
    res.json({ message: 'Verification code resent to your phone' });
  } catch (err: any) {
    const code = err.message?.split(':')[0];
    const msg  = err.message?.replace(/^[A-Z_]+: /, '');
    if (['INVALID_TOKEN','EXPIRED','COOLDOWN'].includes(code)) {
      return res.status(422).json({ error: msg });
    }
    next(err);
  }
}

// POST /api/auth/mark-email-verified
// Called by the frontend after Supabase email OTP verification succeeds.
export async function markEmailVerified(req: Request, res: Response, next: NextFunction) {
  try {
    const { registrationToken } = req.body;
    if (!registrationToken) {
      return res.status(400).json({ error: 'registrationToken is required' });
    }
    await authService.markEmailVerified(registrationToken);
    res.json({ ok: true });
  } catch (err) { next(err); }
}

// GET /api/auth/session-info?token=...
export async function getSessionInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: 'token query param required' });
    const info = await authService.getSessionInfo(token);
    if (!info) return res.status(404).json({ error: 'Session not found or expired' });
    res.json({ data: info });
  } catch (err) { next(err); }
}
