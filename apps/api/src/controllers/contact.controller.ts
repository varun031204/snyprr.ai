import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as contactService from '../services/contact.service.js';
import { parseUUIDParam } from '../utils/validation.js';

const submitSchema = z.object({
  name:     z.string().min(1).max(100).trim(),
  email:    z.string().email().max(200),
  phone:    z.string().regex(/^\d{10}$/, 'Phone must be exactly 10 digits').optional(),
  category: z.enum(['GENERAL','TECHNICAL','SUBSCRIPTION','PARTNERSHIP','VERIFICATION','FEEDBACK','DEV_TEAM']),
  subject:  z.string().min(1).max(200).trim(),
  message:  z.string().min(1).max(5000).trim(),
  source:   z.string().max(50).default('public'),
});

const listQuerySchema = z.object({
  status:   z.string().optional(),
  category: z.string().optional(),
  limit:    z.coerce.number().min(1).max(100).default(50),
  offset:   z.coerce.number().min(0).default(0),
});

const updateStatusSchema = z.object({
  status:     z.enum(['NEW','IN_PROGRESS','RESOLVED','SPAM']),
  adminNotes: z.string().max(2000).optional(),
});

// POST /api/contact  — public (no auth required)
export async function submitContact(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = submitSchema.parse(req.body);
    // Attach authenticated user ID if available (optional auth middleware applied in route)
    const userId = req.user?.id ?? null;
    const result = await contactService.submitContact({ ...validated, userId });
    res.status(201).json({ success: true, id: result.id, message: 'Your message has been received. We\'ll get back to you shortly.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/contact  — admin only
export async function listContacts(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, category, limit, offset } = listQuerySchema.parse(req.query);
    const result = await contactService.listContacts({ status, category, limit, offset });
    res.json({ data: result.messages, total: result.total, limit: result.limit, offset: result.offset });
  } catch (err) {
    next(err);
  }
}

// GET /api/contact/my  — authenticated user's own submissions
export async function getMyContacts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const messages = await contactService.getMyContacts(req.user.id);
    res.json({ data: messages });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/contact/:id  — admin only
export async function updateContactStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseUUIDParam(req.params['id'], 'contact message id');
    const { status, adminNotes } = updateStatusSchema.parse(req.body);
    const updated = await contactService.updateContactStatus(id, status, adminNotes);
    res.json({ data: updated, message: `Status updated to ${status}` });
  } catch (err) {
    next(err);
  }
}
