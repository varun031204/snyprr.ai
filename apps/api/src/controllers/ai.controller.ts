/**
 * AI Controller - handles all AI-related requests
 */

import type { Request, Response } from 'express';
import * as aiService from '../services/ai.service.js';

/**
 * POST /api/ai/analyze
 * Generate AI analysis for a trading signal
 */
export async function analyzeSignal(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check rate limit
    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `AI request limit reached. Resets at ${rateLimitInfo.resetAt.toISOString()}`,
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt.toISOString(),
        },
      });
      return;
    }

    // Validate request body
    const { prediction } = req.body;
    if (!prediction || typeof prediction !== 'object') {
      res.status(400).json({ error: 'Invalid request: prediction object required' });
      return;
    }

    if (!prediction.instrument || !prediction.direction) {
      res.status(400).json({ error: 'Invalid prediction: instrument and direction required' });
      return;
    }

    // Call AI service
    const analysis = await aiService.analyzeTraderSetup(prediction);

    res.json({
      analysis,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      error: 'AI Analysis Failed',
      message: error.message || 'An error occurred while processing your request',
    });
  }
}

/**
 * POST /api/ai/chat
 * Send a chat message (with optional prediction context)
 */
export async function chatMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check rate limit
    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `AI request limit reached. Resets at ${rateLimitInfo.resetAt.toISOString()}`,
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt.toISOString(),
        },
      });
      return;
    }

    // Validate request body
    const { messages, prediction } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Invalid request: messages array required' });
      return;
    }

    // Validate message format
    for (const msg of messages) {
      if (!msg.role || !['user', 'model'].includes(msg.role)) {
        res.status(400).json({ error: 'Invalid message: role must be "user" or "model"' });
        return;
      }
      if (!Array.isArray(msg.parts) || msg.parts.length === 0) {
        res.status(400).json({ error: 'Invalid message: parts array required' });
        return;
      }
    }

    // Call AI service
    const response = await aiService.sendChatMessage(messages, prediction || null);

    res.json({
      response,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    res.status(500).json({
      error: 'AI Chat Failed',
      message: error.message || 'An error occurred while processing your request',
    });
  }
}

/**
 * POST /api/ai/copilot
 * Send a copilot message (text mode with live price context)
 */
export async function copilotMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check rate limit
    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `AI request limit reached. Resets at ${rateLimitInfo.resetAt.toISOString()}`,
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt.toISOString(),
        },
      });
      return;
    }

    // Validate request body
    const { messages, priceContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Invalid request: messages array required' });
      return;
    }

    if (typeof priceContext !== 'string') {
      res.status(400).json({ error: 'Invalid request: priceContext string required' });
      return;
    }

    // Call AI service
    const response = await aiService.sendCopilotMessage(messages, priceContext);

    res.json({
      response,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI copilot error:', error);
    res.status(500).json({
      error: 'AI Copilot Failed',
      message: error.message || 'An error occurred while processing your request',
    });
  }
}

/**
 * POST /api/ai/voice
 * Send a voice message (optimized for TTS)
 */
export async function voiceMessage(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check rate limit
    const rateLimitInfo = await aiService.checkRateLimit(userId);
    if (!rateLimitInfo.allowed) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `AI request limit reached. Resets at ${rateLimitInfo.resetAt.toISOString()}`,
        rateLimit: {
          limit: rateLimitInfo.limit,
          remaining: rateLimitInfo.remaining,
          resetAt: rateLimitInfo.resetAt.toISOString(),
        },
      });
      return;
    }

    // Validate request body
    const { messages, priceContext } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Invalid request: messages array required' });
      return;
    }

    if (typeof priceContext !== 'string') {
      res.status(400).json({ error: 'Invalid request: priceContext string required' });
      return;
    }

    // Call AI service
    const response = await aiService.sendVoiceCopilotMessage(messages, priceContext);

    res.json({
      response,
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI voice error:', error);
    res.status(500).json({
      error: 'AI Voice Failed',
      message: error.message || 'An error occurred while processing your request',
    });
  }
}

/**
 * GET /api/ai/quota
 * Get remaining AI quota for current user
 */
export async function getQuota(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check rate limit (without incrementing counter)
    const rateLimitInfo = await aiService.checkRateLimit(userId);

    res.json({
      rateLimit: {
        limit: rateLimitInfo.limit,
        remaining: rateLimitInfo.remaining,
        resetAt: rateLimitInfo.resetAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI quota check error:', error);
    res.status(500).json({
      error: 'Quota Check Failed',
      message: error.message || 'An error occurred while checking your quota',
    });
  }
}
