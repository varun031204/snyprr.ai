import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceSettings, VoiceState, VoiceTurn } from '../types/voice';
import { DEFAULT_LANGUAGE } from '../config/languages';
import { cleanTextForSpeech } from '../services/voiceService';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY  = 'snyprr_voice_settings';
const MAX_HISTORY  = 16;
const MAX_TURNS_UI = 50;
// Streaming endpoint — starts speaking the first sentence before full response is ready
const GEMINI_STREAM_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse';
const GEMINI_KEY        = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// ─── Full platform knowledge (always injected — not keyword-filtered) ─────────
// This is embedded once in the system prompt so Gemini always knows the platform.
// General trading questions use Gemini's own training knowledge, not this section.
const PLATFORM_KNOWLEDGE = `
Snyprr.ai is a trading intelligence and signal platform. Verified analysts publish predictions with Buying Zones and Selling Zones. Users track predictions, follow traders, manage a watchlist, and review performance. Snyprr.ai does NOT execute real trades or hold user funds.

SUPPORTED MARKETS: BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT (Crypto). GOLD, SILVER (Commodities).

PREDICTIONS include: Instrument, Direction (LONG/SHORT), Buying Zone, Selling Zone, Stop Loss, Take Profit, Risk/Reward, Timeframe, Strategy, Analysis notes. Statuses: DRAFT, PUBLISHED, ACTIVE, TARGET_HIT, STOP_HIT, CLOSED, CANCELLED, EXPIRED.

PAPER TRADING: Simulated $10,000 virtual balance. Market orders execute at current price. Limit orders trigger at Buying Zone. Fully risk-free — no real money involved.

AI ANALYSIS: Evaluates trader setups and provides overview, risk/reward, market sentiment, and verdict (BULLISH/BEARISH/NEUTRAL/CAUTION). Has an embedded follow-up chat.

SUBSCRIPTIONS — PRO: $29/month or $290/year. Subscriber-only predictions, realtime alerts, email/web alerts, prediction overlays, follow up to 15 traders, historical analytics. VIP: $79/month or $790/year. Exclusive predictions, unlimited trader follows, instant WebSocket alerts, Trader Journal, priority AI search, VIP Discord. Free 30-day trial available.

STRATEGIES available: Breakout and Retest, Smart Money Concepts (SMC), Supply and Demand Zones, Trendline Breakout, Fibonacci Retracement, RSI/MACD Divergence, Liquidity Sweep, Harmonic Pattern.

CHARTS: TradingView charts with drawing tools including trend lines, Fibonacci, channels, pitchfork and more. Green overlay = Buying Zone, Red overlay = Selling Zone.

SUPPORT: support@snyprr.ai. Developer: dev@snyprr.ai.
`.trim();

// ─── Types ────────────────────────────────────────────────────────────────────

interface GMsg {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: VoiceSettings = {
  language:   DEFAULT_LANGUAGE,
  gender:     'female',
  speed:      1.0,
  volume:     1.0,
  autoDetect: true,
  continuous: false,
};

function loadSettings(): VoiceSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as VoiceSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(s: VoiceSettings): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(lang: string): string {
  return `You are Snyprr Voice — a sharp, friendly trading companion inside the Snyprr.ai platform. Think of yourself as that knowledgeable trader friend who picks up the phone and actually talks to you, not reads you a manual.

YOUR PERSONALITY:
- Warm, direct, confident. You speak like a real person, not a bot.
- Use natural openers: "Yeah so...", "Good one —", "Basically...", "Right, so...", "Oh that's a good question —"
- Use contractions: it's, you're, that's, I'd, they're, don't, can't.
- Never sound like you're reading bullet points. One thought flows into the next naturally.
- If you genuinely don't know something, say "Honestly, I'm not sure about that one" — never give a legal disclaimer.

WHAT YOU KNOW AND WILL ANSWER FREELY:
- Crypto markets, Bitcoin, Ethereum, altcoins, DeFi, macro trends — discuss all of it confidently using your training knowledge.
- Technical analysis: candlesticks, support/resistance, RSI, MACD, moving averages, Fibonacci, order blocks, FVGs, liquidity sweeps, BOS — explain clearly.
- Trading strategies: SMC, breakout/retest, supply and demand, trend following, scalping, swing trading — answer all of them.
- Risk management: stop loss, position sizing, risk/reward — give real practical takes.
- Snyprr.ai platform features — covered in the PLATFORM section below.

ONE HONEST LIMITATION:
- You don't have a live price feed. If asked for an exact current price, say something like "I don't have live prices right now — check the chart — but here's what I know about it." Then give useful context and move on.

RESPONSE FORMAT — this is VOICE, absolutely critical:
- 2 to 3 sentences MAX for simple questions. 4 to 5 only for complex topics.
- NO markdown whatsoever. No asterisks, no dashes as bullets, no hashes, no numbered lists. Pure natural spoken sentences only.
- Respond in the exact language the user spoke. Language hint: ${lang}. Mix Hindi and English naturally if the user does (Hinglish is perfect).
- Lead with the answer immediately — do not start with "Great question!" or preamble. Get to the point in sentence one.

SNYPRR.AI PLATFORM:
${PLATFORM_KNOWLEDGE}`;
}

// ─── Sentence splitter for streaming TTS ─────────────────────────────────────
// Returns [completeSentences[], remainingBuffer]
function extractSentences(buffer: string): [string[], string] {
  // Match sentence endings: . ! ? followed by space, or Devanagari danda
  const re = /([.!?।॥]+)\s+/g;
  const out: string[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buffer)) !== null) {
    const s = buffer.slice(last, m.index + m[1].length).trim();
    if (s) out.push(s);
    last = m.index + m[0].length;
  }
  return [out, buffer.slice(last)];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceAssistant() {
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [turns, setTurns]             = useState<VoiceTurn[]>([]);
  const [settings, setSettingsState]  = useState<VoiceSettings>(loadSettings);
  const [error, setError]             = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<string>(loadSettings().language);

  const geminiHistory  = useRef<GMsg[]>([]);
  const pendingText    = useRef<string>('');
  const abortRef       = useRef<AbortController | null>(null);
  const ttsQueue       = useRef<string[]>([]);       // sentences waiting to be spoken
  const isTTSBusy      = useRef<boolean>(false);     // true while a sentence is playing
  const streamedText   = useRef<string>('');         // full response for history

  const stt = useSpeechRecognition();
  const tts = useTextToSpeech();

  // ── Propagate sub-hook errors ─────────────────────────────────────────────
  useEffect(() => { if (stt.error) setError(stt.error); }, [stt.error]);
  useEffect(() => { if (tts.error) setError(tts.error); }, [tts.error]);

  // ── Drain TTS queue — called after each sentence finishes ─────────────────
  const drainQueue = useCallback(() => {
    if (isTTSBusy.current || ttsQueue.current.length === 0) return;
    const sentence = ttsQueue.current.shift()!;
    isTTSBusy.current = true;
    tts.speak(sentence, currentLang, settings.gender, settings.speed, settings.volume);
  }, [currentLang, settings.gender, settings.speed, settings.volume, tts]);

  // When a sentence finishes playing, speak the next one (or go idle)
  useEffect(() => {
    if (!tts.isSpeaking && isTTSBusy.current) {
      isTTSBusy.current = false;
      if (ttsQueue.current.length > 0) {
        drainQueue();
      } else if (voiceState === 'speaking') {
        setVoiceState('idle');
      }
    }
  }, [tts.isSpeaking, voiceState, drainQueue]);

  // ── STT transcript ready → queue for Gemini ───────────────────────────────
  useEffect(() => {
    if (!stt.transcript || voiceState !== 'listening') return;
    const text = stt.transcript.trim();
    if (!text) return;

    const lang = settings.autoDetect && stt.detectedLang
      ? stt.detectedLang
      : settings.language;

    setCurrentLang(lang);
    pendingText.current = text;

    setTurns(prev => [...prev, {
      id: `turn-${Date.now()}-user`,
      role: 'user' as const,
      text,
      lang,
      timestamp: Date.now(),
    }].slice(-MAX_TURNS_UI));

    setVoiceState('processing');
  }, [stt.transcript, voiceState, settings.autoDetect, settings.language, stt.detectedLang]);

  // ── Processing state → fire Gemini ───────────────────────────────────────
  useEffect(() => {
    if (voiceState !== 'processing') return;
    const text = pendingText.current;
    if (!text) { setVoiceState('idle'); return; }
    callGemini(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  // ── Streaming Gemini call ─────────────────────────────────────────────────
  const callGemini = useCallback(async (userText: string) => {
    if (!GEMINI_KEY) {
      setError('VITE_GEMINI_API_KEY is not set.');
      setVoiceState('error');
      return;
    }

    abortRef.current?.abort();
    abortRef.current    = new AbortController();
    ttsQueue.current    = [];
    isTTSBusy.current   = false;
    streamedText.current = '';

    const userMsg: GMsg = { role: 'user', parts: [{ text: userText }] };
    geminiHistory.current = [...geminiHistory.current, userMsg].slice(-MAX_HISTORY);

    const systemPrompt = buildSystemPrompt(currentLang);

    // Placeholder turn — updated live as text streams in
    const turnId = `turn-${Date.now()}-assistant`;
    setTurns(prev => [...prev, {
      id: turnId, role: 'assistant' as const,
      text: '…', lang: currentLang, timestamp: Date.now(),
    }].slice(-MAX_TURNS_UI));

    let buffer         = '';
    let speechStarted  = false;

    try {
      const res = await fetch(`${GEMINI_STREAM_URL}&key=${GEMINI_KEY}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiHistory.current,
          generationConfig: { temperature: 0.8, maxOutputTokens: 180 },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini ${res.status}: ${err}`);
      }

      const reader  = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });

        for (const line of raw.split('\n')) {
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const json = t.slice(5).trim();
          if (!json || json === '[DONE]') continue;

          let parsed: unknown;
          try { parsed = JSON.parse(json); } catch { continue; }

          const part = (parsed as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
            ?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (!part) continue;

          buffer               += part;
          streamedText.current += part;

          // Live-update the turn text in the conversation UI
          setTurns(prev => prev.map(t =>
            t.id === turnId
              ? { ...t, text: cleanTextForSpeech(streamedText.current) || '…' }
              : t,
          ));

          // Pull complete sentences out of the buffer and queue them for TTS
          const [sentences, remainder] = extractSentences(buffer);
          buffer = remainder;

          for (const s of sentences) {
            const clean = cleanTextForSpeech(s);
            if (!clean) continue;
            ttsQueue.current.push(clean);
            if (!speechStarted) {
              speechStarted = true;
              setVoiceState('speaking');  // flip to speaking on very first sentence
            }
            drainQueue();
          }
        }
      }

      // Speak any leftover partial sentence once stream ends
      const tail = cleanTextForSpeech(buffer.trim());
      if (tail) {
        ttsQueue.current.push(tail);
        if (!speechStarted) { speechStarted = true; setVoiceState('speaking'); }
        drainQueue();
      }

      // Persist full response to Gemini history
      const full = cleanTextForSpeech(streamedText.current);
      if (full) {
        const modelMsg: GMsg = { role: 'model', parts: [{ text: full }] };
        geminiHistory.current = [...geminiHistory.current, modelMsg].slice(-MAX_HISTORY);
      }

      if (!speechStarted) {
        setError('No response received.');
        setVoiceState('error');
      }

    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message ?? 'Unknown error.');
      setVoiceState('error');
    }
  }, [currentLang, drainQueue]);

  // ── Public actions ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!stt.isSupported) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      setVoiceState('error');
      return;
    }
    setError(null);
    setVoiceState('listening');
    stt.start(settings.language);
  }, [stt, settings.language]);

  const stopListening = useCallback(() => {
    stt.stop();
    setVoiceState('idle');
  }, [stt]);

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    ttsQueue.current  = [];
    isTTSBusy.current = false;
    tts.stop();
    setVoiceState('idle');
  }, [tts]);

  const clearHistory = useCallback(() => {
    abortRef.current?.abort();
    geminiHistory.current = [];
    ttsQueue.current      = [];
    isTTSBusy.current     = false;
    setTurns([]);
    stt.reset();
    setError(null);
    setVoiceState('idle');
  }, [stt]);

  const updateSettings = useCallback((partial: Partial<VoiceSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...partial } as VoiceSettings;
      saveSettings(next);
      return next;
    });
  }, []);

  return {
    state:             voiceState,
    turns,
    settings,
    updateSettings,
    startListening,
    stopListening,
    stopSpeaking,
    clearHistory,
    error,
    detectedLang:      stt.detectedLang,
    currentLang,
    interimTranscript: stt.interimTranscript,
    isSTTSupported:    stt.isSupported,
    isTTSSupported:    tts.isSupported,
  };
}
