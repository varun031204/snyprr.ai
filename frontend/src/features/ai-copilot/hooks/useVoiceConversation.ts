import { useState, useRef, useCallback, useEffect } from 'react';
import { matchWakeWord, isStopCommand, playWakeChime, playSleepChime } from '../utils/wakeWord';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface UseVoiceConversationOptions {
  onAIResponse: (text: string) => Promise<string>;
  onWakeWordDetected?: (query: string) => void;
  initialWakeWordEnabled?: boolean;
}

interface UseVoiceConversationReturn {
  voiceState: VoiceState;
  amplitude: number;
  subtitle: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  errorMessage: string | null;
  isSupported: boolean;
  wakeWordEnabled: boolean;
  isWakeWordListening: boolean;
  wakeWordDetectedText: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleWakeWord: () => void;
  setWakeWordEnabled: (enabled: boolean) => void;
  endConversation: () => void;
  retryPermission: () => void;
}

// ── Browser API type shims ────────────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    webkitAudioContext: typeof AudioContext;
  }
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionResult) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
}

interface SpeechRecognitionResult {
  results: {
    [index: number]: { [index: number]: { transcript: string; confidence: number } };
    length: number;
  };
}

// ── Voice selection priority tiers ────────────────────────────────────────────
interface VoiceTier {
  filter: (v: SpeechSynthesisVoice) => boolean;
}

const VOICE_TIERS: VoiceTier[] = [
  // Tier 1 — Google Neural / Microsoft Neural (best quality)
  {
    filter: (v) =>
      /Google US English|Google UK English Female|Microsoft Aria|Microsoft Guy|Microsoft Jenny|Microsoft Eric|Microsoft Michelle/i.test(v.name),
  },
  // Tier 2 — Any "Natural", "Neural", "Premium", or "Enhanced" voice in English
  {
    filter: (v) =>
      /natural|neural|premium|enhanced/i.test(v.name) &&
      /^en/i.test(v.lang),
  },
  // Tier 3 — Known high-quality Apple/macOS English voices
  {
    filter: (v) =>
      /^(Samantha|Daniel|Karen|Moira|Tessa|Victoria|Fiona|Alex|Siri)/i.test(v.name),
  },
  // Tier 4 — Any en-US voice (standard quality but correct accent)
  {
    filter: (v) => /^en[-_]US/i.test(v.lang),
  },
  // Tier 5 — Any English voice (en-GB, en-AU, etc.) as a last resort
  {
    filter: (v) => /^en/i.test(v.lang),
  },
];

function pickBestEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  for (const tier of VOICE_TIERS) {
    const match = voices.find(tier.filter);
    if (match) return match;
  }
  return voices[0];
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) {
      resolve(immediate);
      return;
    }
    const onChanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onChanged, { once: true });
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 2000);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useVoiceConversation({
  onAIResponse,
  onWakeWordDetected,
  initialWakeWordEnabled = true,
}: UseVoiceConversationOptions): UseVoiceConversationReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [subtitle, setSubtitle] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Wake word state
  const [wakeWordEnabled, setWakeWordEnabledState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('snyprr_wakeword_enabled');
      if (stored !== null) return stored === 'true';
    }
    return initialWakeWordEnabled;
  });
  const [isWakeWordListening, setIsWakeWordListening] = useState(false);
  const [wakeWordDetectedText, setWakeWordDetectedText] = useState<string | null>(null);

  // ── Mutable control state lives in refs ──────────────────────────────────
  const voiceStateRef   = useRef<VoiceState>('idle');
  voiceStateRef.current = voiceState;

  const isActiveRef     = useRef(false); // active full conversation loop running
  const isBusyRef       = useRef(false); // AI thinking or TTS speaking
  const isMutedRef      = useRef(false);
  const isSpeakerOnRef  = useRef(true);
  const wakeWordEnabledRef = useRef(wakeWordEnabled);
  wakeWordEnabledRef.current = wakeWordEnabled;

  const onAIResponseRef = useRef(onAIResponse);
  onAIResponseRef.current = onAIResponse;

  const onWakeWordDetectedRef = useRef(onWakeWordDetected);
  onWakeWordDetectedRef.current = onWakeWordDetected;

  const startRecognitionRef = useRef<() => void>(() => {});
  const startWakeWordRecognitionRef = useRef<() => void>(() => {});

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const streamRef      = useRef<MediaStream | null>(null);
  const rafRef         = useRef<number>(0);
  const cachedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const SpeechRecognitionClass: (new () => SpeechRecognitionInstance) | undefined =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : undefined;

  const isSupported = !!SpeechRecognitionClass;

  // ── Pre-load voices on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    loadVoices().then((voices) => {
      cachedVoiceRef.current = pickBestEnglishVoice(voices);
    });

    const handleVoicesChanged = () => {
      cachedVoiceRef.current = pickBestEnglishVoice(
        window.speechSynthesis.getVoices(),
      );
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    return () =>
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
  }, []);

  // ── Amplitude meter ───────────────────────────────────────────────────────
  const startAmplitude = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      setAmplitude(Math.min(Math.sqrt(sum / buf.length) * 6, 1));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopAmplitude = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setAmplitude(0);
  }, []);

  // ── Mic setup ─────────────────────────────────────────────────────────────
  const setupMic = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an  = ctx.createAnalyser();
      an.fftSize = 512;
      src.connect(an);
      analyserRef.current = an;
      return true;
    } catch {
      setErrorMessage('Microphone access denied. Please allow microphone access in your browser settings.');
      setVoiceState('error');
      return false;
    }
  }, []);

  const teardownMic = useCallback(() => {
    stopAmplitude();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current   = null;
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, [stopAmplitude]);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone: () => void) => {
    window.speechSynthesis.cancel();
    setVoiceState('speaking');

    // Strip markdown formatting for natural voice output
    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s?/g, '')
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1')
      .replace(/[•·▲▼]\s*/g, '')
      .replace(/\[LIVE MARKET DATA.*?\]/gs, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    setSubtitle(clean);

    if (!isSpeakerOnRef.current) {
      setTimeout(() => { setSubtitle(''); onDone(); }, 3500);
      return;
    }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang   = 'en-US';
    utter.rate   = 0.95;
    utter.pitch  = 1.0;
    utter.volume = 1.0;

    const doSpeak = (voice: SpeechSynthesisVoice | null) => {
      if (voice) {
        utter.voice = voice;
        if (voice.lang && /^en/i.test(voice.lang)) {
          utter.lang = voice.lang;
        }
      }

      const keepAlive = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      utter.onend = () => {
        clearInterval(keepAlive);
        setSubtitle('');
        onDone();
      };
      utter.onerror = () => {
        clearInterval(keepAlive);
        setSubtitle('');
        onDone();
      };

      window.speechSynthesis.speak(utter);
    };

    if (cachedVoiceRef.current) {
      doSpeak(cachedVoiceRef.current);
    } else {
      loadVoices().then((voices) => {
        const voice = pickBestEnglishVoice(voices);
        cachedVoiceRef.current = voice;
        doSpeak(voice);
      });
    }
  }, []);

  // ── Active Speech Recognition Loop ────────────────────────────────────────
  const doStartRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    if (!isActiveRef.current) return;
    if (isBusyRef.current)    return;
    if (isMutedRef.current)   return;

    try { recognitionRef.current?.abort(); } catch { /* ignore */ }

    const rec = new SpeechRecognitionClass();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    let gotResult = false;

    rec.onresult = async (e: SpeechRecognitionResult) => {
      const transcript = e.results[0][0].transcript.trim();
      if (!transcript || gotResult) return;
      gotResult = true;

      // Check for stop commands ("stop", "cancel", "sleep", "goodbye")
      if (isStopCommand(transcript)) {
        playSleepChime();
        isActiveRef.current = false;
        isBusyRef.current   = false;
        stopAmplitude();
        setVoiceState('idle');
        setSubtitle('Standing by. Say "Hey Snyperr AI" to wake up.');
        setTimeout(() => setSubtitle(''), 3000);
        // Automatically re-arm wake word listener
        if (wakeWordEnabledRef.current) {
          setTimeout(() => startWakeWordRecognitionRef.current(), 500);
        }
        return;
      }

      // Check if user repeated the wake word + question
      const wakeMatch = matchWakeWord(transcript);
      const promptText = wakeMatch.matched && wakeMatch.query ? wakeMatch.query : transcript;

      isBusyRef.current = true;
      stopAmplitude();
      setVoiceState('thinking');
      setSubtitle('');

      try {
        const responseText = await onAIResponseRef.current(promptText);
        speak(responseText, () => {
          isBusyRef.current = false;
          if (isActiveRef.current && !isMutedRef.current) {
            setVoiceState('listening');
            startAmplitude();
            setTimeout(() => startRecognitionRef.current(), 500);
          } else {
            setVoiceState('idle');
            if (wakeWordEnabledRef.current) {
              setTimeout(() => startWakeWordRecognitionRef.current(), 300);
            }
          }
        });
      } catch {
        isBusyRef.current = false;
        if (isActiveRef.current && !isMutedRef.current) {
          setVoiceState('listening');
          startAmplitude();
          setTimeout(() => startRecognitionRef.current(), 500);
        } else {
          setVoiceState('idle');
          if (wakeWordEnabledRef.current) {
            setTimeout(() => startWakeWordRecognitionRef.current(), 300);
          }
        }
      }
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please allow it in your browser and try again.');
        setVoiceState('error');
        isActiveRef.current = false;
        setIsWakeWordListening(false);
      }
    };

    rec.onend = () => {
      if (!gotResult && isActiveRef.current && !isBusyRef.current && !isMutedRef.current) {
        setTimeout(() => startRecognitionRef.current(), 150);
      }
    };

    try { rec.start(); } catch { /* ignore */ }
  }, [SpeechRecognitionClass, stopAmplitude, startAmplitude, speak]);

  startRecognitionRef.current = doStartRecognition;

  // ── Wake Word Recognition Loop (Active when idle) ─────────────────────────
  const doStartWakeWordRecognition = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    if (isActiveRef.current)  return; // Active conversation takes priority
    if (isBusyRef.current)    return; // Do not listen while thinking or speaking
    if (isMutedRef.current)   return;
    if (!wakeWordEnabledRef.current) {
      setIsWakeWordListening(false);
      return;
    }

    try { recognitionRef.current?.abort(); } catch { /* ignore */ }

    const rec = new SpeechRecognitionClass();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = 'en-US';
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;
    setIsWakeWordListening(true);

    let wakeDetected = false;

    rec.onresult = async (e: SpeechRecognitionResult) => {
      const transcript = e.results[0][0].transcript.trim();
      if (!transcript) return;

      const result = matchWakeWord(transcript);
      if (!result.matched) return; // Not a wake phrase — ignore

      wakeDetected = true;
      setIsWakeWordListening(false);

      // Play the futuristic wake-up chime!
      playWakeChime();

      setWakeWordDetectedText('⚡ Hey Snyperr AI detected!');
      setTimeout(() => setWakeWordDetectedText(null), 3000);

      onWakeWordDetectedRef.current?.(result.query);

      // If user also spoke a question with the wake word (e.g. "Hey Snyperr AI, analyze BTC"):
      if (result.query) {
        isActiveRef.current = true;
        isBusyRef.current   = true;
        setVoiceState('thinking');
        setSubtitle('');

        try {
          const responseText = await onAIResponseRef.current(result.query);
          speak(responseText, () => {
            isBusyRef.current = false;
            // After answering, remain in listening mode for follow-up
            if (isActiveRef.current && !isMutedRef.current) {
              setVoiceState('listening');
              startAmplitude();
              setTimeout(() => startRecognitionRef.current(), 500);
            } else {
              setVoiceState('idle');
              if (wakeWordEnabledRef.current) {
                setTimeout(() => startWakeWordRecognitionRef.current(), 300);
              }
            }
          });
        } catch {
          isBusyRef.current = false;
          setVoiceState('listening');
          startAmplitude();
          setTimeout(() => startRecognitionRef.current(), 500);
        }
      } else {
        // User just called the wake word alone ("Hey Snyperr AI")
        // Transition directly to listening mode with mic & visuals active!
        if (!streamRef.current) {
          await setupMic();
        }
        isActiveRef.current = true;
        isBusyRef.current   = false;
        setVoiceState('listening');
        setSubtitle("I'm listening! Ask me anything...");
        startAmplitude();
        setTimeout(() => startRecognitionRef.current(), 300);
      }
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error === 'not-allowed') {
        setIsWakeWordListening(false);
      }
    };

    rec.onend = () => {
      if (!wakeDetected && !isActiveRef.current && !isBusyRef.current && !isMutedRef.current && wakeWordEnabledRef.current) {
        // Automatically re-arm wake word detection
        setTimeout(() => startWakeWordRecognitionRef.current(), 200);
      } else if (!wakeWordEnabledRef.current) {
        setIsWakeWordListening(false);
      }
    };

    try { rec.start(); } catch { /* ignore */ }
  }, [SpeechRecognitionClass, setupMic, startAmplitude, speak]);

  startWakeWordRecognitionRef.current = doStartWakeWordRecognition;

  // ── Public controls ───────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (isMutedRef.current) return;
    setErrorMessage(null);

    if (!streamRef.current) {
      const ok = await setupMic();
      if (!ok) return;
    }

    isActiveRef.current = true;
    isBusyRef.current   = false;
    setVoiceState('listening');
    setSubtitle('');
    startAmplitude();
    startRecognitionRef.current();
  }, [setupMic, startAmplitude]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    isBusyRef.current   = false;
    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();
    stopAmplitude();
    setVoiceState('idle');
    setSubtitle('');

    // Re-arm wake word listening if enabled
    if (wakeWordEnabledRef.current) {
      setTimeout(() => startWakeWordRecognitionRef.current(), 400);
    }
  }, [stopAmplitude]);

  const endConversation = useCallback(() => {
    isActiveRef.current = false;
    isBusyRef.current   = false;
    recognitionRef.current?.abort();
    window.speechSynthesis.cancel();
    teardownMic();
    setVoiceState('idle');
    setSubtitle('');

    if (wakeWordEnabledRef.current) {
      setTimeout(() => startWakeWordRecognitionRef.current(), 500);
    }
  }, [teardownMic]);

  const toggleMute = useCallback(() => {
    const muted = !isMutedRef.current;
    isMutedRef.current = muted;
    setIsMuted(muted);
    if (muted) {
      recognitionRef.current?.abort();
      stopAmplitude();
      if (!isBusyRef.current) setVoiceState('idle');
      setIsWakeWordListening(false);
    } else {
      if (isActiveRef.current && !isBusyRef.current) {
        setVoiceState('listening');
        startAmplitude();
        startRecognitionRef.current();
      } else if (!isActiveRef.current && wakeWordEnabledRef.current) {
        startWakeWordRecognitionRef.current();
      }
    }
  }, [stopAmplitude, startAmplitude]);

  const toggleSpeaker = useCallback(() => {
    const on = !isSpeakerOnRef.current;
    isSpeakerOnRef.current = on;
    setIsSpeakerOn(on);
    if (!on) window.speechSynthesis.cancel();
  }, []);

  const setWakeWordEnabled = useCallback((enabled: boolean) => {
    wakeWordEnabledRef.current = enabled;
    setWakeWordEnabledState(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('snyprr_wakeword_enabled', String(enabled));
    }
    if (enabled && !isActiveRef.current && !isBusyRef.current && !isMutedRef.current) {
      startWakeWordRecognitionRef.current();
    } else if (!enabled) {
      if (!isActiveRef.current) {
        recognitionRef.current?.abort();
      }
      setIsWakeWordListening(false);
    }
  }, []);

  const toggleWakeWord = useCallback(() => {
    setWakeWordEnabled(!wakeWordEnabledRef.current);
  }, [setWakeWordEnabled]);

  const retryPermission = useCallback(() => {
    setErrorMessage(null);
    setVoiceState('idle');
    startListening();
  }, [startListening]);

  // Initial wake word arming on mount if enabled
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (wakeWordEnabledRef.current && isSupported) {
      // Delay slightly to allow components to mount and voices to load
      const t = setTimeout(() => {
        if (!isActiveRef.current && !isBusyRef.current) {
          startWakeWordRecognitionRef.current();
        }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isSupported]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      isBusyRef.current = false;
      recognitionRef.current?.abort();
      window.speechSynthesis.cancel();
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  return {
    voiceState,
    amplitude,
    subtitle,
    isMuted,
    isSpeakerOn,
    errorMessage,
    isSupported,
    wakeWordEnabled,
    isWakeWordListening,
    wakeWordDetectedText,
    startListening,
    stopListening,
    toggleMute,
    toggleSpeaker,
    toggleWakeWord,
    setWakeWordEnabled,
    endConversation,
    retryPermission,
  };
}
