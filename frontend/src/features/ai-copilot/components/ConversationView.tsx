import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Send, User, Plus, RotateCcw,
  TrendingUp, Target, Shield, LineChart,
  Copy, Check, ThumbsUp, ThumbsDown, ArrowRight, Mic,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Shared types ───────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  image?: string;
  timestamp: string;
  reaction?: 'up' | 'down';
  copied?: boolean;
  chips?: string[];
  action?: { label: string; path: string };
}

interface ConversationViewProps {
  messages: Message[];
  isTyping: boolean;
  onSend: (text: string, image?: string) => void;
  onReset: () => void;
  onSwitchToVoice: () => void;
  onUpdateMessages: (updater: (prev: Message[]) => Message[]) => void;
}

// ── Minimal text formatter ─────────────────────────────────────────────────────
function formatText(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g);
    return (
      <span key={i} className="block leading-relaxed">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**')
            ? <strong key={j} className="font-bold text-[var(--text-primary)]">{part.slice(2, -2)}</strong>
            : part
        )}
      </span>
    );
  });
}

// ── Component ──────────────────────────────────────────────────────────────────
export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  isTyping,
  onSend,
  onReset,
  onSwitchToVoice,
  onUpdateMessages,
}) => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !selectedImage) return;
    onSend(input.trim(), selectedImage || undefined);
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReaction = useCallback((id: string, type: 'up' | 'down') => {
    onUpdateMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, reaction: m.reaction === type ? undefined : type } : m)
    );
  }, [onUpdateMessages]);

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    onUpdateMessages((prev) => prev.map((m) => m.id === id ? { ...m, copied: true } : m));
    setTimeout(() => {
      onUpdateMessages((prev) => prev.map((m) => m.id === id ? { ...m, copied: false } : m));
    }, 1800);
  }, [onUpdateMessages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const QUICK_CHIPS = [
    { label: 'BTC Setup', icon: <TrendingUp className="w-3 h-3" />, q: 'Analyze BTC setup' },
    { label: 'ETH Setup', icon: <TrendingUp className="w-3 h-3" />, q: 'Analyze ETH setup' },
    { label: 'GOLD Setup', icon: <LineChart className="w-3 h-3" />, q: 'Analyze GOLD setup' },
    { label: 'SMC Guide', icon: <Shield className="w-3 h-3" />, q: 'Explain SMC strategy' },
    { label: 'Risk Mgmt', icon: <Target className="w-3 h-3" />, q: 'Explain risk management' },
  ];

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
          <span className="text-xs font-semibold text-[var(--text-muted)]">Text conversation</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Voice shortcut */}
          <button
            onClick={onSwitchToVoice}
            title="Switch to voice"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[var(--brand-primary)] bg-[var(--brand-glow)]/30 hover:bg-[var(--brand-primary)] hover:text-white border border-[var(--brand-primary)]/25 transition-all cursor-pointer"
          >
            <Mic className="w-3 h-3" /> Voice
          </button>
          <button
            onClick={onReset}
            title="New conversation"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Quick chips ──────────────────────────────────────────────────── */}
      <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border-subtle)]/40 flex-shrink-0 scrollbar-none">
        {QUICK_CHIPS.map((c) => (
          <button
            key={c.label}
            onClick={() => onSend(c.q)}
            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--brand-glow)]/30 hover:bg-[var(--brand-primary)] text-[var(--brand-primary)] hover:text-white border border-[var(--brand-primary)]/25 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 flex-shrink-0"
          >
            {c.icon}{c.label}
          </button>
        ))}
      </div>

      {/* ── Message thread ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 scrollbar-thin">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}>
            <div className={`flex gap-2 max-w-[88%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              {msg.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              )}
              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </div>
              )}

              {/* Bubble */}
              <div className={[
                'px-4 py-3 rounded-2xl text-sm leading-relaxed',
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white rounded-tr-sm shadow-md'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-tl-sm shadow-sm',
              ].join(' ')}>
                {msg.image && (
                  <img src={msg.image} alt="Chart" className="w-full rounded-xl max-h-40 object-cover mb-2 border border-white/20" />
                )}
                {formatText(msg.text)}
                {msg.action && (
                  <button
                    onClick={() => navigate(msg.action!.path)}
                    className="mt-2.5 w-full py-1.5 px-3 rounded-xl bg-[var(--brand-glow)] hover:bg-[var(--brand-primary)] text-[var(--brand-primary)] hover:text-white border border-[var(--brand-primary)]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer group"
                  >
                    {msg.action.label}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            {/* AI message actions */}
            {msg.sender === 'ai' && (
              <div className="flex items-center gap-1 pl-9">
                <button onClick={() => handleReaction(msg.id, 'up')} className={`p-1 rounded-md transition-colors cursor-pointer ${msg.reaction === 'up' ? 'text-[var(--color-success)] bg-[var(--color-success-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}><ThumbsUp className="w-3 h-3" /></button>
                <button onClick={() => handleReaction(msg.id, 'down')} className={`p-1 rounded-md transition-colors cursor-pointer ${msg.reaction === 'down' ? 'text-[var(--color-danger)] bg-[var(--color-danger-bg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'}`}><ThumbsDown className="w-3 h-3" /></button>
                <button onClick={() => handleCopy(msg.id, msg.text)} className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer">{msg.copied ? <Check className="w-3 h-3 text-[var(--color-success)]" /> : <Copy className="w-3 h-3" />}</button>
                <span className="text-[9px] text-[var(--text-muted)] ml-1">{msg.timestamp}</span>
              </div>
            )}

            {/* Follow-up chips */}
            {msg.chips && msg.chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-9 pt-0.5">
                {msg.chips.map((chip, ci) => (
                  <button key={ci} onClick={() => onSend(chip)} className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--brand-glow)] text-[var(--text-muted)] hover:text-[var(--brand-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/30 transition-all cursor-pointer active:scale-95">
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Image preview ────────────────────────────────────────────────── */}
      {selectedImage && (
        <div className="px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)] flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <img src={selectedImage} alt="Chart preview" className="w-12 h-12 rounded-lg object-cover border border-[var(--brand-primary)]" />
            <button onClick={() => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] shadow">×</button>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] truncate">Chart image attached — will analyze on send</span>
        </div>
      )}

      {/* ── Input ────────────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-2xl px-4 py-2.5 focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20 transition-all">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors p-1 cursor-pointer flex-shrink-0" title="Upload chart image">
            <Plus className="w-4 h-4" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about markets, charts, setups, strategies..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          <button type="submit" disabled={!input.trim() && !selectedImage} className="w-8 h-8 rounded-xl bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:cursor-not-allowed flex-shrink-0 shadow-sm" title="Send">
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
