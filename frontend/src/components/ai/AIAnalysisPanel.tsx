/**
 * AIAnalysisPanel
 *
 * Idle state: clean prompt — no data shown until the user requests analysis.
 * Active state: signal levels + AI analysis displayed together in one view.
 * Chat: available after analysis runs.
 */

import { useState, useRef, useEffect } from 'react';
import {
    Sparkles, Send, Bot, User, RotateCcw, Lock,
    TrendingUp, TrendingDown, ShieldCheck, AlertTriangle,
    ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '../ui/Button';
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
    /** Called the moment the user triggers analysis — reveals signals on the chart */
    onAnalysisStart?: () => void;
    /** Called when the user resets — hides signals from the chart again */
    onReset?: () => void;
}

// ─── Verdict config ───────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
    BULLISH: { label: 'Bullish', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]', border: 'border-[var(--color-success)]/30', icon: TrendingUp },
    BEARISH: { label: 'Bearish', color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-bg)]', border: 'border-[var(--color-danger)]/30', icon: TrendingDown },
    NEUTRAL: { label: 'Neutral', color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-subtle)]', icon: ShieldCheck },
    CAUTION: { label: 'Caution', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', border: 'border-[var(--color-warning)]/30', icon: AlertTriangle },
} as const;

// ─── Price formatter ──────────────────────────────────────────────────────────

function fmt(n: number, instrument: string) {
    if (instrument === 'SILVER') return n.toFixed(3);
    if (instrument === 'XRP/USDT') return n.toFixed(4);
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AIAnalysisPanel({ instrument, prediction, isSubscribed, onUnlock, onAnalysisStart, onReset }: Props) {
    const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    const chatBottomRef = useRef<HTMLDivElement>(null);

    // Reset everything when the instrument changes
    useEffect(() => {
        setAnalysis(null);
        setAnalysisError(null);
        setChatMessages([]);
        setChatOpen(false);
    }, [instrument]);

    // Auto-scroll chat
    useEffect(() => {
        if (chatOpen) {
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
        }
    }, [chatMessages, chatOpen, isChatLoading]);

    // ── Trigger analysis ───────────────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!prediction) return;
        setIsAnalyzing(true);
        setAnalysisError(null);
        setAnalysis(null);
        setChatMessages([]);
        setChatOpen(false);
        onAnalysisStart?.(); // reveal signals on the chart immediately
        try {
            const result = await analyzeTraderSetup(prediction);
            setAnalysis(result);
            setChatOpen(true);
        } catch (err) {
            setAnalysisError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => {
        setAnalysis(null);
        setAnalysisError(null);
        setChatMessages([]);
        setChatOpen(false);
        onReset?.(); // hide signals from the chart again
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
            const history: GeminiMessage[] = updatedMessages.map((m) => ({
                role: m.role,
                parts: [{ text: m.text }],
            }));
            const reply = await sendChatMessage(history, prediction ?? null);
            setChatMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: 'model', text: reply }]);
        } catch {
            setChatMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'model', text: '⚠️ Failed to get a response. Please try again.' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-4">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Snyprr AI</h3>
                </div>
                {analysis && (
                    <button
                        onClick={handleReset}
                        title="Reset analysis"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* ── IDLE STATE — no analysis yet ────────────────────────────────── */}
            {!analysis && !analysisError && (
                <>
                    {/* Prompt card */}
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5 flex flex-col items-center gap-3 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        {prediction ? (
                            <>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {instrument} Setup Ready
                                </p>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                    Click below to run AI analysis. Signal levels, verdict, risk/reward evaluation and key points will all appear together.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    No Active Setup
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    No trader signal is active for <span className="font-semibold text-[var(--text-primary)]">{instrument}</span> right now.
                                </p>
                            </>
                        )}
                    </div>

                    {/* CTA */}
                    {isSubscribed ? (
                        <Button
                            variant="primary"
                            size="sm"
                            className="w-full justify-center"
                            leftIcon={<Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />}
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || !prediction}
                        >
                            {isAnalyzing ? 'Analyzing…' : 'Run AI Analysis'}
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
                </>
            )}

            {/* ── LOADING STATE ────────────────────────────────────────────────── */}
            {isAnalyzing && (
                <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 flex flex-col items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        {[0, 1, 2, 3].map((i) => (
                            <span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-bounce"
                                style={{ animationDelay: `${i * 120}ms` }}
                            />
                        ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Running analysis on {instrument}…</p>

            {/* ── ERROR STATE ──────────────────────────────────────────────────── */}
            {analysisError && !isAnalyzing && (
                <div className="space-y-3">
                    {analysisError.includes('VITE_GEMINI_API_KEY') ? (
                        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                <span>⚙️</span> API Key Not Configured
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                                Add <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px]">VITE_GEMINI_API_KEY</code> to your <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-mono text-[10px]">.env</code> file.{' '}
                                Get a free key at{' '}
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">
                                    aistudio.google.com
                                </a>.
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
                            <strong>Error:</strong> {analysisError}
                        </div>
                    )}
                    <Button variant="secondary" size="sm" className="w-full justify-center" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={handleReset}>
                        Try Again
                    </Button>
                </div>
            )}

            {/* ── ANALYSIS RESULT — signals + AI together ──────────────────────── */}
            {analysis && verdictCfg && !isAnalyzing && (
                <div className="space-y-3">

                    {/* Verdict header */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${verdictCfg.bg} ${verdictCfg.border}`}>
                        <verdictCfg.icon className={`w-4 h-4 ${verdictCfg.color}`} />
                        <span className={`text-sm font-bold ${verdictCfg.color}`}>{verdictCfg.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-auto font-medium uppercase tracking-wider">{instrument} · {prediction?.timeframe}</span>
                    </div>

                    {/* Signal levels — shown as part of the analysis result */}
                    {prediction && (
                        <div className="grid grid-cols-2 gap-2">
                            {prediction.buyingZone != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-center">
                                    <p className="text-[10px] font-semibold text-[var(--color-success)] mb-0.5">Buy Zone</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--color-success)]">${fmt(prediction.buyingZone, instrument)}</p>
                                </div>
                            )}
                            {prediction.sellingZone != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-center">
                                    <p className="text-[10px] font-semibold text-[var(--color-danger)] mb-0.5">Sell Zone</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--color-danger)]">${fmt(prediction.sellingZone, instrument)}</p>
                                </div>
                            )}
                            {prediction.stopLoss != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                                    <p className="text-[10px] font-semibold text-orange-400 mb-0.5">Stop Loss</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">${fmt(prediction.stopLoss, instrument)}</p>
                                </div>
                            )}
                            {prediction.takeProfit != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                                    <p className="text-[10px] font-semibold text-emerald-400 mb-0.5">Take Profit</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">${fmt(prediction.takeProfit, instrument)}</p>
                                </div>
                            )}
                            {prediction.takeProfit2 != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                                    <p className="text-[10px] font-semibold text-emerald-300 mb-0.5">TP2</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">${fmt(prediction.takeProfit2, instrument)}</p>
                                </div>
                            )}
                            {prediction.takeProfit3 != null && (
                                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                                    <p className="text-[10px] font-semibold text-emerald-200 mb-0.5">TP3</p>
                                    <p className="text-xs font-bold font-mono-num text-[var(--text-primary)]">${fmt(prediction.takeProfit3, instrument)}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Divider */}
                    <div className="h-[1px] bg-[var(--border-subtle)]" />

                    {/* AI Overview */}
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{analysis.overview}</p>

                    {/* Risk/Reward */}
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

                    {/* Disclaimer */}
                    <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed">
                        AI commentary only — not financial advice. Signal levels are sourced from trader upload.
                    </p>
                </div>
            )}

            {/* ── Chat — only visible after analysis ──────────────────────────── */}
            {analysis && !isAnalyzing && (
                <div className="border border-[var(--border-subtle)] rounded-2xl overflow-hidden">
                    <button
                        onClick={() => setChatOpen((p) => !p)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                        <span className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                            <Bot className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            Ask Snyprr AI
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
                        </span>
                        {chatOpen
                            ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        }
                    </button>

                    {chatOpen && (
                        <div className="flex flex-col bg-[var(--bg-surface)]">
                            <div className="max-h-56 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                                {chatMessages.length === 0 && (
                                    <p className="text-[11px] text-[var(--text-muted)] text-center py-2">
                                        Ask a follow-up about this setup…
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
                                                <span key={i} className="w-1 h-1 rounded-full bg-[var(--brand-primary)] animate-bounce" style={{ animationDelay: `${i * 140}ms` }} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div ref={chatBottomRef} />
                            </div>

                            <div className="p-2.5 border-t border-[var(--border-subtle)]">
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleChatSend(); }}
                                    className="flex items-center gap-2 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 focus-within:border-[var(--brand-primary)] focus-within:ring-1 focus-within:ring-[var(--brand-primary)]/20 transition-all"
                                >
                                    <input
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask about risk, confluences, levels…"
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
