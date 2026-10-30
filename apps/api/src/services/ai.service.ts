/**
 * Gemini AI service - server-side implementation
 *
 * Handles all AI requests with:
 * - Secure API key management (never exposed to frontend)
 * - Per-user rate limiting (in-memory; see limitations below)
 * - Input validation helpers used by the controller
 * - Exponential backoff retry logic
 *
 * RATE LIMIT LIMITATIONS:
 * - In-memory Map is per-process only. Multiple API instances do NOT share quota.
 * - Failed Gemini calls still consume quota once a request is accepted (pre-call consume).
 * - Per-user serialization prevents same-process concurrent bypass of the counter.
 */

import { env } from '../config/env.js';
import { db } from '../db/pool.js';

const GEMINI_MODEL = 'gemini-3.6-flash';
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const CANDIDATE_MODELS = [
  GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
].filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);

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

export interface PredictionData {
  instrument: string;
  direction: string;
  strategy?: string;
  timeframe?: string;
  buyingZone?: number;
  sellingZone?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number;
  analysis?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export const AI_RATE_LIMITS = {
  FREE: 10,     // 10 requests per hour
  BASIC: 30,    // 30 requests per hour
  PRO: 100,     // 100 requests per hour
  PREMIUM: 500, // 500 requests per hour
} as const;

export type AiTier = keyof typeof AI_RATE_LIMITS;

interface UserRateLimit {
  userId: string;
  requestCount: number;
  windowStart: Date;
  userTier: AiTier;
}

/** In-memory rate limit store — NOT shared across processes/instances. */
const rateLimitStore = new Map<string, UserRateLimit>();

/** Serializes rate-limit mutations per user within this process. */
const rateLimitChains = new Map<string, Promise<unknown>>();

function mapPlanNameToTier(planName: string | undefined | null): AiTier {
  if (!planName) return 'FREE';
  const key = planName.trim().toLowerCase();
  const tierMap: Record<string, AiTier> = {
    basic: 'BASIC',
    pro: 'PRO',
    premium: 'PREMIUM',
    vip: 'PREMIUM',
  };
  return tierMap[key] ?? 'FREE';
}

async function resolveUserTier(userId: string): Promise<AiTier> {
  try {
    // Match existing codebase convention: subscription status is stored as 'ACTIVE'
    const { rows } = await db.query<{ plan_name: string }>(
      `SELECT sp.name as plan_name
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1
         AND UPPER(us.status) = 'ACTIVE'
         AND (us.expires_at IS NULL OR us.expires_at > NOW())
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return mapPlanNameToTier(rows[0]?.plan_name);
  } catch (err) {
    // Fail closed to FREE on DB errors — do not throw secrets/connection details upward
    console.error('[AI] Failed to resolve subscription tier:', {
      message: err instanceof Error ? err.message : 'unknown',
    });
    return 'FREE';
  }
}

function readWindow(userId: string, userTier: AiTier, now: Date): UserRateLimit {
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  let entry = rateLimitStore.get(userId);
  if (!entry || entry.windowStart < hourAgo) {
    entry = {
      userId,
      requestCount: 0,
      windowStart: now,
      userTier,
    };
    rateLimitStore.set(userId, entry);
  } else {
    entry.userTier = userTier;
  }
  return entry;
}

function toRateLimitInfo(entry: UserRateLimit, limit: number, allowed: boolean): RateLimitInfo {
  const remaining = Math.max(0, limit - entry.requestCount);
  return {
    allowed,
    remaining,
    resetAt: new Date(entry.windowStart.getTime() + 60 * 60 * 1000),
    limit,
  };
}

async function withUserRateLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const previous = rateLimitChains.get(userId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.catch(() => undefined).then(() => gate);
  rateLimitChains.set(userId, chained);

  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (rateLimitChains.get(userId) === chained) {
      rateLimitChains.delete(userId);
    }
  }
}

/**
 * Peek current quota without consuming a request.
 * Used by GET /api/ai/quota.
 */
export async function getRateLimitStatus(userId: string): Promise<RateLimitInfo> {
  return withUserRateLock(userId, async () => {
    const now = new Date();
    const userTier = await resolveUserTier(userId);
    const limit = AI_RATE_LIMITS[userTier];
    const entry = readWindow(userId, userTier, now);
    const allowed = entry.requestCount < limit;
    return toRateLimitInfo(entry, limit, allowed);
  });
}

/**
 * Check quota and consume one unit when allowed.
 * Applied before expensive Gemini calls.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitInfo> {
  return withUserRateLock(userId, async () => {
    const now = new Date();
    const userTier = await resolveUserTier(userId);
    const limit = AI_RATE_LIMITS[userTier];
    const entry = readWindow(userId, userTier, now);
    const allowed = entry.requestCount < limit;

    if (allowed) {
      entry.requestCount += 1;
      rateLimitStore.set(userId, entry);
    }

    return toRateLimitInfo(entry, limit, allowed);
  });
}

/** Test helper — clears in-memory quota state. */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
  rateLimitChains.clear();
}

// ─── Gemini API Client ────────────────────────────────────────────────────────

/**
 * Call Gemini API with automatic retry logic for transient errors.
 * Never include the API key or raw provider bodies in thrown Error messages
 * (controllers must not forward those to clients).
 */
async function callGemini(
  contents: GeminiMessage[],
  systemInstruction?: string,
): Promise<string> {
  const body: Record<string, unknown> = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastStatus: number | null = null;

  for (const model of CANDIDATE_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const MAX_RETRIES = 2;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
      }

      let res: Response;
      try {
        res = await fetch(`${endpoint}?key=${env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        lastStatus = null;
        continue;
      }

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text.trim();
      }

      lastStatus = res.status;
      // Drain body for connection reuse; do not attach to thrown errors
      await res.text().catch(() => undefined);

      if (res.status === 404 || res.status === 503) {
        break; // Try next model
      }

      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        continue;
      }

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new Error(`AI_PROVIDER_ERROR:${res.status}`);
      }
    }
  }

  throw new Error(lastStatus ? `AI_PROVIDER_ERROR:${lastStatus}` : 'AI_PROVIDER_UNAVAILABLE');
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

function buildAnalysisPrompt(prediction: PredictionData): string {
  const buyZone = prediction.buyingZone ?? 0;
  const sellZone = prediction.sellingZone ?? 0;
  const sl = prediction.stopLoss;
  const tp = prediction.takeProfit;
  const rr = prediction.riskRewardRatio?.toFixed(2) ?? 'N/A';

  return `You are an expert financial analyst specialising in technical and sentiment analysis for cryptocurrency and commodity markets. A trader on Snyprr.ai has published the following trade setup. Your task is to provide a concise, structured review that summarises the trader's own analysis and enhances it with relevant market context.

TRADE SETUP:
- Instrument: ${prediction.instrument}
- Direction: ${prediction.direction}
- Strategy: ${prediction.strategy ?? 'N/A'}
- Timeframe: ${prediction.timeframe ?? 'N/A'}
- Buying Zone: ${buyZone}
- Selling Zone: ${sellZone}
- Stop Loss: ${sl ?? 'N/A'}
- Take Profit: ${tp ?? 'N/A'}
- Risk:Reward Ratio: ${rr}
- Trader's Analysis Notes: ${prediction.analysis || 'Not provided'}

IMPORTANT: Base your overview primarily on the trader's analysis notes above. Summarise and validate their reasoning. Only add your own market context where the trader has not covered it. Do not invent trader reasoning.

Respond strictly in this JSON format (no markdown, no extra text outside the JSON):
{
  "overview": "<2-3 sentence summary grounded in the trader's own analysis notes>",
  "riskReward": "<one sentence evaluating whether the R:R is attractive>",
  "sentiment": "<one sentence on current market sentiment for this asset>",
  "verdict": "<one of: BULLISH | BEARISH | NEUTRAL | CAUTION>",
  "keyPoints": ["<concise point 1>", "<concise point 2>", "<concise point 3>", "<concise point 4>"]
}`;
}

function buildChatSystemInstruction(prediction: PredictionData | null): string {
  const context = prediction
    ? `The user is currently viewing a ${prediction.direction} setup on ${prediction.instrument} (${prediction.strategy}, ${prediction.timeframe} timeframe). Buying Zone: ${prediction.buyingZone ?? 'N/A'}, SL: ${prediction.stopLoss ?? 'N/A'}, TP: ${prediction.takeProfit ?? 'N/A'}.`
    : 'The user is on the Snyprr.ai dashboard viewing market charts.';

  return `You are Snyprr AI, Snyprr.ai's intelligent trade analysis assistant. You are helpful, concise, and focused on practical trading insights. ${context} Answer questions about this trade setup, market context, risk management, and trading strategy. Keep responses under 200 words. Do not provide financial advice — frame everything as educational analysis.`;
}

const COPILOT_SYSTEM_PROMPT = `You are Snyprr AI, the dedicated trading intelligence copilot on Snyprr.ai — a premium trading signal and analysis platform.

Your role:
- Provide technical analysis and market commentary using the live price data provided below
- Explain Smart Money Concepts (SMC): Order Blocks, Fair Value Gaps, Liquidity, BOS/CHoCH
- Analyse chart patterns, setups, and multi-timeframe structure
- Discuss risk management, position sizing, and R:R calculations
- Give concise, professional insights for active traders

Guidelines:
- You WILL be provided with LIVE MARKET DATA at the end of this instruction — always use these prices when answering price questions
- Be concise: keep responses under 250 words unless a complex topic requires more detail
- Be specific: use the actual live prices provided, plus percentages and market structure terms
- Frame as educational analysis, not financial advice
- Use clear formatting with bullet points for key levels
- Maintain a professional but approachable tone`;

const VOICE_SYSTEM_PROMPT = `You are Snyprr AI, a voice-based trading assistant. The user is speaking to you and will hear your response read aloud by a text-to-speech engine.

CRITICAL RULES — your response will be spoken aloud so it MUST be optimised for speech:
- Always respond in English only, regardless of what language the user writes in
- Use plain spoken English — NO markdown, NO asterisks, NO hashtags, NO bullet points, NO dashes as list separators, NO symbols like * # - > |
- Keep every response to 2-4 natural sentences maximum
- Be direct and conversational — answer exactly what was asked, nothing more
- Do NOT start with phrases like "Great question!", "Certainly!", "Of course!", "Sure!", or similar filler
- For prices, say numbers naturally (e.g. "Bitcoin is at ninety-four thousand two hundred")
- Use "and" instead of "&", "percent" instead of "%", "versus" instead of "vs"
- Sound like a knowledgeable trading friend having a conversation, not like a written report
- Never use abbreviations that sound odd when read aloud (e.g. say "take profit" not "TP", "stop loss" not "SL")`;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate structured AI analysis for a trader's prediction
 */
export async function analyzeTraderSetup(prediction: PredictionData): Promise<GeminiAnalysisResult> {
  const prompt = buildAnalysisPrompt(prediction);
  const raw = await callGemini([{ role: 'user', parts: [{ text: prompt }] }]);

  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as GeminiAnalysisResult;
  } catch {
    // Graceful fallback if JSON parse fails
    return {
      overview: raw.slice(0, 300),
      riskReward: 'Unable to parse structured response.',
      sentiment: '',
      verdict: 'NEUTRAL',
      keyPoints: [],
    };
  }
}

/**
 * Send a chat message in context of the current prediction
 */
export async function sendChatMessage(
  messages: GeminiMessage[],
  prediction: PredictionData | null,
): Promise<string> {
  const systemInstruction = buildChatSystemInstruction(prediction);
  return callGemini(messages, systemInstruction);
}

/**
 * Send a message to the Snyprr AI Copilot (text chat mode)
 */
export async function sendCopilotMessage(
  messages: GeminiMessage[],
  priceContext: string,
): Promise<string> {
  const systemInstruction = COPILOT_SYSTEM_PROMPT + priceContext;
  return callGemini(messages, systemInstruction);
}

/**
 * Send a message via voice mode
 */
export async function sendVoiceCopilotMessage(
  messages: GeminiMessage[],
  priceContext: string,
): Promise<string> {
  const systemInstruction = VOICE_SYSTEM_PROMPT + priceContext;
  return callGemini(messages, systemInstruction);
}
