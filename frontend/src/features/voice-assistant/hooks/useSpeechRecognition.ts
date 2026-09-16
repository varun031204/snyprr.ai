import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechRecognitionHook } from '../types/voice';
import {
  createSpeechRecognition,
  detectLanguageFromText,
  isSpeechRecognitionSupported,
  type ISpeechRecognition,
  type ISpeechRecognitionEvent,
  type ISpeechRecognitionErrorEvent,
} from '../services/voiceService';

// ─── useSpeechRecognition ─────────────────────────────────────────────────────

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening]           = useState(false);
  const [transcript, setTranscript]             = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [detectedLang, setDetectedLang]         = useState<string | null>(null);
  const [error, setError]                       = useState<string | null>(null);

  const recognitionRef  = useRef<ISpeechRecognition | null>(null);
  const currentLangRef  = useRef<string>('en-IN');
  const isSupported     = isSpeechRecognitionSupported();

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────
  const start = useCallback((lang: string) => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Abort any existing instance first
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setDetectedLang(null);
    currentLangRef.current = lang;

    const recognition = createSpeechRecognition();
    if (!recognition) return;

    recognition.lang             = lang;
    recognition.continuous       = false;
    recognition.interimResults   = true;
    recognition.maxAlternatives  = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      let final   = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text   = result[0].transcript;
        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (interim) setInterimTranscript(interim);

      if (final) {
        setTranscript(final);
        setInterimTranscript('');
        // Detect language from the actual recognised text
        const detected = detectLanguageFromText(final, currentLangRef.current);
        setDetectedLang(detected);
      }
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      setIsListening(false);
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          setError('Microphone access denied. Please allow microphone permissions.');
          break;
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'network':
          setError('Network error during speech recognition.');
          break;
        case 'audio-capture':
          setError('Microphone not found or not working.');
          break;
        case 'aborted':
          // Intentional abort — not an error
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError(`Could not start recognition: ${(e as Error).message}`);
      setIsListening(false);
    }
  }, [isSupported]);

  // ── Stop ────────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript('');
    setInterimTranscript('');
    setDetectedLang(null);
    setError(null);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    detectedLang,
    isSupported,
    start,
    stop,
    reset,
    error,
  };
}
