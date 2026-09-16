// ─── Voice Assistant Types ────────────────────────────────────────────────────

/** The state machine for the voice assistant */
export type VoiceState =
  | 'idle'        // waiting for user to tap
  | 'listening'   // recording user speech
  | 'processing'  // sending to AI
  | 'speaking'    // playing TTS
  | 'error';      // something went wrong

/** Genders for voice selection */
export type VoiceGender = 'female' | 'male';

/** A single language entry in the registry */
export interface VoiceLanguage {
  /** BCP-47 code used by SpeechRecognition (e.g. 'hi-IN', 'en-US') */
  code: string;
  /** Human-readable label */
  label: string;
  /** Short label for compact UI (e.g. 'Hindi', 'English') */
  short: string;
  /** Flag emoji */
  flag: string;
  /** Region group */
  group: 'indian' | 'international';
}

/** A concrete TTS voice entry */
export interface VoiceOption {
  id: string;
  label: string;
  gender: VoiceGender;
  /** BCP-47 language code this voice is designed for — may be 'auto' */
  lang: string;
}

/** Settings persisted to localStorage */
export interface VoiceSettings {
  language: string;          // BCP-47 code
  gender: VoiceGender;
  speed: number;             // 0.5 – 2.0
  volume: number;            // 0 – 1
  autoDetect: boolean;
  continuous: boolean;
}

/** A single turn in the voice conversation */
export interface VoiceTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  lang?: string;             // detected language for this turn
  timestamp: number;
}

/** Abstraction returned by the STT provider hook */
export interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  detectedLang: string | null;
  isSupported: boolean;
  start: (lang: string) => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

/** Abstraction returned by the TTS provider hook */
export interface TextToSpeechHook {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, lang: string, gender: VoiceGender, speed: number, volume: number) => void;
  stop: () => void;
  error: string | null;
}

/** Props passed to the main VoiceAssistant component */
export interface VoiceAssistantProps {
  /** Optional: share history with text chatbot for unified context */
  sharedHistory?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  onHistoryUpdate?: (history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>) => void;
}
