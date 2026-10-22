import React from 'react';
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import type { VoiceState } from '../hooks/useVoiceConversation';

interface VoiceControlsProps {
  voiceState: VoiceState;
  isMuted: boolean;
  isSpeakerOn: boolean;
  onMicClick: () => void;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onEnd: () => void;
  onSwitchToText: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  voiceState,
  isMuted,
  isSpeakerOn,
  onMicClick,
  onToggleMute,
  onToggleSpeaker,
  onEnd,
  onSwitchToText,
}) => {
  const isActive = voiceState === 'listening';

  return (
    <div className="flex items-center justify-center gap-4" role="toolbar" aria-label="Voice controls">

      {/* Switch to text */}
      <button
        onClick={onSwitchToText}
        title="Switch to text chat"
        aria-label="Switch to text chat"
        className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40 transition-all hover:scale-105"
      >
        <MessageSquare className="w-4 h-4" />
      </button>

      {/* Speaker toggle */}
      <button
        onClick={onToggleSpeaker}
        title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
        aria-label={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
        className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40 transition-all hover:scale-105"
      >
        {isSpeakerOn
          ? <Volume2 className="w-4 h-4 text-[var(--brand-primary)]" />
          : <VolumeX className="w-4 h-4" />
        }
      </button>

      {/* Primary mic button */}
      <button
        onClick={onMicClick}
        disabled={voiceState === 'thinking' || voiceState === 'speaking'}
        title={isMuted ? 'Unmute to speak' : isActive ? 'Stop listening' : 'Start speaking'}
        aria-label={isActive ? 'Stop voice conversation' : 'Start voice conversation'}
        className={[
          'relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100',
          isActive && !isMuted
            ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white shadow-[0_0_28px_rgba(177,124,254,0.55)] scale-110 animate-voice-btn-glow'
            : 'bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] text-[var(--text-secondary)] hover:scale-105 hover:border-[var(--brand-primary)]/50',
        ].join(' ')}
      >
        {/* Expanding ring when active */}
        {isActive && !isMuted && (
          <span className="absolute inset-0 rounded-full bg-[var(--brand-primary)] opacity-30 animate-voice-ring pointer-events-none" />
        )}

        {isMuted
          ? <MicOff className="w-6 h-6 text-[var(--color-danger)]" />
          : <Mic className={`w-6 h-6 ${isActive ? 'text-white' : ''}`} />
        }
      </button>

      {/* Mute mic */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        className={[
          'w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105',
          isMuted
            ? 'bg-[var(--color-danger-bg)] border-[var(--color-danger)]/40 text-[var(--color-danger)]'
            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40',
        ].join(' ')}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* End conversation */}
      <button
        onClick={onEnd}
        title="End voice conversation"
        aria-label="End voice conversation"
        className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white hover:scale-105 transition-all"
      >
        <PhoneOff className="w-4 h-4" />
      </button>
    </div>
  );
};
