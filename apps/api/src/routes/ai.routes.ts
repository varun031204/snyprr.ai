/**
 * AI Routes - all AI-related endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import * as aiController from '../controllers/ai.controller.js';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

/**
 * POST /api/ai/analyze
 * Generate AI analysis for a trading signal
 * 
 * Body: { prediction: PredictionData }
 * Returns: { analysis: GeminiAnalysisResult, rateLimit: RateLimitInfo }
 */
router.post('/analyze', aiController.analyzeSignal);

/**
 * POST /api/ai/chat
 * Send a chat message with optional prediction context
 * 
 * Body: { messages: GeminiMessage[], prediction?: PredictionData }
 * Returns: { response: string, rateLimit: RateLimitInfo }
 */
router.post('/chat', aiController.chatMessage);

/**
 * POST /api/ai/copilot
 * Send a copilot message (text mode with live price context)
 * 
 * Body: { messages: GeminiMessage[], priceContext: string }
 * Returns: { response: string, rateLimit: RateLimitInfo }
 */
router.post('/copilot', aiController.copilotMessage);

/**
 * POST /api/ai/voice
 * Send a voice message (optimized for TTS)
 * 
 * Body: { messages: GeminiMessage[], priceContext: string }
 * Returns: { response: string, rateLimit: RateLimitInfo }
 */
router.post('/voice', aiController.voiceMessage);

/**
 * GET /api/ai/quota
 * Get remaining AI quota for current user
 * 
 * Returns: { rateLimit: RateLimitInfo }
 */
router.get('/quota', aiController.getQuota);

export default router;
