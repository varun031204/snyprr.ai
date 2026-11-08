import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ac from '../controllers/auth.controller.js';

const router = Router();

// Tight rate limit on signup initiation — prevents SMS abuse
const initiateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,
  message: { error: 'Too many signup attempts from this IP. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// OTP verification attempts
const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  message: { error: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Resend limit
const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,
  message: { error: 'Too many resend requests. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Email existence check — tight to prevent enumeration
const checkEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true, legacyHeaders: false,
});

// Password change OTP — tight to prevent brute force
const pwChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,
  message: { error: 'Too many password change attempts. Please wait.' },
  standardHeaders: true, legacyHeaders: false,
});

router.post('/initiate',               initiateLimiter,   ac.initiateRegistration);
router.post('/verify-phone',           verifyLimiter,     ac.verifyPhone);
router.post('/resend-phone',           resendLimiter,     ac.resendPhone);
router.post('/mark-email-verified',                       ac.markEmailVerified);
router.post('/check-email',            checkEmailLimiter, ac.checkEmail);
router.post('/password-change-otp',    pwChangeLimiter,   ac.sendPasswordChangeOtp);
router.post('/verify-password-otp',    pwChangeLimiter,   ac.verifyPasswordChangeOtp);
router.get('/session-info',                               ac.getSessionInfo);

export default router;
