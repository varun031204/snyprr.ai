/**
 * SnyprAIChat — floating chat widget matching the app's CSS-variable theme.
 *
 * Calls Gemini 2.0 Flash directly from the browser (same as geminiService.ts)
 * using VITE_GEMINI_API_KEY. No extra backend needed.
 *
 * Placement: bottom-right floating button, above the page content.
 * Theme:     fully driven by CSS variables → dark & light modes both work.
 */

import React, {
  useState, useRef, useEffect, useCallback,
  type KeyboardEvent, type ChangeEvent,
} from 'react';
import { X, Send, Mic, MicOff, Sparkles, User, ChevronDown, Plus } from 'lucide-react';
import { buildKnowledgeContext } from './chatKnowledge';

// ── Gemini config ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GMsg { role: 'user' | 'model'; parts: Array<{ text: string }> }
interface ChatMsg { id: string; role: 'user' | 'bot'; text: string }

const uid = () => Math.random().toString(36).slice(2, 10);

// ── Gemini call (browser fetch) ───────────────────────────────────────────────

async function callGemini(history: GMsg[]): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('VITE_GEMINI_API_KEY is not set.');
  const query = [...history].reverse().find(m => m.role === 'user')?.parts[0]?.text ?? '';
  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: buildSystem(query) }] },
      contents: history,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) { const e = await res.text(); throw new Error(`Gemini ${res.status}: ${e.slice(0, 180)}`); }
  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function buildSystem(query: string): string {
  return `You are Snyprr.ai AI — the intelligent assistant for the Snyprr.ai trading intelligence platform.

Your role:
1. Answer Snyprr.ai platform questions using the knowledge below.
2. Educate users on cryptocurrency trading, technical analysis, risk management and strategies.

SNYPRR.AI KNOWLEDGE:
${buildKnowledgeContext(query)}

RULES:
- Never invent Snyprr.ai features, prices or policies not in the knowledge.
- Do NOT give personalized financial advice or guarantee profits.
- Stay focused on Snyprr.ai and crypto trading only.
- Keep answers clear, concise and conversational.
- Use **bold** for key terms and bullet points for lists.`;
}

// ── Markdown-lite renderer ────────────────────────────────────────────────────

function fmt(raw: string): string {
  if (!raw) return '';
  let t = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/^###\s+(.+)$/gm, '<h4 style="margin:.4em 0 .2em;font-size:.82em;font-weight:700;color:var(--text-primary)">$1</h4>')
    .replace(/^##\s+(.+)$/gm,  '<h3 style="margin:.4em 0 .2em;font-size:.87em;font-weight:700;color:var(--text-primary)">$1</h3>');
  const lines = t.split('\n');
  let html = '', inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (inList) { html += '</ul>'; inList = false; } continue; }
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { html += '<ul style="margin:.3em 0 .3em 1.1em;padding:0;list-style:disc">'; inList = true; }
      html += `<li style="margin:.15em 0">${line.replace(/^[-*]\s+/, '')}</li>`; continue;
    }
    if (inList) { html += '</ul>'; inList = false; }
    if (line.startsWith('<h')) html += line;
    else html += `<p style="margin:.2em 0;line-height:1.55">${line}</p>`;
  }
  if (inList) html += '</ul>';
  return html;
}

// ── Suggestion cards ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: '📊', label: 'Technical Analysis', msg: 'What is RSI in crypto trading?' },
  { icon: '🛡️', label: 'Risk Management',   msg: 'What is a stop loss?' },
  { icon: '📈', label: 'Buying Zone',        msg: 'What is a buying zone?' },
  { icon: '🤖', label: 'About Snyprr.ai',   msg: 'How does Snyprr.ai work?' },
];

const WELCOME = "👋 Welcome to **Snyprr.ai AI**!\n\nI can help you with the platform, cryptocurrency trading, technical analysis, and risk management.\n\nWhat would you like to know?";

// ── Component ─────────────────────────────────────────────────────────────────

export const SnyprAIChat: React.FC = () => {
  const [open,     setOpen]     = useState(false);
  const [msgs,     setMsgs]     = useState<ChatMsg[]>([]);
  const [history,  setHistory]  = useState<GMsg[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [listening,setListening]= useState(false);

  const endRef  = useRef<HTMLDivElement>(null);
  const inputRef= useRef<HTMLTextAreaElement>(null);
  const srRef   = useRef<any>(null);

  // scroll to bottom
  useEffect(() => { if (open) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }, [msgs, open, loading]);

  // focus on open
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 120); }, [open]);

  // welcome
  useEffect(() => {
    if (open && msgs.length === 0) setMsgs([{ id: uid(), role: 'bot', text: WELCOME }]);
  }, [open]);

  // speech recognition
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e: any) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(t); };
    r.onerror = () => setListening(false);
    r.onend   = () => setListening(false);
    srRef.current = r;
  }, []);

  const toggleVoice = () => {
    const r = srRef.current; if (!r) return;
    if (listening) { r.stop(); setListening(false); } else { r.start(); setListening(true); }
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setMsgs(p => [...p, { id: uid(), role: 'user', text: msg }]);
    const newHist: GMsg[] = [...history, { role: 'user', parts: [{ text: msg }] }];
    if (newHist.length > 20) newHist.splice(0, newHist.length - 20);
    setHistory(newHist);
    setLoading(true);
    try {
      const reply = await callGemini(newHist);
      if (!reply) throw new Error('Empty response');
      const model: GMsg = { role: 'model', parts: [{ text: reply }] };
      setHistory(h => { const u = [...h, model]; return u.length > 20 ? u.slice(u.length - 20) : u; });
      setMsgs(p => [...p, { id: uid(), role: 'bot', text: reply }]);
    } catch (err: any) {
      const m = err.message?.includes('VITE_GEMINI_API_KEY')
        ? '⚠️ AI key not configured. Add VITE_GEMINI_API_KEY to your .env file.'
        : `⚠️ ${err.message ?? 'Something went wrong.'}`;
      setMsgs(p => [...p, { id: uid(), role: 'bot', text: m }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, history]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const newChat = () => {
    setMsgs([{ id: uid(), role: 'bot', text: "👋 New conversation! Ask me anything about Snyprr.ai or crypto trading." }]);
    setHistory([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const hasSR = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toggle button */}
      <button type="button" onClick={() => setOpen(p => !p)}
        title={open ? 'Close AI Chat' : 'Snyprr.ai AI'}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 select-none"
        style={{
          background: open ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))',
          border: open ? '1px solid var(--border-subtle)' : 'none',
          boxShadow: open ? 'none' : '0 0 32px var(--brand-glow)',
        }}>
        {open
          ? <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          : <div className="relative">
              <Sparkles className="w-6 h-6 text-white" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-transparent animate-pulse"
                style={{ background: 'var(--color-success)' }} />
            </div>
        }
      </button>

      {/* Chat panel */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col rounded-3xl border overflow-hidden shadow-2xl transition-all duration-300 origin-bottom-right select-none"
        style={{
          width: '380px', maxWidth: 'calc(100vw - 28px)',
          height: '560px', maxHeight: 'calc(100vh - 120px)',
          background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)',
          opacity: open ? 1 : 0, transform: open ? 'scale(1)' : 'scale(0.88)',
          pointerEvents: open ? 'all' : 'none',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Snyprr.ai AI</p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-success)' }} />
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Online · Crypto Assistant</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={newChat} title="New conversation"
              className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <Plus className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => setOpen(false)} title="Minimise"
              className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-[var(--bg-surface-hover)]"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" style={{ overscrollBehavior: 'contain' }}>

          {/* Suggestion cards — only when only welcome message */}
          {msgs.length === 1 && msgs[0].role === 'bot' && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SUGGESTIONS.map(s => (
                <button key={s.label} type="button" onClick={() => sendMessage(s.msg)}
                  className="flex flex-col items-start gap-1.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.02] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-glow)]"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  <span className="text-base">{s.icon}</span>
                  <span className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
                </button>
              ))}
            </div>
          )}

          {msgs.map(m => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'bot' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              {m.role === 'user'
                ? <div className="max-w-[82%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[12.5px] leading-relaxed text-white"
                    style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))' }}>
                    {m.text}
                  </div>
                : <div className="max-w-[82%] rounded-2xl rounded-tl-md px-3.5 py-2.5 text-[12.5px] border"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
                    dangerouslySetInnerHTML={{ __html: fmt(m.text) }}
                  />
              }
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border"
                  style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  <User className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>
          ))}

          {/* Typing dots */}
          {loading && (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))' }}>
                <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-md flex items-center gap-1 border"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                {[0,1,2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: 'var(--brand-primary)', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-3 border-t"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
          <div className="flex items-end gap-2 rounded-2xl px-3 py-2 border transition-all focus-within:border-[var(--brand-primary)]"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>

            {hasSR && (
              <button type="button" onClick={toggleVoice} title={listening ? 'Stop' : 'Voice input'}
                className="p-1 rounded-lg flex-shrink-0 mb-0.5 cursor-pointer"
                style={{ color: listening ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                {listening ? <MicOff className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <textarea ref={inputRef} value={input}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
              onKeyDown={handleKey} rows={1}
              placeholder="Ask about Snyprr.ai or crypto…"
              className="flex-1 resize-none bg-transparent outline-none text-[12.5px] min-h-[20px] max-h-[80px] overflow-y-auto scrollbar-thin"
              style={{ color: 'var(--text-primary)', lineHeight: '1.5', fontFamily: 'Inter, system-ui, sans-serif' }}
              onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 80)}px`; }}
            />

            <button type="button" onClick={() => sendMessage()} disabled={!input.trim() || loading}
              title="Send"
              className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mb-0.5 cursor-pointer disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-vivid))' }}>
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <p className="text-center text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Snyprr.ai AI · Educational purposes only
          </p>
        </div>
      </div>
    </>
  );
};
