/**
 * AIAnalysisPanel
 *
 * Side panel that:
 * 1. Shows trader-uploaded trade levels (Entry, SL, TP, Buy/Sell zones)
 * 2. Triggers Gemini 2.5 Flash to review the setup
 * 3. Displays a structured analysis result
 * 4. Provides an embedded follow-up chat powered by Gemini
 */

import { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Send, Bot, User, RotateCcw, Lock,
    TrendingUp, TrendingDown, ShieldCheck, AlertTriangle,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import { analyzeTraderSetup, sendChatMessage } from '../../services/api/geminiService';
import type { GeminiAnalysisResult, GeminiMessage } from '../../services/api/geminiService';
import type { Prediction } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
}

interface Props {
    instrument: string;
    prediction: Prediction | null | undefined;
    isSubscribed: boolean;
    onUnlock: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
    BULLISH: { label: 'Bullish', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]', border: 'border-[var(--color-success)]/30', icon: TrendingUp },
    BEARISH: { label: 'Bearish', color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-bg)]', border: 'border-[var(--color-danger)]/30', icon: TrendingDown },
    NEUTRAL: { label: 'Neutral', color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-subtle)]', icon: ShieldCheck },
    CAUTION: { label: 'Caution', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', border: 'border-[var(--color-warning)]/30', icon: AlertTriangle },
} as const;

function fmt(n: number, instrument: string) {
    if (instrument === 'SILVER') return n.toFixed(3);
    if (instrument === 'XRP/USDT') return n.toFixed(4);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIAnalysisPanel({ instrument, prediction, isSubscribed, onUnlock }: Props) {
    const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    const chatBottomRef = useRef<HTMLDivElement>(null);

    // Reset panel when instrument changes
    useEffect(() => {
        setAnalysis(null);
        setAnalysisError(null);
        setChatMessages([]);
        setChatOpen(false);
    }, [instrument]);

    useEffect(() => {
        if (chatOpen) {
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
    }, [chatMessages, chatOpen, isChatLoading]);

    // ── Trigger analysis ───────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!prediction) {
            setAnalysisError('no_active_trades');
            return;
        }
        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysis(null);
        setChatMessages([]);
        try {
            const result = await analyzeTraderSetup(prediction);
            setAnalysis(result);
            setChatOpen(true);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setAnalysisError(msg);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── Chat send ──────────────────────────────────────────────────────────────
    const handleChatSend = async () => {
        const text = chatInput.trim();
        if (!text || isChatLoading) return;

        const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
        const updatedMessages = [...chatMessages, userMsg];
        setChatMessages(updatedMessages);
        setChatInput('');
        setIsChatLoading(true);

        try {
            // Build Gemini-format history
            const history: GeminiMessage[] = updatedMessages.map((m) => ({
                role: m.role,
                parts: [{ text: m.text }],
            }));
            const reply = await sendChatMessage(history, prediction ?? null);
            setChatMessages((prev) => [
                ...prev,
                { id: `m-${Date.now()}`, role: 'model', text: reply },
            ]);
        } catch {
            setChatMessages((prev) => [
                ...prev,
                { id: `err-${Date.now()}`, role: 'model', text: '⚠️ Failed to get a response. Please try again.' },
            ]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // ── Derived values ─────────────────────────────────────────────────────────
    const buyZone = prediction ? (prediction.buyingZone ?? prediction.entryPrice * 0.97) : null;
    const sellZone = prediction ? (prediction.sellingZone ?? prediction.entryPrice * 1.06) : null;
    const sl = prediction?.stopLoss ?? null;
    const tp = prediction?.takeProfit ?? null;

    const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;

    return (
        <div className="flex flex-col gap-4 h-full">

            {/* ── Panel Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                        AI Analysis
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Multi-model AI · real-time market insight
                    </p>
                </div>
                {analysis && (
                    <button
                        onClick={() => { setAnalysis(null); setChatMessages([]); setChatOpen(false); }}
                        title="Reset analysis"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* ── Trader Levels — only shown when a prediction exists ────────── */}
            {prediction && (
                <div className="grid grid-cols-2 gap-2">
                    {buyZone !== null && (
                        <div className="p-2.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-center">
                            <p className="text-[10px] font-semibold text-[var(--color-success)] mb-0.5">Buy Wall</p>
                            <p className="text-xs font-bold font-mono-num text-[var(--color-success)]">
                                ${fmt(buyZone, instrument)}
                            </p>
                        </div>
                    )}
                    {sellZone !== null && (
                        <div className="p-2.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-center">
                            <p className="text-[10px] font-semibold text-[var(--color-danger)] mb-0.5">Sell Wall</p>
                            <p className="text-xs font-bold font-mono-num text-[var(--color-danger)]">
                                ${fmt(sellZone, instrument)}
                            </p>
                        </div>
                    )}
                    {sl !== null && (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                            <p className="text-[10px] font-semibold text-[var(--color-danger)] mb-0.5">Stop Loss</p>
                            <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">
                                ${fmt(sl, instrument)}
                            </p>
                        </div>
                    )}
                    {tp !== null && (
                        <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                            <p className="text-[10px] font-semibold text-[var(--color-success)] mb-0.5">Take Profit</p>
                            <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">
                                ${fmt(tp, instrument)}
                            </p>
                        </div>
                    )}
                    {prediction.entryPrice && (
                        <div className="col-span-2 p-2.5 rounded-xl bg-[var(--brand-glow)] border border-[var(--brand-primary)]/20 text-center">
                            <p className="text-[10px] font-semibold text-[var(--brand-primary)] mb-0.5">Entry Price</p>
                            <p className="text-xs font-bold font-mono-num text-[var(--brand-primary)]">
                                ${fmt(prediction.entryPrice, instrument)}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── CTA Button ─────────────────────────────────────────────────────── */}
            {isSubscribed ? (
                <Button
                    variant="primary"
                    size="sm"
                    className="w-full justify-center"
                    leftIcon={<Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />}
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                >
                    {isAnalyzing ? 'Analyzing...' : 'AI Analysis'}
                </Button>
            ) : (
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    leftIcon={<Lock className="w-3.5 h-3.5" />}
                    onClick={onUnlock}
                >
                    Unlock AI Analysis
                </Button>
            )}

            {/* ── Error ──────────────────────────────────────────────────────────── */}
            {analysisError && (
                analysisError === 'no_active_trades' ? (
                    <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex flex-col items-center gap-2 text-center">
                        <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center">
                            <Bot className="w-4 h-4 text-[var(--text-muted)]" />
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">No Active Trades</p>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                            There are no published setups for <span className="font-semibold text-[var(--text-primary)]">{instrument}</span> right now. Switch to another asset or check back later.
                        </p>
                    </div>
                ) : analysisError.includes('VITE_GEMINI_API_KEY') ? (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                            <span>⚙️</span> API Key Not Configured
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                            Add <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px]">VITE_GEMINI_API_KEY</code> to your <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px]">.env</code> file to enable AI Analysis.{' '}
                            Get a free key at{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--brand-primary)] hover:underline"
                            >
                                aistudio.google.com
                            </a>.
                        </p>
                    </div>
                ) : (
                    <div className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
                        <strong>Error:</strong> {analysisError}
                    </div>
                )
            )}

            {/* ── Analysis Result ────────────────────────────────────────────────── */}
            {analysis && verdictCfg && (
                <GlassCard hoverEffect={false} className="p-4 space-y-3 border border-[var(--border-subtle)]">
                    {/* Verdict badge */}
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${verdictCfg.bg} ${verdictCfg.color} ${verdictCfg.border}`}>
                        <verdictCfg.icon className="w-3.5 h-3.5" />
                        {verdictCfg.label}
                    </div>

                    {/* Overview */}
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{analysis.overview}</p>

                    {/* R:R */}
                    <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-0.5">Risk / Reward</p>
                        <p className="text-xs text-[var(--text-primary)]">{analysis.riskReward}</p>
                    </div>

                    {/* Sentiment */}
                    {analysis.sentiment && (
                        <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                            <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-0.5">Market Sentiment</p>
                            <p className="text-xs text-[var(--text-primary)]">{analysis.sentiment}</p>
                        </div>
                    )}

                    {/* Key points */}
                    {analysis.keyPoints.length > 0 && (
                        <ul className="space-y-1.5">
                            {analysis.keyPoints.map((pt, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
                                    {pt}
                                </li>
                            ))}
                        </ul>
                    )}
                </GlassCard>
            )}

            {/* ── Embedded Chat ──────────────────────────────────────────────────── */}
            {analysis && (
                <div className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                    {/* Chat toggle header */}
                    <button
                        onClick={() => setChatOpen((p) => !p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                        <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <Bot className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            Ask Beast AI
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                        </span>
                        {chatOpen
                            ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        }
                    </button>

                    {chatOpen && (
                        <div className="flex flex-col bg-[var(--bg-surface)]">
                            {/* Message thread */}
                            <div className="max-h-56 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                                {chatMessages.length === 0 && (
                                    <p className="text-[11px] text-[var(--text-muted)] text-center py-2">
                                        Ask a follow-up question about this setup…
                                    </p>
                                )}
                                {chatMessages.map((m) => (
                                    <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        {m.role === 'model' && (
                                            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Sparkles className="w-2.5 h-2.5" />
                                            </div>
                                        )}
                                        <div className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed whitespace-pre-wrap ${m.role === 'user'
                                                ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white rounded-tr-sm'
                                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-tl-sm'
                                            }`}>
                                            {m.text}
                                        </div>
                                        {m.role === 'user' && (
                                            <div className="w-5 h-5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <User className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isChatLoading && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center">
                                            <Sparkles className="w-2.5 h-2.5 animate-pulse" />
                                        </div>
                                        <div className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] flex items-center gap-1">
                                            {[0, 1, 2].map((i) => (
                                                <span
                                                    key={i}
                                                    className="w-1 h-1 rounded-full bg-[var(--brand-primary)] animate-bounce"
                                                    style={{ animationDelay: `${i * 140}ms` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={chatBottomRef} />
                            </div>

                            {/* Chat input */}
                            <div className="p-2.5 border-t border-[var(--border-subtle)]">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
                                    className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 focus-within:border-[var(--brand-primary)] focus-within:ring-1 focus-within:ring-[var(--brand-primary)]/20 transition-all"
                                >
                                    <input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask about risk, confluences, entry…"
                                        className="flex-1 bg-transparent text-[11px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!chatInput.trim() || isChatLoading}
                                        className="w-6 h-6 rounded-lg bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
                                    >
                                        <Send className="w-3 h-3" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
