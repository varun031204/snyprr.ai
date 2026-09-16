/**
 * useGeminiLive
 *
 * Browser-side WebSocket client for the Gemini Live voice proxy.
 *
 * Pipeline:
 *   Mic → AudioWorklet (PCM16 @ 16 kHz) → WS → backend proxy → Gemini Live
 *   Gemini Live → backend proxy → WS → AudioContext (decode + play PCM24 output)
 *
 * Message protocol (JSON from/to backend):
 *   → { type: 'config', language: 'hi-IN' }          — sent on connect
 *   → { type: 'end_of_speech' }                       — sent when mic stops
 *   → { type: 'text_input', text: '...' }             — typed fallback
 *   ← { type: 'session_ready' }                       — Gemini connected
 *   ← { type: 'error', message: '...' }               — proxy error
 *   ← { type: 'gemini_closed', code, reason }         — Gemini dropped
 *   ← (binary JSON from Gemini relayed verbatim)      — audio/transcript/turns
 *
 * Gemini Live response shapes we handle:
 *   { serverContent: { modelTurn: { parts: [{ inlineData: { data, mimeType } }] } } }
 *   { serverContent: { modelTurn: { parts: [{ text: '...' }] } } }
 *   { serverContent: { turnComplete: true } }
 *   { setupComplete: {} }
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VoiceState, VoiceTurn } from '../types/voice';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_WS_URL =
  (import.meta.env.VITE_API_WS_URL as string | undefined) ??
  'ws://localhost:4000/ws/voice';

// PCM capture: 16 kHz mono, matching what Gemini Live expects
const SAMPLE_RATE   = 16000;
const CHUNK_MS      = 100; // send audio every 100ms
const CHUNK_SAMPLES = (SAMPLE_RATE * CHUNK_MS) / 1000; // = 1600 samples

// ─── PCM Worklet script (inlined as blob URL) ─────────────────────────────────
// Converts Float32 mic samples → Int16 PCM and posts chunks to the main thread.
const WORKLET_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = new Float32Array(0);
    this._chunkSize = ${CHUNK_SAMPLES};
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    const combined = new Float32Array(this._buf.length + input.length);
    combined.set(this._buf);
    combined.set(input, this._buf.length);
    this._buf = combined;
    while (this._buf.length >= this._chunkSize) {
      const chunk = this._buf.slice(0, this._chunkSize);
      this._buf = this._buf.slice(this._chunkSize);
      // Convert Float32 → Int16
      const pcm = new Int16Array(chunk.length);
      for (let i = 0; i < chunk.length; i++) {
        const s = Math.max(-1, Math.min(1, chunk[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCaptureProcessor);
`;

function createWorkletBlobUrl(): string {
  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface GeminiLiveHook {
  state:       VoiceState;
  turns:       VoiceTurn[];
  isSupported: boolean;
  error:       string | null;
  startSession:   (language: string) => Promise<void>;
  stopSession:    () => void;
  sendTextInput:  (text: string) => void;
  clearHistory:   () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGeminiLive(): GeminiLiveHook {
  const [state, setState]   = useState<VoiceState>('idle');
  const [turns, setTurns]   = useState<VoiceTurn[]>([]);
  const [error, setError]   = useState<string | null>(null);

  const wsRef              = useRef<WebSocket | null>(null);
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const workletNodeRef     = useRef<AudioWorkletNode | null>(null);
  const streamRef          = useRef<MediaStream | null>(null);
  const workletUrlRef      = useRef<string | null>(null);
  // Queue of audio chunks arriving from Gemini, played sequentially
  const audioQueueRef      = useRef<ArrayBuffer[]>([]);
  const isPlayingRef       = useRef(false);
  // Accumulate text transcript for the current assistant turn
  const currentTurnTextRef = useRef('');
  const currentTurnIdRef   = useRef('');

  const isSupported =
    typeof window !== 'undefined' &&
    'AudioContext' in window &&
    'MediaDevices' in window &&
    typeof window.WebSocket !== 'undefined';

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    // Stop mic stream
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;

    // Disconnect worklet
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    // Close audio context
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    audioCtxRef.current = null;

    // Revoke worklet blob URL
    if (workletUrlRef.current) {
      URL.revokeObjectURL(workletUrlRef.current);
      workletUrlRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }
    wsRef.current = null;

    audioQueueRef.current = [];
    isPlayingRef.current  = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { cleanup(); }, [cleanup]);

  // ── Audio playback — drain queue ────────────────────────────────────────────
  const playNextChunk = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;

    try {
      const ctx = audioCtxRef.current;
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') await ctx.resume();

      // Gemini Live outputs PCM16 LE @ 24 kHz mono
      const pcm16    = new Int16Array(chunk);
      const floats   = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        floats[i] = pcm16[i] / 32768;
      }

      const outputRate    = 24000;
      const audioBuffer   = ctx.createBuffer(1, floats.length, outputRate);
      audioBuffer.copyToChannel(floats, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          playNextChunk();
        } else {
          // No more audio — if turn was complete, go idle
          setState(prev => prev === 'speaking' ? 'idle' : prev);
        }
      };
      source.start();
    } catch (e) {
      console.error('[gemini-live] audio playback error:', e);
      isPlayingRef.current = false;
    }
  }, []);

  // ── Handle messages from backend proxy ─────────────────────────────────────
  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data;

    // Binary = raw audio PCM16 from Gemini
    if (data instanceof ArrayBuffer || data instanceof Blob) {
      const processBuffer = (buf: ArrayBuffer) => {
        audioQueueRef.current.push(buf);
        setState('speaking');
        playNextChunk();
      };
      if (data instanceof Blob) {
        data.arrayBuffer().then(processBuffer);
      } else {
        processBuffer(data);
      }
      return;
    }

    // JSON message
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data as string) as Record<string, unknown>;
    } catch {
      return;
    }

    // ── Proxy control messages ──────────────────────────────────────────────
    const msgType = msg.type as string | undefined;

    if (msgType === 'session_ready') {
      console.log('[gemini-live] session ready — starting mic capture');
      setState('listening');
      return;
    }

    if (msgType === 'error') {
      setError((msg.message as string) ?? 'Voice session error');
      setState('error');
      return;
    }

    if (msgType === 'gemini_closed') {
      console.warn('[gemini-live] Gemini closed:', msg.code, msg.reason);
      if (state !== 'idle') setState('idle');
      return;
    }

    // ── Gemini Live response shapes ─────────────────────────────────────────
    const serverContent = msg.serverContent as Record<string, unknown> | undefined;
    if (!serverContent) return;

    // ── Audio output chunks ─────────────────────────────────────────────────
    const modelTurn = serverContent.modelTurn as Record<string, unknown> | undefined;
    if (modelTurn) {
      const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
      if (parts) {
        for (const part of parts) {
          // Inline audio data (base64 PCM16)
          const inlineData = part.inlineData as Record<string, unknown> | undefined;
          if (inlineData?.data) {
            const b64    = inlineData.data as string;
            const binary = atob(b64);
            const buf    = new ArrayBuffer(binary.length);
            const view   = new Uint8Array(buf);
            for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
            audioQueueRef.current.push(buf);
            setState('speaking');
            playNextChunk();
          }

          // Text part — accumulate for the conversation UI
          if (part.text) {
            const text = part.text as string;
            currentTurnTextRef.current += text;
            if (!currentTurnIdRef.current) {
              currentTurnIdRef.current = `turn-${Date.now()}-assistant`;
              setTurns(prev => [...prev, {
                id:        currentTurnIdRef.current,
                role:      'assistant' as const,
                text:      currentTurnTextRef.current,
                timestamp: Date.now(),
              }].slice(-50));
            } else {
              const id = currentTurnIdRef.current;
              setTurns(prev => prev.map(t =>
                t.id === id ? { ...t, text: currentTurnTextRef.current } : t,
              ));
            }
          }
        }
      }
    }

    // ── Output audio transcription — full transcript of what Gemini said ────
    // This is the reliable source; use it to replace any partial text accumulated above
    const outputTranscription = serverContent.outputTranscription as
      Record<string, unknown> | undefined;
    if (outputTranscription?.text) {
      const text = outputTranscription.text as string;
      if (currentTurnIdRef.current) {
        const id = currentTurnIdRef.current;
        setTurns(prev => prev.map(t => t.id === id ? { ...t, text } : t));
      } else {
        // Transcription arrived without a prior text part — create the turn now
        const id = `turn-${Date.now()}-assistant`;
        currentTurnIdRef.current = id;
        setTurns(prev => [...prev, {
          id, role: 'assistant' as const, text, timestamp: Date.now(),
        }].slice(-50));
      }
    }

    // ── Turn complete ───────────────────────────────────────────────────────
    if (serverContent.turnComplete) {
      currentTurnTextRef.current = '';
      currentTurnIdRef.current   = '';
      if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
        setState('listening');
      }
    }

    // ── Input transcription — what the user said ────────────────────────────
    const inputTranscription = serverContent.inputTranscription as
      Record<string, unknown> | undefined;
    if (inputTranscription?.text) {
      const text = inputTranscription.text as string;
      setTurns(prev => [...prev, {
        id:        `turn-${Date.now()}-user`,
        role:      'user' as const,
        text,
        timestamp: Date.now(),
      }].slice(-50));
    }
  }, [playNextChunk, state]);

  // ── Start a new voice session ───────────────────────────────────────────────
  const startSession = useCallback(async (language: string) => {
    if (!isSupported) {
      setError('Voice is not supported in this browser. Try Chrome or Edge.');
      setState('error');
      return;
    }

    // Clean up any previous session first
    cleanup();
    setError(null);
    setState('processing'); // show "connecting..."

    try {
      // 1. Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // 2. Create AudioContext + worklet
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioCtxRef.current = ctx;

      const blobUrl = createWorkletBlobUrl();
      workletUrlRef.current = blobUrl;
      await ctx.audioWorklet.addModule(blobUrl);

      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm-capture');
      workletNodeRef.current = worklet;

      // Pipe mic → worklet
      source.connect(worklet);
      // worklet has no audio output — we only want the port messages

      // 3. Connect to backend WebSocket
      const ws = new WebSocket(API_WS_URL);
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        // Send config (language) — backend will connect to Gemini on receipt
        ws.send(JSON.stringify({ type: 'config', language }));
      });

      ws.addEventListener('message', handleMessage);

      ws.addEventListener('error', () => {
        setError('Cannot connect to voice server. Make sure the API is running on port 4000.');
        setState('error');
        cleanup();
      });

      ws.addEventListener('close', (ev) => {
        if (ev.code !== 1000 && ev.code !== 1001) {
          // Unexpected close
          setError(`Voice connection closed (${ev.code}).`);
          setState('error');
        }
      });

      // 4. Worklet sends PCM chunks — forward over WebSocket
      worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

    } catch (e) {
      const msg = (e as Error).message ?? 'Failed to start voice session';
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        setError('Microphone permission denied. Please allow mic access and try again.');
      } else {
        setError(msg);
      }
      setState('error');
      cleanup();
    }
  }, [isSupported, cleanup, handleMessage]);

  // ── Stop the session ────────────────────────────────────────────────────────
  const stopSession = useCallback(() => {
    // Signal end of speech before closing
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_of_speech' }));
    }
    cleanup();
    setState('idle');
  }, [cleanup]);

  // ── Send typed text ─────────────────────────────────────────────────────────
  const sendTextInput = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text_input', text }));
      setTurns(prev => [...prev, {
        id: `turn-${Date.now()}-user`,
        role: 'user' as const,
        text,
        timestamp: Date.now(),
      }].slice(-50));
      setState('processing');
    }
  }, []);

  // ── Clear conversation ──────────────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setTurns([]);
    setError(null);
    currentTurnTextRef.current = '';
    currentTurnIdRef.current   = '';
  }, []);

  return {
    state,
    turns,
    isSupported,
    error,
    startSession,
    stopSession,
    sendTextInput,
    clearHistory,
  };
}
