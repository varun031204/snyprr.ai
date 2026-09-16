import React from 'react';
import type { VoiceState } from '../types/voice';

interface VoiceWaveformProps {
  state: VoiceState;
}

// ─── Bar counts per state ─────────────────────────────────────────────────────
const BAR_COUNT = 5;

// Animation delay offsets for each bar
const DELAYS = ['0ms', '80ms', '160ms', '80ms', '0ms'];

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ state }) => {
  const isActive = state === 'listening' || state === 'speaking';
  const isProcessing = state === 'processing';

  if (state === 'idle') return null;

  return (
    <div
      className="flex items-center justify-center gap-[3px]"
      style={{ height: 32 }}
      aria-hidden="true"
    >
      {isProcessing ? (
        // Pulsing dots for "thinking"
        <ProcessingDots />
      ) : (
        // Animated bars for listening / speaking
        Array.from({ length: BAR_COUNT }).map((_, i) => (
          <Bar
            key={i}
            delay={DELAYS[i]}
            state={state}
            active={isActive}
          />
        ))
      )}
    </div>
  );
};

// ─── Animated bar ─────────────────────────────────────────────────────────────

interface BarProps {
  delay: string;
  state: VoiceState;
  active: boolean;
}

const Bar: React.FC<BarProps> = ({ delay, state, active }) => {
  const color =
    state === 'listening'
      ? 'var(--brand-vivid)'
      : state === 'speaking'
      ? 'var(--brand-primary)'
      : state === 'error'
      ? 'var(--color-danger)'
      : 'var(--text-muted)';

  return (
    <div
      style={{
        width: 3,
        borderRadius: 2,
        background: color,
        animationDelay: delay,
        height: active ? undefined : 8,
        minHeight: 4,
        maxHeight: 28,
        // Inline keyframe animation via CSS custom property trick
        animation: active ? `voiceBar 0.6s ease-in-out infinite alternate ${delay}` : 'none',
        // Fallback static heights when not animating
        ...(!active && { height: 8 }),
      }}
      className={active ? 'voice-bar-animate' : ''}
    />
  );
};

// ─── Processing dots ──────────────────────────────────────────────────────────

const ProcessingDots: React.FC = () => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map(i => (
      <div
        key={i}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--brand-primary)',
          animation: `voiceDot 1s ease-in-out infinite`,
          animationDelay: `${i * 160}ms`,
        }}
      />
    ))}
  </div>
);
