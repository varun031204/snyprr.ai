import React, { useEffect, useRef, useState } from 'react';
import type { VoiceTurn } from '../types/voice';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { LANGUAGES } from '../config/languages';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceStatus } from './VoiceStatus';
import { VoiceButton } from './VoiceButton';

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const KEYFRAMES = `
@keyframes voicePulse {
  0%   { transform: scale(1);    opacity: 0.35; }
  100% { transform: scale(1.75); opacity: 0; }
}
@keyframes voiceBar {
  from { height: 4px; }
  to   { height: 26px; }
}
@keyframes voiceDot {
  0%, 100% { transform: scale(1);   opacity: 0.5; }
  50%      { transform: scale(1.4); opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
@keyframes vaSlideIn {
  from { opacity: 0; transform: scale(0.92) translateY(12px); }
  to   { opacity: 1; transform: scale(1)    translateY(0); }
}
`;

let keyframesInjected = false;
function ensureKeyframes() {
  if (keyframesInjected) return;
  const style = document.createElement('style');
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

// ─── Language selector (compact row) ─────────────────────────────────────────
const QUICK_LANGS = ['en-IN', 'hi-IN', 'en-US', 'te-IN', 'ta-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'kn-IN'];

interface LangSelectorProps {
  selected: string;
  onChange: (code: string) => void;
  disabled: boolean;
}

const LangSelector: React.FC<LangSelectorProps> = ({ selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find(l => l.code === selected);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
        style={{
          background: 'var(--bg-secondary)',
          border:     '1px solid var(--border-subtle)',
          color:      'var(--text-primary)',
          opacity:    disabled ? 0.5 : 1,
        }}
        title="Select language"
      >
        <span>{current?.flag ?? '🌐'}</span>
        <span>{current?.short ?? selected}</span>
        <span style={{ color: 'var(--text-muted)' }}>▾</span>
      </button>

      {open && (
        <div
          className="absolute bottom-full mb-1 left-0 rounded-xl shadow-xl overflow-auto z-10"
          style={{
            background:  'var(--bg-surface)',
            border:      '1px solid var(--border-subtle)',
            width:        220,
            maxHeight:    240,
          }}
        >
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { onChange(l.code); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-left"
              style={{
                color:      l.code === selected ? 'var(--brand-vivid)' : 'var(--text-primary)',
                background: l.code === selected
                  ? 'color-mix(in srgb, var(--brand-primary) 12%, transparent)'
                  : 'transparent',
                fontWeight: l.code === selected ? 600 : 400,
              }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === selected && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Turn bubble ──────────────────────────────────────────────────────────────

const TurnBubble: React.FC<{ turn: VoiceTurn }> = ({ turn }) => {
  const isUser = turn.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed"
        style={{
          background: isUser
            ? 'color-mix(in srgb, var(--brand-primary) 18%, transparent)'
            : 'var(--bg-secondary)',
          color:      'var(--text-primary)',
          border:     '1px solid var(--border-subtle)',
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius:  isUser ? undefined : 4,
        }}
      >
        {turn.text}
      </div>
    </div>
  );
};

// ─── Floating trigger FAB ─────────────────────────────────────────────────────

interface TriggerProps {
  onClick: () => void;
  hasActivity: boolean;
}

const TriggerButton: React.FC<TriggerProps> = ({ onClick, hasActivity }) => (
  <button
    onClick={onClick}
    aria-label="Open Gemini Live voice assistant"
    className="relative flex items-center justify-center rounded-full shadow-lg transition-transform duration-150 active:scale-95 focus:outline-none"
    style={{
      width:      52,
      height:     52,
      background: 'var(--brand-primary)',
      boxShadow:  '0 4px 20px rgba(0,0,0,0.35)',
    }}
  >
    {/* Mic icon */}
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={9} y={2} width={6} height={11} rx={3} fill="#fff" stroke="none" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1={12} y1={19} x2={12} y2={23} />
      <line x1={8}  y1={23} x2={16} y2={23} />
    </svg>
    {/* Live badge */}
    <span
      className="absolute -top-1 -right-1 text-[9px] font-bold px-1 rounded-full"
      style={{ background: 'var(--brand-vivid)', color: '#fff', lineHeight: '14px' }}
    >
      LIVE
    </span>
    {hasActivity && (
      <span
        className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2"
        style={{ background: 'var(--color-success)', borderColor: 'var(--bg-base)' }}
      />
    )}
  </button>
);

// ─── Status label (Gemini Live states) ───────────────────────────────────────

const LiveStatus: React.FC<{ state: string; error: string | null }> = ({ state, error }) => {
  if (error) return (
    <p className="text-xs text-center px-2 leading-snug" style={{ color: 'var(--color-danger)' }}>
      {error}
    </p>
  );
  const labels: Record<string, { text: string; color: string }> = {
    idle:       { text: 'Tap to start a live conversation',  color: 'var(--text-muted)' },
    processing: { text: 'Connecting to Gemini Live…',        color: 'var(--brand-primary)' },
    listening:  { text: 'Listening — speak naturally',       color: 'var(--brand-vivid)' },
    speaking:   { text: 'Gemini is speaking…',               color: 'var(--brand-primary)' },
    error:      { text: 'Something went wrong',              color: 'var(--color-danger)' },
  };
  const l = labels[state] ?? labels.idle;
  return (
    <p className="text-xs text-center font-medium" style={{ color: l.color }}>
      {l.text}
    </p>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const VoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen]       = useState(false);
  const [language, setLanguage]   = useState('en-IN');
  const panelRef                  = useRef<HTMLDivElement>(null);
  const turnsEndRef               = useRef<HTMLDivElement>(null);

  const live = useGeminiLive();

  useEffect(() => { ensureKeyframes(); }, []);

  // Auto-scroll turns
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [live.turns]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Space bar to toggle while open
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleMicClick();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, live.state]);

  const handleMicClick = () => {
    if (live.state === 'idle' || live.state === 'error') {
      live.startSession(language);
    } else {
      live.stopSession();
    }
  };

  const isActive = live.state === 'listening' || live.state === 'speaking';

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{ bottom: 104, right: 24 }}
    >
      {/* ── Expanded panel ──────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="mb-3 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width:           360,
            maxHeight:       540,
            background:      'var(--bg-surface)',
            border:          '1px solid var(--border-subtle)',
            transformOrigin: 'bottom right',
            animation:       'vaSlideIn 0.2s ease-out',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🎙️</span>
              <div>
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
                  Snyprr Voice
                </p>
                <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                  Powered by Gemini Live · Real-time
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language selector */}
              <LangSelector
                selected={language}
                onChange={setLanguage}
                disabled={isActive}
              />
              {/* Clear */}
              <button
                onClick={live.clearHistory}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-muted)' }}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => { live.stopSession(); setIsOpen(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close voice assistant"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1={18} y1={6}  x2={6}  y2={18} />
                  <line x1={6}  y1={6}  x2={18} y2={18} />
                </svg>
              </button>
            </div>
          </div>

          {/* Conversation turns */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0"
            style={{ minHeight: 100 }}
          >
            {live.turns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
                <span style={{ fontSize: 36 }}>🎙️</span>
                <div className="text-center">
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Gemini Live Voice
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Real-time audio — Gemini hears and speaks back natively.<br />
                    Supports Hindi, English, Hinglish and more.
                  </p>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  Press Space to start · requires API server on port 4000
                </p>
              </div>
            ) : (
              live.turns.map(turn => <TurnBubble key={turn.id} turn={turn} />)
            )}
            <div ref={turnsEndRef} />
          </div>

          {/* Waveform + status */}
          <div
            className="flex-shrink-0 px-4 py-2 flex flex-col items-center gap-1.5"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <VoiceWaveform state={live.state} />
            <LiveStatus state={live.state} error={live.error} />
          </div>

          {/* Mic button */}
          <div className="flex-shrink-0 flex justify-center pb-4 pt-2">
            <VoiceButton
              state={live.state}
              onClick={handleMicClick}
            />
          </div>
        </div>
      )}

      {/* ── Floating trigger ─────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <TriggerButton
          onClick={() => setIsOpen(p => !p)}
          hasActivity={live.turns.length > 0}
        />
      </div>
    </div>
  );
};
