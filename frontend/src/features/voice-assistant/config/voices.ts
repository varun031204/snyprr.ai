import type { VoiceGender, VoiceOption } from '../types/voice';

// ─── Voice Profiles ───────────────────────────────────────────────────────────
// These are logical profiles. At runtime we match against window.speechSynthesis
// .getVoices() using the gender and lang hints.

export const VOICE_PROFILES: VoiceOption[] = [
  // Generic auto-select entries (used when no better match exists)
  { id: 'auto-female', label: 'Assistant (Female)', gender: 'female', lang: 'auto' },
  { id: 'auto-male',   label: 'Assistant (Male)',   gender: 'male',   lang: 'auto' },

  // English (India)
  { id: 'en-IN-female', label: 'Priya (English IN)',  gender: 'female', lang: 'en-IN' },
  { id: 'en-IN-male',   label: 'Arjun (English IN)',  gender: 'male',   lang: 'en-IN' },

  // Hindi
  { id: 'hi-IN-female', label: 'Ananya (Hindi)',      gender: 'female', lang: 'hi-IN' },
  { id: 'hi-IN-male',   label: 'Rohan (Hindi)',       gender: 'male',   lang: 'hi-IN' },

  // English (US)
  { id: 'en-US-female', label: 'Aria (English US)',   gender: 'female', lang: 'en-US' },
  { id: 'en-US-male',   label: 'Ryan (English US)',   gender: 'male',   lang: 'en-US' },

  // English (UK)
  { id: 'en-GB-female', label: 'Emma (English UK)',   gender: 'female', lang: 'en-GB' },
  { id: 'en-GB-male',   label: 'Oliver (English UK)', gender: 'male',   lang: 'en-GB' },
];

// ─── Runtime voice selection ──────────────────────────────────────────────────

/** Gender-hint keywords found in SpeechSynthesisVoice.name */
const FEMALE_KEYWORDS = ['female', 'woman', 'girl', 'she', 'priya', 'ananya', 'aria',
  'emma', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa',
  'alice', 'anna', 'helena', 'laura', 'paulina', 'sara', 'amelie', 'ioana',
  'nora', 'lekha', 'aditi', 'heami', 'sin-ji'];

const MALE_KEYWORDS = ['male', 'man', 'guy', 'he', 'arjun', 'rohan', 'ryan',
  'oliver', 'daniel', 'thomas', 'jorge', 'diego', 'reed', 'ralph', 'luca',
  'rishi', 'yuri', 'markus', 'oskar'];

function guessGender(voice: SpeechSynthesisVoice): VoiceGender {
  const name = voice.name.toLowerCase();
  if (FEMALE_KEYWORDS.some(k => name.includes(k))) return 'female';
  if (MALE_KEYWORDS.some(k => name.includes(k))) return 'male';
  // Even index = female, odd = male as tiebreaker (browser-dependent but better than random)
  return 'female';
}

/**
 * Select the best matching SpeechSynthesisVoice for a given lang + gender.
 * Priority: exact lang + correct gender > base lang + correct gender > any gender > first available
 */
export function selectVoice(
  availableVoices: SpeechSynthesisVoice[],
  lang: string,
  gender: VoiceGender,
): SpeechSynthesisVoice | null {
  if (!availableVoices.length) return null;

  const base = lang.split('-')[0];

  // 1. Exact lang + correct gender
  const exactGender = availableVoices.filter(
    v => v.lang === lang && guessGender(v) === gender,
  );
  if (exactGender.length) return exactGender[0];

  // 2. Exact lang, any gender
  const exact = availableVoices.filter(v => v.lang === lang);
  if (exact.length) return exact[0];

  // 3. Base lang match + correct gender (e.g. 'hi' for 'hi-IN')
  const baseGender = availableVoices.filter(
    v => v.lang.startsWith(base) && guessGender(v) === gender,
  );
  if (baseGender.length) return baseGender[0];

  // 4. Base lang, any gender
  const baseMatch = availableVoices.filter(v => v.lang.startsWith(base));
  if (baseMatch.length) return baseMatch[0];

  // 5. Fallback: en-IN or en-US + gender
  const fallbackLangs = ['en-IN', 'en-US', 'en-GB'];
  for (const fb of fallbackLangs) {
    const fbGender = availableVoices.filter(
      v => v.lang === fb && guessGender(v) === gender,
    );
    if (fbGender.length) return fbGender[0];
  }

  // 6. Absolute fallback: first available voice
  return availableVoices[0];
}
