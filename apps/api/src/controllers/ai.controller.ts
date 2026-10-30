/**
 * AI Controller - handles all AI-related requests
 */

import type { Request, Response } from 'express';
import { z } from 'zod';
import * as aiService from '../services/ai.service.js';

const messageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string().max(8000) })).min(1).max(8),
});

const predictionSchema = z.object({
  instrument: z.string().min(1).max(64),
  direction: z.string().min(1).max(32),
  strategy: z.string().max(128).optional(),
  timeframe: z.string().max(64).optional(),
  buyingZone: z.number().finite().optional(),
  sellingZone: z.number().finite().optional(),
  stopLoss: z.number().finite().optional(),
  takeProfit: z.number().finite().optional(),
  riskRewardRatio: z.number().finite().optional(),
  analysis: z.string().max(4000).optional(),
});

const analyzeBodySchema = z.object({
  prediction: predictionSchema,
});

const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  prediction: predictionSchema.nullable().optional(),
});

const copilotBodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  priceContext: z.string().max(12000),
});

function rateLimitPayload(info: aiService.RateLimitInfo) {
  return {
    limit: info.limit,
    remaining: info.remaining,
    resetAt: info.resetAt.toISOString(),
  };
}

function sendRateLimited(res: Response, info: aiService.RateLimitInfo): void {
  res.status(429).json({
    error: 'Rate Limit Exceeded',
    message: `AI request limit reached. Resets at ${info.resetAt.toISOString()}`,
    rateLimit: rateLimitPayload(info),
  });
}

function sendSafeServerError(res: Response, label: string, error: unknown): void {
  const internal = error instanceof Error ? error.message : 'unknown';
  // Log only known provider status codes — never raw provider bodies, keys, or DB strings
  const safeCode = /^AI_PROVIDER_ERROR:(\d+)$/.exec(internal)?.[0]
    ?? (internal === 'AI_PROVIDER_UNAVAILABLE' ? internal : 'AI_INTERNAL_ERROR');
  console.error(`[AI] ${label}:`, { code: safeCode });
  res.status(500).json({
    error: label,
    message: 'An error occurred while processing your request',
  });
}

/**
 * POST /api/ai/analyze
 * Generate AI analysis for a trading signal payload
 *
 * NOTE: Prediction context is currently client-supplied. Server-side signal
 * ownership/visibility checks are not yet wired (documented gap).
 */
export async function analyzeSignal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = analyzeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'prediction object with instrument and direction is required',
        details: parsed.error.flatten(),
      });
      return;
    }

    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      sendRateLimited(res, rateLimitInfo);
      return;
    }

    const analysis = await aiService.analyzeTraderSetup(parsed.data.prediction);

    res.json({
      analysis,
      rateLimit: rateLimitPayload(rateLimitInfo),
    });
  } catch (error: unknown) {
    sendSafeServerError(res, 'AI Analysis Failed', error);
  }
}

/**
 * POST /api/ai/chat
 */
export async function chatMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = chatBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'messages array required; prediction must be valid when provided',
        details: parsed.error.flatten(),
      });
      return;
    }

    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      sendRateLimited(res, rateLimitInfo);
      return;
    }

    const response = await aiService.sendChatMessage(
      parsed.data.messages,
      parsed.data.prediction ?? null,
    );

    res.json({
      response,
      rateLimit: rateLimitPayload(rateLimitInfo),
    });
  } catch (error: unknown) {
    sendSafeServerError(res, 'AI Chat Failed', error);
  }
}

/**
 * POST /api/ai/copilot
 */
export async function copilotMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = copilotBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'messages array and priceContext string are required',
        details: parsed.error.flatten(),
      });
      return;
    }

    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      sendRateLimited(res, rateLimitInfo);
      return;
    }

    const response = await aiService.sendCopilotMessage(
      parsed.data.messages,
      parsed.data.priceContext,
    );

    res.json({
      response,
      rateLimit: rateLimitPayload(rateLimitInfo),
    });
  } catch (error: unknown) {
    sendSafeServerError(res, 'AI Copilot Failed', error);
  }
}

/**
 * POST /api/ai/voice
 */
export async function voiceMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = copilotBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid request',
        message: 'messages array and priceContext string are required',
        details: parsed.error.flatten(),
      });
      return;
    }

    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      sendRateLimited(res, rateLimitInfo);
      return;
    }

    const response = await aiService.sendVoiceCopilotMessage(
      parsed.data.messages,
      parsed.data.priceContext,
    );

    res.json({
      response,
      rateLimit: rateLimitPayload(rateLimitInfo),
    });
  } catch (error: unknown) {
    sendSafeServerError(res, 'AI Voice Failed', error);
  }
}

/**
 * GET /api/ai/quota
 * Returns remaining AI quota for the authenticated user only (no consume).
 */
export async function getQuota(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const rateLimitInfo = await aiService.getRateLimitStatus(userId);

    res.json({
      rateLimit: rateLimitPayload(rateLimitInfo),
    });
  } catch (error: unknown) {
    sendSafeServerError(res, 'Quota Check Failed', error);
  }
}
