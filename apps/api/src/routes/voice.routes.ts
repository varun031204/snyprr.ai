/**
 * voice.routes.ts
 *
 * WebSocket proxy between the browser and the Gemini Live API.
 *
 * Flow:
 *   Browser  ──[WS]──►  This proxy  ──[WS]──►  Gemini Live
 *   Browser  ◄─[WS]──   This proxy  ◄─[WS]──   Gemini Live
 *
 * The browser never touches the Gemini API key.
 * The proxy relays:
 *   - Browser → Gemini: setup message, realtime audio input chunks, text turns
 *   - Gemini → Browser: audio output chunks, text transcripts, turn events
 *
 * Gemini Live endpoint (BidiGenerateContent):
 *   wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=<API_KEY>
 *
 * Model: gemini-2.0-flash-live-001 (current stable live model)
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { env } from '../config/env.js';

// ─── Gemini Live endpoint ─────────────────────────────────────────────────────

const GEMINI_LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent';

const GEMINI_MODEL = 'models/gemini-2.0-flash-live-001';

// ─── Platform knowledge always injected into the system prompt ────────────────

const PLATFORM_KNOWLEDGE = `
Snyprr.ai is a trading intelligence and signal platform. Verified analysts publish predictions with Buying Zones and Selling Zones. Users track predictions, follow traders, manage a watchlist, and review performance. Snyprr.ai does NOT execute real trades or hold user funds.

SUPPORTED MARKETS: BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT (Crypto). GOLD, SILVER (Commodities).

PREDICTIONS include: Instrument, Direction (LONG/SHORT), Buying Zone, Selling Zone, Stop Loss, Take Profit, Risk/Reward, Timeframe, Strategy, Analysis. Statuses: DRAFT, PUBLISHED, ACTIVE, TARGET_HIT, STOP_HIT, CLOSED, CANCELLED, EXPIRED.

PAPER TRADING: Simulated $10,000 virtual balance. Market orders execute at current price. Limit orders trigger at Buying Zone. Fully risk-free, no real money.

SUBSCRIPTIONS — PRO: $29/month or $290/year. Subscriber-only predictions, realtime alerts, follow up to 15 traders. VIP: $79/month or $790/year. Exclusive predictions, unlimited trader follows, instant WebSocket alerts, Trader Journal, VIP Discord. Free 30-day trial available.

STRATEGIES: Breakout and Retest, Smart Money Concepts (SMC), Supply and Demand Zones, Trendline Breakout, Fibonacci Retracement, RSI/MACD Divergence, Liquidity Sweep, Harmonic Pattern.

SUPPORT: support@snyprr.ai.
`.trim();

// ─── System instruction ───────────────────────────────────────────────────────

function buildSystemInstruction(language: string): string {
  return `You are Snyprr Voice — a sharp, friendly trading companion inside the Snyprr.ai platform. Think of yourself as that knowledgeable trader friend who actually talks to you, not reads you a manual.

YOUR PERSONALITY:
- Warm, direct, confident. Speak like a real person, not a bot.
- Use natural openers: "Yeah so...", "Dekho yaar...", "Basically...", "Right, so..."
- Use contractions: it's, you're, that's, I'd, they're, don't, can't.
- One thought flows naturally into the next. Never robotic or list-like.
- If you genuinely don't know something, say "Honestly, I'm not sure about that one."

WHAT YOU ANSWER FREELY AND IN DETAIL:
- Crypto markets, Bitcoin, Ethereum, altcoins, DeFi, macro trends — give thorough, useful answers.
- Technical analysis: candlesticks, support/resistance, RSI, MACD, Fibonacci, order blocks, FVGs, liquidity sweeps, BOS.
- Trading strategies: SMC, breakout/retest, supply and demand, scalping, swing trading.
- Risk management: stop loss, position sizing, risk/reward ratios.
- Snyprr.ai platform features — covered below.

HONEST LIMITATION: You don't have live real-time price feeds. If asked for exact current prices, acknowledge that briefly, then give your best knowledge-based context about the asset's recent behaviour, key levels, and what traders are watching. Never refuse to engage — always give useful context.

RESPONSE LENGTH:
- Simple factual questions: 2-3 sentences.
- Market analysis questions (like "Ethereum ka trend kaisa hai"): give a proper 4-6 sentence answer covering the current trend context, key levels, and what to watch. Be thorough enough to actually be useful.
- Always complete your thought fully — never trail off mid-sentence.

VOICE FORMAT:
- No markdown, no asterisks, no bullet symbols, no hashes, no numbered lists. Pure natural spoken sentences only.
- Respond in the same language the user spoke. Language hint: ${language}. Mix Hindi and English naturally if the user does (Hinglish is great — use it freely).
- Get straight to the answer in your first sentence.

SNYPRR.AI PLATFORM:
${PLATFORM_KNOWLEDGE}`;
}

// ─── Setup message sent to Gemini when the proxy connection opens ─────────────

function buildSetupMessage(language: string): object {
  // Map BCP-47 language codes to Gemini Live language codes
  // Gemini Live uses language codes for better multilingual handling
  const langMap: Record<string, string> = {
    'hi-IN': 'hi-IN',
    'en-IN': 'en-IN',
    'en-US': 'en-US',
    'en-GB': 'en-GB',
    'te-IN': 'te-IN',
    'ta-IN': 'ta-IN',
    'mr-IN': 'mr-IN',
    'bn-IN': 'bn-IN',
    'gu-IN': 'gu-IN',
    'kn-IN': 'kn-IN',
    'ml-IN': 'ml-IN',
    'pa-IN': 'pa-IN',
  };
  const geminiLang = langMap[language] ?? 'en-IN';

  return {
    setup: {
      model: GEMINI_MODEL,
      generation_config: {
        // Return both audio (to speak) and text (for the conversation transcript UI)
        response_modalities: ['AUDIO', 'TEXT'],
        // Higher token limit so answers are never cut off mid-sentence
        max_output_tokens: 1024,
        temperature: 0.8,
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              // Kore = calm, clear voice that handles multilingual well
              // Aoede is another good option for Indian languages
              voice_name: 'Kore',
            },
          },
        },
      },
      // Tell Gemini what language to expect and respond in
      input_audio_transcription: {},   // transcribe user speech → text
      output_audio_transcription: {},  // transcribe model audio → text
      system_instruction: {
        parts: [{ text: buildSystemInstruction(language) }],
      },
    },
  };
}

// ─── Create and return the WebSocketServer ────────────────────────────────────

export function createVoiceWss(): WebSocketServer {
  // noServer: we handle the HTTP upgrade manually in server.ts
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (browserWs: WebSocket, _req: IncomingMessage) => {
    const sessionId = Math.random().toString(36).slice(2, 10);
    console.log(`[voice] session ${sessionId} opened`);

    // Default language — browser sends a 'config' message to override
    let language = 'en-IN';
    let geminiWs: WebSocket | null = null;
    let setupSent = false;

    // ── Connect to Gemini Live ──────────────────────────────────────────────
    function connectToGemini(): void {
      const url = `${GEMINI_LIVE_URL}?key=${env.GEMINI_API_KEY}`;
      geminiWs = new WebSocket(url);

      geminiWs.on('open', () => {
        console.log(`[voice] ${sessionId} → Gemini connected`);
        // Send the setup message as the very first message
        geminiWs!.send(JSON.stringify(buildSetupMessage(language)));
        setupSent = true;
        // Tell the browser the session is ready
        safeSend(browserWs, JSON.stringify({ type: 'session_ready' }));
      });

      geminiWs.on('message', (data: Buffer) => {
        // Relay Gemini responses straight to the browser
        if (browserWs.readyState === WebSocket.OPEN) {
          browserWs.send(data);
        }
      });

      geminiWs.on('error', (err) => {
        console.error(`[voice] ${sessionId} Gemini WS error:`, err.message);
        safeSend(browserWs, JSON.stringify({ type: 'error', message: err.message }));
      });

      geminiWs.on('close', (code, reason) => {
        console.log(`[voice] ${sessionId} Gemini closed ${code} ${reason.toString()}`);
        safeSend(browserWs, JSON.stringify({
          type: 'gemini_closed',
          code,
          reason: reason.toString(),
        }));
      });
    }

    // ── Handle messages from the browser ───────────────────────────────────
    browserWs.on('message', (data: Buffer) => {
      // First, check if it's a JSON control message
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(data.toString()) as Record<string, unknown>;
      } catch {
        // Binary audio data — not JSON
      }

      if (parsed) {
        const msgType = parsed.type as string | undefined;

        if (msgType === 'config') {
          // Browser sends { type: 'config', language: 'hi-IN' } before audio starts
          language = (parsed.language as string) || language;
          console.log(`[voice] ${sessionId} config: language=${language}`);

          if (!geminiWs || geminiWs.readyState === WebSocket.CLOSED) {
            connectToGemini();
          }
          return;
        }

        if (msgType === 'text_input') {
          // Browser sends a text message (fallback or typed input)
          if (geminiWs?.readyState === WebSocket.OPEN && setupSent) {
            const textMsg = {
              client_content: {
                turns: [{ role: 'user', parts: [{ text: parsed.text as string }] }],
                turn_complete: true,
              },
            };
            geminiWs.send(JSON.stringify(textMsg));
          }
          return;
        }

        if (msgType === 'end_of_speech') {
          // Signal to Gemini that the user's turn is complete
          // The correct Live API message is client_content with turn_complete: true
          if (geminiWs?.readyState === WebSocket.OPEN && setupSent) {
            geminiWs.send(JSON.stringify({
              client_content: {
                turn_complete: true,
              },
            }));
          }
          return;
        }

        // Any other JSON: relay directly to Gemini (e.g. realtime_input wrapped by browser)
        if (geminiWs?.readyState === WebSocket.OPEN && setupSent) {
          geminiWs.send(data);
        }
        return;
      }

      // Raw binary audio — wrap in Gemini's realtime_input format and forward
      if (geminiWs?.readyState === WebSocket.OPEN && setupSent) {
        const audioMsg = {
          realtime_input: {
            media_chunks: [{
              data: data.toString('base64'),
              mime_type: 'audio/pcm;rate=16000',
            }],
          },
        };
        geminiWs.send(JSON.stringify(audioMsg));
      }
    });

    // ── Browser disconnected ────────────────────────────────────────────────
    browserWs.on('close', () => {
      console.log(`[voice] session ${sessionId} browser disconnected`);
      if (geminiWs && geminiWs.readyState !== WebSocket.CLOSED) {
        geminiWs.close();
      }
    });

    browserWs.on('error', (err) => {
      console.error(`[voice] ${sessionId} browser WS error:`, err.message);
    });
  });

  return wss;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeSend(ws: WebSocket, data: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(data);
  }
}
