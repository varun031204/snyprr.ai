import React, { useState, useCallback, useRef } from 'react';
import { Sparkles, Mic, MessageSquare, AlertTriangle, RefreshCw, WifiOff, MicOff, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { VoiceOrb } from './components/VoiceOrb';
import { VoiceSubtitle } from './components/VoiceSubtitle';
import { ConversationView } from './components/ConversationView';
import { useVoiceConversation } from './hooks/useVoiceConversation';
import type { Message } from './components/ConversationView';
import { sendCopilotMessage, sendVoiceCopilotMessage } from '../../services/api/geminiService';
import type { GeminiMessage } from '../../services/api/geminiService';

// ── Welcome message ────────────────────────────────────────────────────────────
const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  sender: 'ai',
  text: "Hey! I'm **Snyprr AI**, your dedicated trading intelligence copilot.\n\nAsk me anything about markets, chart patterns, SMC concepts, risk management, or specific instruments — and I'll give you real analysis. You can also switch to **Voice** for a hands-free conversation.",
  timestamp: 'Just now',
  chips: ['Analyze BTC right now', 'Explain SMC Order Blocks', 'Key support & resistance levels for gold', 'How do I calculate risk/reward?'],
};

type ActiveTab = 'text' | 'voice';

export default function AICopilotPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('text');
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Keep a Gemini-format history for multi-turn context (text mode)
  const geminiHistory = useRef<GeminiMessage[]>([]);
  // Separate voice history — shorter, concise exchanges
  const voiceHistory = useRef<GeminiMessage[]>([]);

  // ── Real Gemini AI call ───────────────────────────────────────────────────
  const callAI = useCallback(async (userText: string): Promise<string> => {
    // Append user message to history
    geminiHistory.current = [
      ...geminiHistory.current,
      { role: 'user', parts: [{ text: userText }] },
    ];

    const responseText = await sendCopilotMessage(geminiHistory.current);

    // Append AI response to history
    geminiHistory.current = [
      ...geminiHistory.current,
      { role: 'model', parts: [{ text: responseText }] },
    ];

    return responseText;
  }, []);

  // ── Text send handler ─────────────────────────────────────────────────────
  const handleSend = useCallback(async (text: string, image?: string) => {
    const query = text.trim();
    if (!query && !image) return;
    setApiError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query || 'Chart analysis request',
      image,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((p) => [...p, userMsg]);
    setIsTyping(true);

    try {
      const prompt = image
        ? `${query || 'Analyze this chart'}\n\n[User attached a chart image — provide analysis based on common chart patterns, assuming they need setup guidance]`
        : query;

      const responseText = await callAI(prompt);

      setMessages((p) => [...p, {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI request failed';
      setApiError(msg);
      setMessages((p) => [...p, {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: '⚠️ Sorry, I ran into an issue connecting to the AI. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [callAI]);

  const handleReset = useCallback(() => {
    geminiHistory.current = [];
    voiceHistory.current = [];
    setApiError(null);
    setMessages([{ ...WELCOME_MESSAGE, id: `welcome-${Date.now()}`, timestamp: 'Just now' }]);
  }, []);

  // ── Voice: AI response handler ───────────────────────────────────────────
  const handleVoiceAIResponse = useCallback(async (transcript: string): Promise<string> => {
    try {
      const responseText = await sendVoiceCopilotMessage(transcript, voiceHistory.current);
      // Update voice history for context
      voiceHistory.current = ([
        ...voiceHistory.current,
        { role: 'user'  as const, parts: [{ text: transcript }] },
        { role: 'model' as const, parts: [{ text: responseText }] },
      ] as GeminiMessage[]).slice(-10); // keep last 5 exchanges
      return responseText;
    } catch {
      return "Sorry, I couldn't connect. Please try again.";
    }
  }, []);

  const handleWakeWordDetected = useCallback((_query: string) => {
    setActiveTab('voice');
  }, []);

  // ── Voice conversation hook ───────────────────────────────────────────────
  const {
    voiceState, amplitude, subtitle,
    isMuted, isSpeakerOn, errorMessage, isSupported,
    wakeWordEnabled, isWakeWordListening, wakeWordDetectedText,
    startListening, stopListening,
    toggleMute, toggleSpeaker, toggleWakeWord,
    endConversation, retryPermission,
  } = useVoiceConversation({
    onAIResponse: handleVoiceAIResponse,
    onWakeWordDetected: handleWakeWordDetected,
  });

  const handleMicClick = () => {
    if (voiceState === 'listening') stopListening();
    else if (voiceState === 'idle') startListening();
  };

  const handleEndVoice = () => { endConversation(); setActiveTab('text'); };
  const handleSwitchToVoice = () => setActiveTab('voice');
  const handleSwitchToText = () => { stopListening(); setActiveTab('text'); };

  const orbSize = typeof window !== 'undefined' && window.innerWidth < 480 ? 220 : 280;

  // Dynamic ambient glow intensity based on voice state
  const glowOpacity =
    voiceState === 'listening' ? 0.12 + amplitude * 0.1
    : voiceState === 'speaking' ? 0.15
    : voiceState === 'thinking' ? 0.08
    : 0.05;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-9rem)] flex flex-col gap-0 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center shadow-lg shadow-[var(--brand-glow)] relative">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[var(--color-success)] border-2 border-[var(--bg-base)]" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[var(--text-primary)] leading-tight">AI Copilot</h1>
            <p className="text-[11px] font-semibold text-[var(--brand-primary)] tracking-wide">
              Powered by Gemini · Your trading intelligence, always within reach
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Wake Word indicator pill */}
          {isSupported && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full ${isWakeWordListening ? 'bg-[var(--color-success)] animate-ping opacity-75' : 'bg-[var(--text-muted)] opacity-30'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isWakeWordListening ? 'bg-[var(--color-success)]' : 'bg-[var(--text-muted)]'}`} />
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Wake Word: <strong className="text-[var(--text-primary)]">"Hey Snyperr AI"</strong>
              </span>
              <button
                onClick={toggleWakeWord}
                title={wakeWordEnabled ? "Wake word active — click to pause" : "Click to enable wake word"}
                className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  wakeWordEnabled
                    ? 'bg-[var(--brand-primary)]/15 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/25'
                    : 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {wakeWordEnabled ? (isWakeWordListening ? 'Active' : 'Ready') : 'Off'}
              </button>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'text' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Text
            </button>
            <button
              onClick={handleSwitchToVoice}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeTab === 'voice' ? 'bg-[var(--brand-primary)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <Mic className="w-3.5 h-3.5" /> Voice
            </button>
          </div>
        </div>
      </div>

      {/* API error banner */}
      {apiError && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)] flex-shrink-0">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 truncate">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-[var(--color-danger)] hover:opacity-70 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* ── Content area ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden neo-glass-panel rounded-2xl">

        {/* TEXT MODE */}
        {activeTab === 'text' && (
          <ConversationView
            messages={messages}
            isTyping={isTyping}
            onSend={handleSend}
            onReset={handleReset}
            onSwitchToVoice={handleSwitchToVoice}
            onUpdateMessages={setMessages}
          />
        )}

        {/* VOICE MODE */}
        {activeTab === 'voice' && (
          <div className="flex flex-col items-center justify-between h-full py-10 px-4 relative overflow-hidden">

            {/* Ambient radial background glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 70% 60% at 50% 42%, rgba(155,80,255,${glowOpacity}) 0%, transparent 68%)`,
                transition: 'background 0.5s ease',
              }}
            />

            {/* Wake Word Detection Notification Toast */}
            {wakeWordDetectedText && (
              <div className="absolute top-4 px-4 py-1.5 rounded-full bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/40 text-[var(--brand-primary)] text-xs font-semibold backdrop-blur-md animate-fade-in flex items-center gap-2 z-30 shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)] animate-pulse" />
                <span>{wakeWordDetectedText}</span>
              </div>
            )}

            {/* NOT SUPPORTED overlay */}
            {!isSupported && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--bg-base)]/85 backdrop-blur-sm rounded-2xl">
                <div className="text-center p-6 max-w-sm space-y-3">
                  <AlertTriangle className="w-10 h-10 text-[var(--color-warning)] mx-auto" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">Voice not available</p>
                  <p className="text-xs text-[var(--text-muted)]">Use Chrome or Edge for voice support.</p>
                  <button onClick={handleSwitchToText} className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold cursor-pointer">Switch to Text Chat</button>
                </div>
              </div>
            )}

            {/* MIC PERMISSION ERROR overlay */}
            {errorMessage && isSupported && (
              <div className="absolute inset-0 flex items-center justify-center z-20 bg-[var(--bg-base)]/85 backdrop-blur-sm rounded-2xl">
                <div className="text-center p-6 max-w-sm space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-6 h-6 text-[var(--color-danger)]" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">Microphone Access Required</p>
                  <p className="text-xs text-[var(--text-muted)]">{errorMessage}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={retryPermission} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-xs font-bold cursor-pointer">
                      <RefreshCw className="w-3.5 h-3.5" /> Try Again
                    </button>
                    <button onClick={handleSwitchToText} className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-semibold cursor-pointer">
                      Text Chat
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── TOP SPACER ── */}
            <div />

            {/* ══ THE MOON ══ — tap to start / stop listening */}
            <div className="flex flex-col items-center gap-10 relative z-10">
              <VoiceOrb
                state={voiceState}
                amplitude={amplitude}
                size={orbSize}
                onClick={handleMicClick}
              />

              {/* Subtitle floats below the orb */}
              <VoiceSubtitle text={subtitle} voiceState={voiceState} />
            </div>

            {/* ── MINIMAL SECONDARY CONTROLS ── */}
            <div className="relative z-10 flex items-center gap-5 pb-2">
              {/* Mute mic */}
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute mic'}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all hover:scale-105 cursor-pointer ${
                  isMuted
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Speaker toggle */}
              <button
                onClick={toggleSpeaker}
                title={isSpeakerOn ? 'Mute speaker' : 'Unmute speaker'}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:scale-105 transition-all cursor-pointer"
              >
                {isSpeakerOn
                  ? <Volume2 className="w-4 h-4 text-[var(--brand-primary)]" />
                  : <VolumeX className="w-4 h-4" />
                }
              </button>

              {/* End call */}
              <button
                onClick={handleEndVoice}
                title="End conversation"
                className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500/15 border border-red-500/35 text-red-400 hover:bg-red-500 hover:text-white hover:scale-105 transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice context footer */}
      {activeTab === 'voice' && messages.length > 1 && (
        <div className="flex-shrink-0 pt-3">
          <button
            onClick={handleSwitchToText}
            className="w-full text-center text-[11px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
          >
            {messages.length - 1} message{messages.length > 2 ? 's' : ''} in conversation — view in Text Chat →
          </button>
        </div>
      )}
    </div>
  );
}
