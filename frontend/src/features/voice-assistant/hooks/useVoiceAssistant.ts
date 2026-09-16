import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceGender, VoiceSettings, VoiceState, VoiceTurn } from '../types/voice';
import { DEFAULT_LANGUAGE } from '../config/languages';
import { buildKnowledgeContext } from '../../../components/chat/chatKnowledge';
import { useSpeechRecognition } from './useSpeechRecognition';
import { useTextToSpeech } from './useTextToSpeech';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'snyprr_voice_settings';
const MAX_HISTORY   = 20; // max Gemini turns kept
const MAX_TURNS_UI  = 50; // max turns shown in UI
const GEMINI_URL    = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
const GEMINI_KEY    = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore storage errors
  }
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(knowledge: string, lang: string): string {
  return `You are Snyprr Voice, the AI trading assistant for Snyprr.ai — a trading intelligence and signal platform. You are knowledgeable, conversational, and genuinely helpful.

WHAT YOU CAN AND SHOULD DO:
- Answer questions about crypto markets, forex, commodities, stocks, and trading in general — confidently and in detail.
- Explain technical analysis: candlestick patterns, support/resistance, moving averages, RSI, MACD, Fibonacci, order blocks, fair value gaps, liquidity zones, etc.
- Discuss market sentiment, trends, and macro context based on your training knowledge.
- Help users understand trading strategies: breakout, SMC, supply/demand, trend following, scalping, swing trading, etc.
- Explain risk management: stop loss placement, position sizing, risk/reward ratios.
- Answer questions about the Snyprr.ai platform using the knowledge below.
- Give educational analysis and commentary on instruments like BTC, ETH, SOL, GOLD, etc.

IMPORTANT LIMITS (be transparent, not evasive):
- You do NOT have access to live real-time price feeds. If asked for the exact current price right now, say you don't have live data but offer to discuss the broader market context or recent trends from your knowledge.
- Do NOT make specific buy/sell trade calls or tell users to enter a trade. Frame analysis as educational.
- Do NOT invent specific trader signals or positions published on the platform.

VOICE FORMAT RULES:
1. Keep responses SHORT and conversational — 2 to 4 sentences for most answers. Only go longer if explaining a complex concept.
2. Do NOT use markdown, bullet points, asterisks, hashes, or any formatting symbols. Speak in natural plain sentences only.
3. Respond in the SAME language the user is speaking. Detected language hint: ${lang}.
4. Support natural Hinglish (Hindi + English code-switching) if the user mixes languages.
5. Be warm, confident, and direct — like a knowledgeable trading friend, not a legal disclaimer machine.

SNYPRR PLATFORM KNOWLEDGE:
${knowledge}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceAssistant() {
  const [voiceState, setVoiceState]   = useState<VoiceState>('idle');
  const [turns, setTurns]             = useState<VoiceTurn[]>([]);
  const [settings, setSettingsState]  = useState<VoiceSettings>(loadSettings);
  const [error, setError]             = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState<string>(loadSettings().language);

  const geminiHistory = useRef<GMsg[]>([]);
  const pendingText   = useRef<string>('');

  const stt = useSpeechRecognition();
  const tts = useTextToSpeech();

  // ── Sync errors from sub-hooks ────────────────────────────────────────────
  useEffect(() => {
    if (stt.error) setError(stt.error);
  }, [stt.error]);

  useEffect(() => {
    if (tts.error) setError(tts.error);
  }, [tts.error]);

  // ── When STT produces a final transcript → process it ────────────────────
  useEffect(() => {
    if (!stt.transcript || voiceState !== 'listening') return;

    const text = stt.transcript.trim();
    if (!text) return;

    // Determine actual language (auto-detect or user-selected)
    const lang = settings.autoDetect && stt.detectedLang
      ? stt.detectedLang
      : settings.language;

    setCurrentLang(lang);
    pendingText.current = text;

    // Add user turn to UI
    const userTurn: VoiceTurn = {
      id:        `turn-${Date.now()}-user`,
      role:      'user',
      text,
      lang,
      timestamp: Date.now(),
    };
    setTurns(prev => [...prev, userTurn].slice(-MAX_TURNS_UI));

    // Move to processing state
    setVoiceState('processing');
  }, [stt.transcript, voiceState, settings.autoDetect, settings.language, stt.detectedLang]);

  // ── When state becomes 'processing' → call Gemini ────────────────────────
  useEffect(() => {
    if (voiceState !== 'processing') return;
    const text = pendingText.current;
    if (!text) {
      setVoiceState('idle');
      return;
    }
    callGemini(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  // ── When TTS finishes speaking → return to idle ───────────────────────────
  useEffect(() => {
    if (voiceState === 'speaking' && !tts.isSpeaking) {
      setVoiceState('idle');
    }
  }, [tts.isSpeaking, voiceState]);

  // ── Gemini call ───────────────────────────────────────────────────────────
  const callGemini = useCallback(async (userText: string) => {
    if (!GEMINI_KEY) {
      setError('VITE_GEMINI_API_KEY is not set.');
      setVoiceState('error');
      return;
    }

    const knowledge     = buildKnowledgeContext(userText);
    const systemPrompt  = buildSystemPrompt(knowledge, currentLang);

    // Append user message to Gemini history
    const userMsg: GMsg = { role: 'user', parts: [{ text: userText }] };
    geminiHistory.current = [...geminiHistory.current, userMsg].slice(-MAX_HISTORY);

    try {
      const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiHistory.current,
          generationConfig: { temperature: 0.75, maxOutputTokens: 256 },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini error ${res.status}: ${errBody}`);
      }

      const data     = await res.json();
      const aiText   = (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();

      if (!aiText) throw new Error('Empty response from Gemini.');

      // Append model reply to history
      const modelMsg: GMsg = { role: 'model', parts: [{ text: aiText }] };
      geminiHistory.current = [...geminiHistory.current, modelMsg].slice(-MAX_HISTORY);

      // Add assistant turn to UI
      const assistantTurn: VoiceTurn = {
        id:        `turn-${Date.now()}-assistant`,
        role:      'assistant',
        text:      aiText,
        lang:      currentLang,
        timestamp: Date.now(),
      };
      setTurns(prev => [...prev, assistantTurn].slice(-MAX_TURNS_UI));

      // Speak the response
      setVoiceState('speaking');
      tts.speak(aiText, currentLang, settings.gender, settings.speed, settings.volume);

    } catch (e) {
      const msg = (e as Error).message ?? 'Unknown error from Gemini.';
      setError(msg);
      setVoiceState('error');
    }
  }, [currentLang, settings.gender, settings.speed, settings.volume, tts]);

  // ── Public actions ────────────────────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!stt.isSupported) {
      setError('Speech recognition is not supported in this browser.');
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
    tts.stop();
    setVoiceState('idle');
  }, [tts]);

  const clearHistory = useCallback(() => {
    geminiHistory.current = [];
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
    state:          voiceState,
    turns,
    settings,
    updateSettings,
    startListening,
    stopListening,
    stopSpeaking,
    clearHistory,
    error,
    detectedLang:   stt.detectedLang,
    currentLang,
    interimTranscript: stt.interimTranscript,
    isSTTSupported: stt.isSupported,
    isTTSSupported: tts.isSupported,
  };
}
