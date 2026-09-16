import { useCallback, useEffect, useRef, useState } from 'react';
import type { TextToSpeechHook, VoiceGender } from '../types/voice';
import {
  cancelSpeech,
  cleanTextForSpeech,
  isSpeechSynthesisSupported,
  loadVoices,
} from '../services/voiceService';
import { selectVoice } from '../config/voices';

// ─── useTextToSpeech ──────────────────────────────────────────────────────────

export function useTextToSpeech(): TextToSpeechHook {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef     = useRef<SpeechSynthesisVoice[]>([]);
  const isSupported   = isSpeechSynthesisSupported();

  // ── Pre-load voices once ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSupported) return;
    loadVoices().then(v => { voicesRef.current = v; });

    // Re-load on voiceschanged (some browsers fire this multiple times)
    const handler = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
  }, [isSupported]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  // ── Speak ───────────────────────────────────────────────────────────────────
  const speak = useCallback(
    (
      text: string,
      lang: string,
      gender: VoiceGender,
      speed: number,
      volume: number,
    ) => {
      if (!isSupported) {
        setError('Text-to-speech is not supported in this browser.');
        return;
      }

      // Cancel any ongoing speech
      cancelSpeech();
      setError(null);

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.lang   = lang;
      utterance.rate   = Math.max(0.5, Math.min(2.0, speed));
      utterance.volume = Math.max(0,   Math.min(1.0, volume));
      utterance.pitch  = 1.0;

      // Pick the best available voice
      const voice = selectVoice(voicesRef.current, lang, gender);
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setError(null);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        // 'interrupted' is not a real error — user or code cancelled it
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          setError(`Speech synthesis error: ${event.error}`);
        }
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  // ── Stop ────────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    cancelSpeech();
    setIsSpeaking(false);
    utteranceRef.current = null;
  }, []);

  return { isSpeaking, isSupported, speak, stop, error };
}
