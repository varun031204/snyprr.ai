import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { submitContact } from '../controllers/contact.controller.js';

const router = Router();

// 10 contact submissions per IP per hour — prevents spam
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many submissions. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public endpoint — optionalAuth attaches user ID if logged in
router.post('/', contactLimiter, optionalAuth, submitContact);

export default router;
