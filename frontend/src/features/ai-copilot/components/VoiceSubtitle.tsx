import React, { useEffect, useRef } from 'react';
import type { VoiceState } from '../hooks/useVoiceConversation';

interface VoiceSubtitleProps {
  text: string;
  voiceState: VoiceState;
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Say "Hey Snyperr AI" or tap the orb',
  listening: 'Listening...',
  thinking: 'Thinking...',
  speaking: 'Speaking...',
  error: '',
};

export const VoiceSubtitle: React.FC<VoiceSubtitleProps> = ({ text, voiceState }) => {
  const subtitleRef = useRef<HTMLDivElement>(null);

  // Re-trigger animation each time text changes
  useEffect(() => {
    const el = subtitleRef.current;
    if (!el || !text) return;
    el.classList.remove('animate-subtitle-appear');
    void el.offsetWidth; // force reflow
    el.classList.add('animate-subtitle-appear');
  }, [text]);

  const stateLabel = STATE_LABELS[voiceState];

  return (
    <div className="flex flex-col items-center gap-2 min-h-[72px] px-4">
      {/* Status label */}
      <p
        className={[
          'text-xs font-bold uppercase tracking-[0.2em] transition-all duration-500',
          voiceState === 'listening'
            ? 'text-[var(--brand-primary)]'
            : voiceState === 'speaking'
            ? 'text-[var(--brand-soft)]'
            : voiceState === 'thinking'
            ? 'text-[var(--text-muted)]'
            : 'text-[var(--text-muted)]',
        ].join(' ')}
      >
        {stateLabel && (
          <span className="flex items-center gap-2">
            {/* State dot */}
            {voiceState !== 'idle' && (
              <span
                className={[
                  'inline-block w-1.5 h-1.5 rounded-full',
                  voiceState === 'listening' ? 'bg-[var(--brand-primary)] animate-pulse' :
                  voiceState === 'thinking'  ? 'bg-[var(--text-muted)] animate-pulse' :
                  voiceState === 'speaking'  ? 'bg-[var(--brand-soft)] animate-pulse' : '',
                ].join(' ')}
              />
            )}
            {stateLabel}
          </span>
        )}
      </p>

      {/* AI response subtitle */}
      {text && voiceState === 'speaking' && (
        <div
          ref={subtitleRef}
          className="animate-subtitle-appear text-center max-w-lg px-2"
          aria-live="polite"
          aria-label="AI is saying"
        >
          <p className="text-base font-medium text-[var(--text-primary)] leading-relaxed">
            {text}
          </p>
        </div>
      )}

      {/* Idle hint */}
      {voiceState === 'idle' && (
        <p className="text-[11px] text-[var(--text-muted)] text-center max-w-xs">
          Ask about markets, charts, setups, strategies, or trading analysis
        </p>
      )}
    </div>
  );
};
