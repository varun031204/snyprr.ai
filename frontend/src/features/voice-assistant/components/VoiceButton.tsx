import React from 'react';
import type { VoiceState } from '../types/voice';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
}

// ─── VoiceButton — main mic FAB ───────────────────────────────────────────────

export const VoiceButton: React.FC<VoiceButtonProps> = ({ state, onClick, disabled }) => {
  const isListening  = state === 'listening';
  const isSpeaking   = state === 'speaking';
  const isProcessing = state === 'processing';
  const isError      = state === 'error';
  const isBusy       = isProcessing || isSpeaking;

  const ariaLabel =
    isListening  ? 'Stop listening'  :
    isSpeaking   ? 'Stop speaking'   :
    isProcessing ? 'Processing…'     :
    isError      ? 'Retry'           :
    'Start listening';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      {/* Pulse ring — visible when listening */}
      {isListening && (
        <>
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'var(--brand-vivid)',
              opacity: 0.2,
              animation: 'voicePulse 1.2s ease-out infinite',
            }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: 'var(--brand-vivid)',
              opacity: 0.12,
              animation: 'voicePulse 1.2s ease-out infinite 0.4s',
            }}
          />
        </>
      )}

      {/* Subtle ring for speaking */}
      {isSpeaking && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: 'var(--brand-primary)',
            opacity: 0.15,
            animation: 'voicePulse 1.8s ease-out infinite',
          }}
        />
      )}

      {/* Main button */}
      <button
        onClick={onClick}
        disabled={disabled || isProcessing}
        aria-label={ariaLabel}
        className="relative z-10 flex items-center justify-center rounded-full transition-transform duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          width:           56,
          height:          56,
          background:      isListening
            ? 'var(--brand-vivid)'
            : isError
            ? 'var(--color-danger)'
            : isSpeaking
            ? 'var(--brand-primary)'
            : 'var(--brand-primary)',
          boxShadow:       isListening
            ? '0 0 16px color-mix(in srgb, var(--brand-vivid) 50%, transparent)'
            : '0 4px 16px rgba(0,0,0,0.3)',
          cursor:          isProcessing ? 'wait' : 'pointer',
          opacity:         disabled ? 0.5 : 1,
          // @ts-expect-error CSS custom property
          '--tw-ring-color': 'var(--brand-primary)',
        }}
      >
        {isProcessing ? (
          // Spinner
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ animation: 'spin 0.8s linear infinite' }}
          >
            <path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
        ) : isListening ? (
          // Stop square
          <svg width={20} height={20} viewBox="0 0 24 24" fill="#fff">
            <rect x={5} y={5} width={14} height={14} rx={2} />
          </svg>
        ) : isSpeaking ? (
          // Stop / speaker-x
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fff" stroke="none" />
            <line x1={23} y1={9} x2={17} y2={15} />
            <line x1={17} y1={9} x2={23} y2={15} />
          </svg>
        ) : (
          // Microphone
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x={9} y={2} width={6} height={11} rx={3} fill="#fff" stroke="none" />
            <path d="M5 10a7 7 0 0 0 14 0" />
            <line x1={12} y1={19} x2={12} y2={23} />
            <line x1={8}  y1={23} x2={16} y2={23} />
          </svg>
        )}
      </button>
    </div>
  );
};
