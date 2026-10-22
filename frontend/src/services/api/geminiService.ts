/**
 * Gemini AI Service (Frontend) - proxies all requests to backend API
 * 
 * SECURITY: This service no longer contains API keys or calls external APIs directly.
 * All AI requests go through the backend at /api/ai/* with proper authentication,
 * rate limiting, and user quota management.
 */

import type { Prediction } from '../../types';
import { getLivePriceContext } from '../market/priceService';
import { httpPost, httpGet } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
}

export interface GeminiAnalysisResult {
    overview: string;
    riskReward: string;
    sentiment: string;
    verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTION';
    keyPoints: string[];
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetAt: string;
}

interface AIResponse<T> {
    response?: T;
    analysis?: T;
    rateLimit: RateLimitInfo;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a structured AI analysis for a trader's prediction
 * Calls: POST /api/ai/analyze
 */
export async function analyzeTraderSetup(prediction: Prediction): Promise<GeminiAnalysisResult> {
    try {
        const response = await httpPost<AIResponse<GeminiAnalysisResult>>('/api/ai/analyze', {
            prediction: {
                instrument: prediction.instrument,
                direction: prediction.direction,
                strategy: prediction.strategy,
                timeframe: prediction.timeframe,
                buyingZone: prediction.buyingZone,
                sellingZone: prediction.sellingZone,
                stopLoss: prediction.stopLoss,
                takeProfit: prediction.takeProfit,
                riskRewardRatio: prediction.riskRewardRatio,
                analysis: prediction.analysis,
            },
        });

        if (!response.analysis) {
            throw new Error('No analysis received from server');
        }

        return response.analysis;
    } catch (error: any) {
        // Handle rate limit errors specifically
        if (error.status === 429) {
            throw new Error(`AI quota exceeded. Resets at ${error.data?.rateLimit?.resetAt || 'soon'}.`);
        }

        // Re-throw with user-friendly message
        throw new Error(error.data?.message || 'Failed to analyze trading setup. Please try again.');
    }
}

/**
 * Send a chat message in context of the current prediction
 * Calls: POST /api/ai/chat
 */
export async function sendChatMessage(
    messages: GeminiMessage[],
    prediction: Prediction | null,
): Promise<string> {
    try {
        const response = await httpPost<AIResponse<string>>('/api/ai/chat', {
            messages,
            prediction: prediction ? {
                instrument: prediction.instrument,
                direction: prediction.direction,
                strategy: prediction.strategy,
                timeframe: prediction.timeframe,
                buyingZone: prediction.buyingZone,
                sellingZone: prediction.sellingZone,
                stopLoss: prediction.stopLoss,
                takeProfit: prediction.takeProfit,
                analysis: prediction.analysis,
            } : null,
        });

        if (!response.response) {
            throw new Error('No response received from server');
        }

        return response.response;
    } catch (error: any) {
        if (error.status === 429) {
            throw new Error(`AI quota exceeded. Resets at ${error.data?.rateLimit?.resetAt || 'soon'}.`);
        }
        throw new Error(error.data?.message || 'Failed to send chat message. Please try again.');
    }
}

/**
 * Send a message to the Snyprr AI Copilot (text chat mode).
 * Fetches live market prices and sends them to the backend.
 * Calls: POST /api/ai/copilot
 */
export async function sendCopilotMessage(
    messages: GeminiMessage[],
): Promise<string> {
    try {
        const priceContext = await getLivePriceContext();

        const response = await httpPost<AIResponse<string>>('/api/ai/copilot', {
            messages,
            priceContext,
        });

        if (!response.response) {
            throw new Error('No response received from server');
        }

        return response.response;
    } catch (error: any) {
        if (error.status === 429) {
            throw new Error(`AI quota exceeded. Resets at ${error.data?.rateLimit?.resetAt || 'soon'}.`);
        }
        throw new Error(error.data?.message || 'Failed to send copilot message. Please try again.');
    }
}

/**
 * Send a message via voice mode.
 * Uses a strict voice-optimised prompt (2-4 sentences, no markdown, English only).
 * Calls: POST /api/ai/voice
 */
export async function sendVoiceCopilotMessage(
    transcript: string,
    history: GeminiMessage[],
): Promise<string> {
    try {
        const priceContext = await getLivePriceContext();

        const messages: GeminiMessage[] = [
            ...history,
            { role: 'user', parts: [{ text: transcript }] },
        ];

        const response = await httpPost<AIResponse<string>>('/api/ai/voice', {
            messages,
            priceContext,
        });

        if (!response.response) {
            throw new Error('No response received from server');
        }

        return response.response;
    } catch (error: any) {
        if (error.status === 429) {
            throw new Error(`AI quota exceeded. Resets at ${error.data?.rateLimit?.resetAt || 'soon'}.`);
        }
        throw new Error(error.data?.message || 'Failed to send voice message. Please try again.');
    }
}

/**
 * Get remaining AI quota for current user
 * Calls: GET /api/ai/quota
 */
export async function getAIQuota(): Promise<RateLimitInfo> {
    try {
        const response = await httpGet<{ rateLimit: RateLimitInfo }>('/api/ai/quota');
        return response.rateLimit;
    } catch (error: any) {
        throw new Error(error.data?.message || 'Failed to fetch AI quota.');
    }
}
