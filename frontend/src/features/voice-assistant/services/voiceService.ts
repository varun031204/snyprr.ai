// ─── Voice Service — provider abstraction ────────────────────────────────────
// Thin wrappers around the browser Web Speech API.
// Exported functions are consumed by the hooks layer.

// ─── Markdown / formatting cleanup ───────────────────────────────────────────

/**
 * Strip markdown syntax and excess whitespace from text before TTS.
 * Matches the cleanText pattern used in SnyprAIChat.
 */
export function cleanTextForSpeech(raw: string): string {
  return raw
    // Remove code blocks (```...```)
    .replace(/```[\s\S]*?```/g, 'code block omitted')
    // Remove inline code
    .replace(/`[^`]+`/g, match => match.slice(1, -1))
    // Remove bold/italic markers
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    // Remove heading hashes
    .replace(/^#{1,6}\s+/gm, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove link syntax [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bullet/numbered list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Web Speech API type shims ────────────────────────────────────────────────
// The standard SpeechRecognition is only in the webkit-prefixed form in many
// browsers. We declare minimal interfaces here so TS doesn't complain.

export interface ISpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): { transcript: string };
  [index: number]: { transcript: string };
}
export interface ISpeechRecognitionResultList {
  readonly length: number;
  readonly resultIndex: number;
  [index: number]: ISpeechRecognitionResult;
}
export interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: ISpeechRecognitionResultList;
}
export interface ISpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
export interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart:  ((this: ISpeechRecognition, ev: Event) => void) | null;
  onend:    ((this: ISpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
  onerror:  ((this: ISpeechRecognition, ev: ISpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ISpeechRecognitionConstructor = new () => ISpeechRecognition;

interface SpeechWindow {
  SpeechRecognition?: ISpeechRecognitionConstructor;
  webkitSpeechRecognition?: ISpeechRecognitionConstructor;
}

// ─── Speech Recognition ───────────────────────────────────────────────────────

/** Returns true if the browser supports the Web Speech API recognition */
export function isSpeechRecognitionSupported(): boolean {
  const w = window as unknown as SpeechWindow;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function createSpeechRecognition(): ISpeechRecognition | null {
  if (!isSpeechRecognitionSupported()) return null;
  const w = window as unknown as SpeechWindow;
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

// ─── Text-to-Speech ───────────────────────────────────────────────────────────

/** Returns true if the browser supports speech synthesis */
export function isSpeechSynthesisSupported(): boolean {
  return 'speechSynthesis' in window;
}

/**
 * Returns a promise that resolves with the available voices.
 * Handles the async nature of voiceschanged across browsers.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }
    // Some browsers fire voiceschanged before voices are available
    const handler = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Timeout fallback after 2s
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}

/** Cancel any ongoing speech immediately */
export function cancelSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}

// ─── Language detection heuristic ────────────────────────────────────────────

// Script-range maps for quick language detection from transcript text
const SCRIPT_RANGES: Array<{ test: RegExp; lang: string }> = [
  { test: /[\u0900-\u097F]/, lang: 'hi-IN' }, // Devanagari → Hindi/Marathi
  { test: /[\u0980-\u09FF]/, lang: 'bn-IN' }, // Bengali
  { test: /[\u0C00-\u0C7F]/, lang: 'te-IN' }, // Telugu
  { test: /[\u0B80-\u0BFF]/, lang: 'ta-IN' }, // Tamil
  { test: /[\u0C80-\u0CFF]/, lang: 'kn-IN' }, // Kannada
  { test: /[\u0D00-\u0D7F]/, lang: 'ml-IN' }, // Malayalam
  { test: /[\u0A80-\u0AFF]/, lang: 'gu-IN' }, // Gujarati
  { test: /[\u0A00-\u0A7F]/, lang: 'pa-IN' }, // Gurmukhi → Punjabi
  { test: /[\u0B00-\u0B7F]/, lang: 'or-IN' }, // Odia
  { test: /[\u0600-\u06FF]/, lang: 'ur-IN' }, // Arabic script → Urdu
  { test: /[\u4E00-\u9FFF]/, lang: 'zh-CN' }, // CJK → Chinese
  { test: /[\u3040-\u30FF]/, lang: 'ja-JP' }, // Hiragana/Katakana → Japanese
  { test: /[\uAC00-\uD7AF]/, lang: 'ko-KR' }, // Hangul → Korean
  { test: /[\u0400-\u04FF]/, lang: 'ru-RU' }, // Cyrillic → Russian
  { test: /[\u0370-\u03FF]/, lang: 'el-GR' }, // Greek
  { test: /[\u0E00-\u0E7F]/, lang: 'th-TH' }, // Thai
  { test: /[\u0600-\u06FF]/, lang: 'ar-SA' }, // Arabic
];

/**
 * Attempt to detect language from transcript text using Unicode script ranges.
 * Falls back to `fallback` if no script is detected (likely Latin-based).
 */
export function detectLanguageFromText(text: string, fallback: string): string {
  for (const { test, lang } of SCRIPT_RANGES) {
    if (test.test(text)) return lang;
  }
  return fallback;
}
