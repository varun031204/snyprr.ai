import type { VoiceLanguage } from '../types/voice';

// ─── Language Registry ────────────────────────────────────────────────────────

export const LANGUAGES: VoiceLanguage[] = [
  // ── Indian languages ─────────────────────────────────────────────────────
  { code: 'en-IN', label: 'English (India)',     short: 'English IN', flag: '🇮🇳', group: 'indian' },
  { code: 'hi-IN', label: 'Hindi',               short: 'Hindi',      flag: '🇮🇳', group: 'indian' },
  { code: 'bn-IN', label: 'Bengali',             short: 'Bengali',    flag: '🇮🇳', group: 'indian' },
  { code: 'te-IN', label: 'Telugu',              short: 'Telugu',     flag: '🇮🇳', group: 'indian' },
  { code: 'mr-IN', label: 'Marathi',             short: 'Marathi',    flag: '🇮🇳', group: 'indian' },
  { code: 'ta-IN', label: 'Tamil',               short: 'Tamil',      flag: '🇮🇳', group: 'indian' },
  { code: 'gu-IN', label: 'Gujarati',            short: 'Gujarati',   flag: '🇮🇳', group: 'indian' },
  { code: 'kn-IN', label: 'Kannada',             short: 'Kannada',    flag: '🇮🇳', group: 'indian' },
  { code: 'ml-IN', label: 'Malayalam',           short: 'Malayalam',  flag: '🇮🇳', group: 'indian' },
  { code: 'pa-IN', label: 'Punjabi',             short: 'Punjabi',    flag: '🇮🇳', group: 'indian' },
  { code: 'or-IN', label: 'Odia',                short: 'Odia',       flag: '🇮🇳', group: 'indian' },
  { code: 'as-IN', label: 'Assamese',            short: 'Assamese',   flag: '🇮🇳', group: 'indian' },
  { code: 'ur-IN', label: 'Urdu (India)',        short: 'Urdu IN',    flag: '🇮🇳', group: 'indian' },
  { code: 'ne-NP', label: 'Nepali',              short: 'Nepali',     flag: '🇳🇵', group: 'indian' },
  { code: 'sa-IN', label: 'Sanskrit',            short: 'Sanskrit',   flag: '🇮🇳', group: 'indian' },

  // ── International languages ───────────────────────────────────────────────
  { code: 'en-US', label: 'English (US)',        short: 'English US', flag: '🇺🇸', group: 'international' },
  { code: 'en-GB', label: 'English (UK)',        short: 'English UK', flag: '🇬🇧', group: 'international' },
  { code: 'es-ES', label: 'Spanish (Spain)',     short: 'Spanish',    flag: '🇪🇸', group: 'international' },
  { code: 'es-MX', label: 'Spanish (Mexico)',    short: 'Spanish MX', flag: '🇲🇽', group: 'international' },
  { code: 'fr-FR', label: 'French',              short: 'French',     flag: '🇫🇷', group: 'international' },
  { code: 'de-DE', label: 'German',              short: 'German',     flag: '🇩🇪', group: 'international' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)', short: 'Portuguese', flag: '🇧🇷', group: 'international' },
  { code: 'it-IT', label: 'Italian',             short: 'Italian',    flag: '🇮🇹', group: 'international' },
  { code: 'ja-JP', label: 'Japanese',            short: 'Japanese',   flag: '🇯🇵', group: 'international' },
  { code: 'ko-KR', label: 'Korean',              short: 'Korean',     flag: '🇰🇷', group: 'international' },
  { code: 'zh-CN', label: 'Chinese (Simplified)',short: 'Chinese',    flag: '🇨🇳', group: 'international' },
  { code: 'ar-SA', label: 'Arabic (Saudi)',      short: 'Arabic',     flag: '🇸🇦', group: 'international' },
  { code: 'ru-RU', label: 'Russian',             short: 'Russian',    flag: '🇷🇺', group: 'international' },
  { code: 'tr-TR', label: 'Turkish',             short: 'Turkish',    flag: '🇹🇷', group: 'international' },
  { code: 'nl-NL', label: 'Dutch',               short: 'Dutch',      flag: '🇳🇱', group: 'international' },
  { code: 'pl-PL', label: 'Polish',              short: 'Polish',     flag: '🇵🇱', group: 'international' },
  { code: 'sv-SE', label: 'Swedish',             short: 'Swedish',    flag: '🇸🇪', group: 'international' },
];

/** Look up a language entry by BCP-47 code */
export function findLanguage(code: string): VoiceLanguage | undefined {
  // Exact match first
  const exact = LANGUAGES.find(l => l.code === code);
  if (exact) return exact;
  // Fallback: match by base language (e.g. 'hi' matches 'hi-IN')
  const base = code.split('-')[0];
  return LANGUAGES.find(l => l.code.startsWith(base + '-'));
}

/** Return all languages in a given group */
export function getLanguagesByGroup(group: VoiceLanguage['group']): VoiceLanguage[] {
  return LANGUAGES.filter(l => l.group === group);
}

/** Default language code */
export const DEFAULT_LANGUAGE = 'en-IN';
