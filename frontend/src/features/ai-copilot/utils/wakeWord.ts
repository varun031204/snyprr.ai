/**
 * Wake Word and Audio Feedback Utility for Snyprr AI
 *
 * Listens for wake phrases like:
 * - "Hey Snyperr AI" / "Hey Snyprr AI" / "Hey Sniper AI"
 * - "Hey Snyperr" / "Hey Snyprr" / "Hey Sniper"
 * - "Hi Snyperr AI" / "OK Snyperr AI" / "Snyperr AI"
 */

export interface WakeWordMatchResult {
  matched: boolean;
  query: string;
}

/**
 * Normalizes speech recognition transcripts and matches against wake phrases.
 * Supports phonetic variants produced by Web Speech engines for "Snyperr" / "Snyprr".
 */
export function matchWakeWord(rawTranscript: string): WakeWordMatchResult {
  if (!rawTranscript) return { matched: false, query: '' };

  const transcript = rawTranscript.trim();

  // Pattern 1: Greeting (hey/hi/hello/ok/okay) + Name (snyperr|snyprr|snyper|sniper|snippr|snypur|snypr|snipor) + optional (ai|a.i.)
  // Matches e.g. "Hey Snyperr AI, analyze BTC", "Hey Sniper what is eth?", "OK Snyprr AI"
  const patternGreeting = /^(?:.*?\b)?(?:hey|hi|hello|ok|okay)\s+(?:snyperr|snyprr|snyper|sniper|snippr|snypur|snypr|snipor)(?:\s+(?:ai|a\.i\.))?\b[\s,:—\-]*([\s\S]*)$/i;

  // Pattern 2: Name + AI without greeting prefix
  // Matches e.g. "Snyperr AI what is market trend?", "Sniper AI analyze gold"
  const patternDirect = /^(?:.*?\b)?(?:snyperr|snyprr|snyper|sniper|snippr|snypur|snypr|snipor)\s+(?:ai|a\.i\.)\b[\s,:—\-]*([\s\S]*)$/i;

  // Pattern 3: Standalone wake command e.g. "wake up snyperr" or "wake up sniper ai"
  const patternWakeUp = /^(?:.*?\b)?(?:wake\s+up)\s+(?:snyperr|snyprr|snyper|sniper)(?:\s+(?:ai|a\.i\.))?\b[\s,:—\-]*([\s\S]*)$/i;

  let match = transcript.match(patternGreeting);
  if (!match) {
    match = transcript.match(patternDirect);
  }
  if (!match) {
    match = transcript.match(patternWakeUp);
  }

  if (!match) {
    return { matched: false, query: '' };
  }

  // Clean up any remaining prefix punctuation from the prompt
  const query = (match[1] || '').replace(/^[,:\s—\-]+/, '').trim();
  return { matched: true, query };
}

/**
 * Checks if the user uttered a stop / sleep / cancel command
 */
export function isStopCommand(transcript: string): boolean {
  if (!transcript) return false;
  const t = transcript.trim().toLowerCase();
  return /^(?:stop|cancel|goodbye|bye|shut\s+up|sleep|pause|exit|nevermind|never\s+mind)\b/i.test(t);
}

/**
 * Synthesize a futuristic, pleasant two-tone rising chime (D5 -> A5)
 * using Web Audio API. Zero dependencies, instant playback.
 */
export function playWakeChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Note 2: A5 (880.00 Hz) — slightly delayed for the pleasant ascending chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.24, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.50);

    // Clean up AudioContext after sound finishes
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // AudioContext blocked or not supported — ignore silently
  }
}

/**
 * Synthesize a soft descending sleep chime (A5 -> D5) when standing down
 */
export function playSleepChime(): void {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Note 1: A5 (880.00 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880.00, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Note 2: D5 (587.33 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(587.33, now + 0.12);
    gain2.gain.setValueAtTime(0, now + 0.12);
    gain2.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // AudioContext blocked or not supported
  }
}
