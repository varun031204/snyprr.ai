import React, { useEffect, useRef, useState } from 'react';
import type { VoiceAssistantProps, VoiceTurn } from '../types/voice';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceStatus } from './VoiceStatus';
import { VoiceControls } from './VoiceControls';
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
          borderBottomRightRadius: isUser ? 4 : undefined,
          borderBottomLeftRadius:  isUser ? undefined : 4,
          border: '1px solid var(--border-subtle)',
        }}
      >
        {turn.text}
      </div>
    </div>
  );
};

// ─── Floating mic trigger button ──────────────────────────────────────────────

interface TriggerButtonProps {
  onClick: () => void;
  hasActivity: boolean;
}

const TriggerButton: React.FC<TriggerButtonProps> = ({ onClick, hasActivity }) => (
  <button
    onClick={onClick}
    aria-label="Open voice assistant"
    className="flex items-center justify-center rounded-full shadow-lg transition-transform duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    style={{
      width:      52,
      height:     52,
      background: 'var(--brand-primary)',
      boxShadow:  '0 4px 20px rgba(0,0,0,0.35)',
      // @ts-expect-error CSS custom property
      '--tw-ring-color': 'var(--brand-primary)',
    }}
  >
    {/* Mic icon */}
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={9} y={2} width={6} height={11} rx={3} fill="#fff" stroke="none" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1={12} y1={19} x2={12} y2={23} />
      <line x1={8}  y1={23} x2={16} y2={23} />
    </svg>
    {/* Activity dot */}
    {hasActivity && (
      <span
        className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2"
        style={{
          background:   'var(--brand-vivid)',
          borderColor:  'var(--bg-base)',
        }}
      />
    )}
  </button>
);

// ─── Main panel ───────────────────────────────────────────────────────────────

export const VoiceAssistant: React.FC<VoiceAssistantProps> = () => {
  const [isOpen, setIsOpen]           = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const panelRef                      = useRef<HTMLDivElement>(null);
  const turnsEndRef                   = useRef<HTMLDivElement>(null);

  const {
    state,
    turns,
    settings,
    updateSettings,
    startListening,
    stopListening,
    stopSpeaking,
    clearHistory,
    error,
    detectedLang,
    currentLang,
    interimTranscript,
    isSTTSupported,
    isTTSSupported,
  } = useVoiceAssistant();

  // Inject keyframes once
  useEffect(() => { ensureKeyframes(); }, []);

  // Auto-scroll turns to bottom
  useEffect(() => {
    turnsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Space bar shortcut (when panel is open and not focused on an input)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleMicClick();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state]);

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

  const handleMicClick = () => {
    if (state === 'listening')  { stopListening(); return; }
    if (state === 'speaking')   { stopSpeaking();  return; }
    if (state === 'processing') return;
    startListening();
  };

  const hasActivity = turns.length > 0;

  return (
    <div
      ref={panelRef}
      className="fixed z-50"
      style={{ bottom: 104, right: 24 }} // stacked above text chat FAB at bottom-6 right-6
    >
      {/* ── Expanded panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="mb-3 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
          style={{
            width:           360,
            maxHeight:       520,
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
                  Multilingual AI assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Settings toggle */}
              <button
                onClick={() => setShowSettings(p => !p)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
                style={{
                  background: showSettings ? 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' : 'transparent',
                  color: showSettings ? 'var(--brand-primary)' : 'var(--text-muted)',
                }}
                aria-label="Toggle settings"
                title="Settings"
              >
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={12} cy={12} r={3} />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close voice assistant"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <line x1={18} y1={6} x2={6} y2={18} />
                  <line x1={6}  y1={6} x2={18} y2={18} />
                </svg>
              </button>
            </div>
          </div>

          {/* Settings drawer */}
          {showSettings && (
            <div className="px-3 pt-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
              <VoiceControls
                settings={settings}
                onUpdate={updateSettings}
                onClear={() => { clearHistory(); setShowSettings(false); }}
              />
            </div>
          )}

          {/* Conversation turns */}
          <div
            className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 min-h-0"
            style={{ minHeight: 80 }}
          >
            {turns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-6">
                <span style={{ fontSize: 32 }}>🎙️</span>
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                  Tap the mic and start talking.<br />
                  I understand Hindi, English, and many more.
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                  Press Space to toggle listening
                </p>
              </div>
            ) : (
              turns.map(turn => (
                <TurnBubble key={turn.id} turn={turn} />
              ))
            )}
            <div ref={turnsEndRef} />
          </div>

          {/* Waveform + status bar */}
          <div
            className="flex-shrink-0 px-4 py-2 flex flex-col items-center gap-1"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <VoiceWaveform state={state} />
            <VoiceStatus
              state={state}
              error={error}
              detectedLang={detectedLang}
              currentLang={currentLang}
              interimTranscript={interimTranscript}
              isSTTSupported={isSTTSupported}
              isTTSSupported={isTTSSupported}
            />
          </div>

          {/* Mic button row */}
          <div
            className="flex-shrink-0 flex justify-center pb-4 pt-2"
          >
            <VoiceButton
              state={state}
              onClick={handleMicClick}
            />
          </div>
        </div>
      )}

      {/* ── Floating trigger button ─────────────────────────────────────────── */}
      <div className="flex justify-end">
        <TriggerButton onClick={() => setIsOpen(p => !p)} hasActivity={hasActivity} />
      </div>
    </div>
  );
};
