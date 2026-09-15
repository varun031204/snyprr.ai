/**
 * Gemini 2.5 Flash service
 *
 * Reads the API key from the VITE_GEMINI_API_KEY env variable.
 * Add it to your .env file:  VITE_GEMINI_API_KEY=your_key_here
 */

import type { Prediction } from '../../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

// ─── Build the system prompt ──────────────────────────────────────────────────

function buildAnalysisPrompt(prediction: Prediction): string {
    const buyZone = prediction.buyingZone ?? prediction.entryPrice * 0.97;
    const sellZone = prediction.sellingZone ?? prediction.entryPrice * 1.06;
    const sl = prediction.stopLoss ?? prediction.entryPrice * 0.94;
    const tp = prediction.takeProfit ?? prediction.entryPrice * 1.12;
    const rr = prediction.riskRewardRatio?.toFixed(2) ?? 'N/A';

    return `You are an expert financial analyst specialising in technical and sentiment analysis for cryptocurrency and commodity markets. A trader has published the following trade setup for a snyprr.ai platform user. Your task is to objectively evaluate this setup and present a concise, easy-to-understand review.

TRADE SETUP:
- Instrument: ${prediction.instrument}
- Direction: ${prediction.direction}
- Strategy: ${prediction.strategy}
- Timeframe: ${prediction.timeframe}
- Entry Price: ${prediction.entryPrice}
- Buying Zone: ${buyZone}
- Selling Zone: ${sellZone}
- Stop Loss: ${sl}
- Take Profit: ${tp}
- Risk:Reward Ratio: ${rr}
- Trader's Analysis Notes: ${prediction.analysis || 'Not provided'}

Respond strictly in this JSON format (no markdown, no extra text outside the JSON):
{
  "overview": "<2-3 sentence objective overview of the setup quality>",
  "riskReward": "<one sentence evaluating whether the R:R is attractive>",
  "sentiment": "<one sentence on current market sentiment for this asset based on your knowledge>",
  "verdict": "<one of: BULLISH | BEARISH | NEUTRAL | CAUTION>",
  "keyPoints": ["<concise point 1>", "<concise point 2>", "<concise point 3>", "<concise point 4>"]
}`;
}

function buildChatSystemInstruction(prediction: Prediction | null): string {
    const context = prediction
        ? `The user is currently viewing a ${prediction.direction} setup on ${prediction.instrument} (${prediction.strategy}, ${prediction.timeframe} timeframe). Entry: ${prediction.entryPrice}, SL: ${prediction.stopLoss ?? 'N/A'}, TP: ${prediction.takeProfit ?? 'N/A'}.`
        : 'The user is on the snyprr.ai dashboard viewing market charts.';

    return `You are snyprr AI, snyprr.ai's intelligent trade analysis assistant. You are helpful, concise, and focused on practical trading insights. ${context} Answer questions about this trade setup, market context, risk management, and trading strategy. Keep responses under 200 words. Do not provide financial advice — frame everything as educational analysis.`;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function callGemini(
    contents: GeminiMessage[],
    systemInstruction?: string,
): Promise<string> {
    if (!GEMINI_API_KEY) {
        throw new Error('VITE_GEMINI_API_KEY is not set. Add it to your .env file.');
    }

    const body: Record<string, unknown> = { contents };
    if (systemInstruction) {
        body.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errBody}`);
    }

    const data = await res.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return text.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Generate a structured AI analysis for a trader's prediction */
export async function analyzeTraderSetup(prediction: Prediction): Promise<GeminiAnalysisResult> {
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

/** Send a chat message in context of the current prediction */
export async function sendChatMessage(
    messages: GeminiMessage[],
    prediction: Prediction | null,
): Promise<string> {
    const systemInstruction = buildChatSystemInstruction(prediction);
    return callGemini(messages, systemInstruction);
}
