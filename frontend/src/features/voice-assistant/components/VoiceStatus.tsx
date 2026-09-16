import React from 'react';
import type { VoiceState } from '../types/voice';
import { findLanguage } from '../config/languages';

interface VoiceStatusProps {
  state: VoiceState;
  error: string | null;
  detectedLang: string | null;
  currentLang: string;
  interimTranscript: string;
  isSTTSupported: boolean;
  isTTSSupported: boolean;
}

// ─── VoiceStatus ──────────────────────────────────────────────────────────────

export const VoiceStatus: React.FC<VoiceStatusProps> = ({
  state,
  error,
  detectedLang,
  currentLang,
  interimTranscript,
  isSTTSupported,
  isTTSSupported,
}) => {
  // Browser support warning
  if (!isSTTSupported) {
    return (
      <p className="text-xs text-center px-3" style={{ color: 'var(--color-danger)' }}>
        Speech recognition isn't supported in this browser. Try Chrome or Edge.
      </p>
    );
  }
  if (!isTTSSupported) {
    return (
      <p className="text-xs text-center px-3" style={{ color: 'var(--color-danger)' }}>
        Text-to-speech isn't supported in this browser.
      </p>
    );
  }

  // Error state
  if (state === 'error' && error) {
    return (
      <p className="text-xs text-center px-3 leading-snug" style={{ color: 'var(--color-danger)' }}>
        {error}
      </p>
    );
  }

  // Interim transcript while listening
  if (state === 'listening' && interimTranscript) {
    return (
      <p
        className="text-xs text-center px-3 italic truncate max-w-full"
        style={{ color: 'var(--text-muted)' }}
        title={interimTranscript}
      >
        "{interimTranscript}"
      </p>
    );
  }

  const langEntry = findLanguage(detectedLang ?? currentLang);
  const langLabel = langEntry ? `${langEntry.flag} ${langEntry.short}` : currentLang;

  switch (state) {
    case 'idle':
      return (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Tap the mic to talk
        </p>
      );
    case 'listening':
      return (
        <p className="text-xs text-center font-medium" style={{ color: 'var(--brand-vivid)' }}>
          Listening… {langLabel}
        </p>
      );
    case 'processing':
      return (
        <p className="text-xs text-center font-medium" style={{ color: 'var(--brand-primary)' }}>
          Thinking…
        </p>
      );
    case 'speaking':
      return (
        <p className="text-xs text-center font-medium" style={{ color: 'var(--brand-primary)' }}>
          Speaking… <span style={{ color: 'var(--text-muted)' }}>{langLabel}</span>
        </p>
      );
    default:
      return null;
  }
};
