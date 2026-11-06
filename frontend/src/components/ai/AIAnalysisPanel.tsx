/**
 * AIAnalysisPanel — Professional AI Trading Terminal Panel
 *
 * Sections (when analysis is active):
 *   • Market Overview      — concise summary of current conditions
 *   • Trend Analysis       — bullish / bearish / sideways verdict
 *   • Price Action         — key movements and patterns
 *   • Support & Resistance — key levels derived from the setup
 *   • Market Signals       — bullish / bearish signals with explanations
 *   • AI Insights          — contextual observations
 *   • Ask Snyprr AI        — follow-up chat (collapsible)
 *
 * Idle  → shows prompt card and CTA
 * Loading → animated pulse skeleton
 * Error → user-friendly error with retry
 * Active → full structured analysis + chat
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Send, Bot, User, RotateCcw, Lock,
  TrendingUp, TrendingDown, ShieldCheck, AlertTriangle,
  ChevronDown, ChevronUp, Activity, BarChart2,
  Target, Zap, Brain, RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { analyzeTraderSetup, sendChatMessage } from '../../services/api/geminiService';
import type { GeminiAnalysisResult, GeminiMessage } from '../../services/api/geminiService';
import type { Prediction } from '../../types';
import { usePaperSignalStore } from '../../state/usePaperSignalStore';
import { useNavigate } from 'react-router-dom';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface Props {
  instrument: string;
  prediction: Prediction | null | undefined;
  isSubscribed: boolean;
  onUnlock: () => void;
  /** Called the moment the user triggers analysis — reveals signals on the chart */
  onAnalysisStart?: () => void;
  /** Called when the user resets — hides signals from the chart again */
  onReset?: () => void;
}

// ─── Verdict config ─────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  BULLISH: {
    label: 'Bullish',
    color: 'text-[var(--color-success)]',
    bg: 'bg-[var(--color-success-bg)]',
    border: 'border-[var(--color-success)]/30',
    dot: 'bg-[var(--color-success)]',
    icon: TrendingUp,
  },
  BEARISH: {
    label: 'Bearish',
    color: 'text-[var(--color-danger)]',
    bg: 'bg-[var(--color-danger-bg)]',
    border: 'border-[var(--color-danger)]/30',
    dot: 'bg-[var(--color-danger)]',
    icon: TrendingDown,
  },
  NEUTRAL: {
    label: 'Neutral',
    color: 'text-[var(--text-secondary)]',
    bg: 'bg-[var(--bg-secondary)]',
    border: 'border-[var(--border-subtle)]',
    dot: 'bg-[var(--text-muted)]',
    icon: ShieldCheck,
  },
  CAUTION: {
    label: 'Caution',
    color: 'text-[var(--color-warning)]',
    bg: 'bg-[var(--color-warning-bg)]',
    border: 'border-[var(--color-warning)]/30',
    dot: 'bg-[var(--color-warning)]',
    icon: AlertTriangle,
  },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number, instrument: string) {
  if (instrument === 'SILVER') return n.toFixed(3);
  if (instrument === 'XRP/USDT') return n.toFixed(4);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Derive support/resistance from prediction levels
function getSupportResistance(prediction: Prediction | null | undefined) {
  if (!prediction) return { supports: [], resistances: [] };
  const supports: { level: number; label: string }[] = [];
  const resistances: { level: number; label: string }[] = [];

  if (prediction.stopLoss) supports.push({ level: prediction.stopLoss, label: 'Stop Loss Zone' });
  if (prediction.buyingZone) supports.push({ level: prediction.buyingZone, label: 'Buy Zone / Support' });
  if (prediction.sellingZone) resistances.push({ level: prediction.sellingZone, label: 'Sell Zone / Resistance' });
  if (prediction.takeProfit) resistances.push({ level: prediction.takeProfit, label: 'TP1 Target' });
  if (prediction.takeProfit2) resistances.push({ level: prediction.takeProfit2, label: 'TP2 Target' });
  if (prediction.takeProfit3) resistances.push({ level: prediction.takeProfit3, label: 'TP3 Target' });

  if (prediction.direction === 'SHORT') return { supports: resistances, resistances: supports };
  return { supports, resistances };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.FC<any>; title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2">
      <Icon className="w-3 h-3 text-[var(--brand-primary)] flex-shrink-0" />
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">{title}</span>
    </div>
  );
}

function PulseRow() {
  return (
    <div className="h-3 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
  );
}

function LoadingSkeleton({ instrument }: { instrument: string }) {
  return (
    <div className="space-y-4">
      {/* Verdict skeleton */}
      <div className="h-10 rounded-xl bg-[var(--bg-secondary)] animate-pulse" />
      {/* Sections */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-2 w-24 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
          <PulseRow />
          <div className="h-3 w-4/5 rounded-full bg-[var(--bg-secondary)] animate-pulse" />
        </div>
      ))}
      <p className="text-[10px] text-[var(--text-muted)] text-center animate-pulse">
        Running analysis on {instrument}…
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AIAnalysisPanel({
  instrument,
  prediction,
  isSubscribed,
  onUnlock,
  onAnalysisStart,
  onReset,
}: Props) {
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const setSignal = usePaperSignalStore((s) => s.setSignal);
  const navigate = useNavigate();

  // Reset when instrument changes
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

  // ── Trigger analysis ─────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!prediction) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysis(null);
    setChatMessages([]);
    setChatOpen(false);
    onAnalysisStart?.();
    try {
      const result = await analyzeTraderSetup(prediction);
      setAnalysis(result);
      setChatOpen(true);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [prediction, onAnalysisStart]);

  const handleReset = useCallback(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setChatMessages([]);
    setChatOpen(false);
    onReset?.();
  }, [onReset]);

  // ── Chat ─────────────────────────────────────────────────────────────────

  const handleChatSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || isChatLoading) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', text };
    const updated = [...chatMessages, userMsg];
    setChatMessages(updated);
    setChatInput('');
    setIsChatLoading(true);
    try {
      const history: GeminiMessage[] = updated.map((m) => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));
      const reply = await sendChatMessage(history, prediction ?? null);
      setChatMessages((prev) => [...prev, { id: `m-${Date.now()}`, role: 'model', text: reply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'model', text: '⚠️ Failed to get a response. Please try again.' },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, isChatLoading, chatMessages, prediction]);

  const verdictCfg = analysis ? VERDICT_CONFIG[analysis.verdict] : null;
  const { supports, resistances } = getSupportResistance(prediction);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Panel Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center shadow-sm shadow-[var(--brand-primary)]/30">
            <Brain className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[var(--text-primary)] leading-none">Snyprr AI</h3>
            <p className="text-[9px] text-[var(--text-muted)] mt-0.5 leading-none">Market Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          {!analysis && !isAnalyzing && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />
              Idle
            </span>
          )}
          {isAnalyzing && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--brand-primary)] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] animate-pulse" />
              Analyzing
            </span>
          )}
          {analysis && !isAnalyzing && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-[var(--color-success)] uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
              Live
            </span>
          )}
          {/* Reset button */}
          {analysis && (
            <button
              onClick={handleReset}
              title="Reset analysis"
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable Body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5 min-h-0">

        {/* ── LOADING STATE ──────────────────────────────────────────────── */}
        {isAnalyzing && <LoadingSkeleton instrument={instrument} />}

        {/* ── IDLE STATE ─────────────────────────────────────────────────── */}
        {!analysis && !analysisError && !isAnalyzing && (
          <div className="space-y-4">

            {/* Asset badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Selected Asset</span>
              <span className="text-xs font-extrabold text-[var(--brand-primary)] px-2.5 py-1 rounded-lg bg-[var(--brand-glow)] border border-[var(--brand-primary)]/20">
                {instrument}
              </span>
            </div>

            {/* Prompt card */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center shadow-lg shadow-[var(--brand-primary)]/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {prediction ? (
                <>
                  <div>
                    <p className="text-sm font-bold text-[var(--text-primary)]">{instrument} Setup Ready</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                      Analyze market overview, trend direction, price action, support &amp; resistance levels, and active signals.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">No Active Setup</p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    No trader signal is active for <span className="font-semibold text-[var(--text-primary)]">{instrument}</span> right now.
                  </p>
                </>
              )}
            </div>

            {/* What you'll get preview */}
            {prediction && (
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { icon: Activity, label: 'Market Overview' },
                  { icon: TrendingUp, label: 'Trend Analysis' },
                  { icon: BarChart2, label: 'Price Action' },
                  { icon: Target, label: 'Support & Resistance' },
                  { icon: Zap, label: 'Market Signals' },
                  { icon: Brain, label: 'AI Insights' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <Icon className="w-3 h-3 text-[var(--brand-primary)]/60 flex-shrink-0" />
                    {label}
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            {isSubscribed ? (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={handleAnalyze}
                disabled={!prediction}
              >
                Run AI Analysis
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
          </div>
        )}

        {/* ── ERROR STATE ─────────────────────────────────────────────────── */}
        {analysisError && !isAnalyzing && (
          <div className="space-y-3">
            {analysisError.includes('quota exceeded') ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>🚫</span> AI Quota Exceeded
                </p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  You've reached your AI request limit for this hour. Upgrade for higher limits or wait for your quota to reset.
                </p>
              </div>
            ) : analysisError.includes('API key') || analysisError.includes('GEMINI') ? (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2">
                <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span>⚙️</span> AI Service Configuration Error
                </p>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  The AI service is not configured properly. Please contact support.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-xs text-[var(--color-danger)]">
                <strong>Error:</strong> {analysisError}
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-center"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleReset}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* ── ANALYSIS RESULT ─────────────────────────────────────────────── */}
        {analysis && verdictCfg && !isAnalyzing && (
          <div className="space-y-5">

            {/* ── Verdict Badge ─────────────────────────────────────────── */}
            <div className={`flex items-center gap-2.5 px-3.5 py-3 rounded-xl border ${verdictCfg.bg} ${verdictCfg.border}`}>
              <div className={`w-8 h-8 rounded-lg ${verdictCfg.bg} border ${verdictCfg.border} flex items-center justify-center flex-shrink-0`}>
                <verdictCfg.icon className={`w-4 h-4 ${verdictCfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-extrabold leading-none ${verdictCfg.color}`}>{verdictCfg.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium">
                  {instrument}{prediction?.timeframe ? ` · ${prediction.timeframe}` : ''}
                  {prediction?.direction ? ` · ${prediction.direction}` : ''}
                </p>
              </div>
              <span className={`w-2 h-2 rounded-full ${verdictCfg.dot} shadow-[0_0_6px_currentColor] flex-shrink-0`} />
            </div>

            {/* ── Market Overview ───────────────────────────────────────── */}
            <div>
              <SectionHeader icon={Activity} title="Market Overview" />
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{analysis.overview}</p>
            </div>

            {/* ── Trend Analysis ────────────────────────────────────────── */}
            <div>
              <SectionHeader icon={TrendingUp} title="Trend Analysis" />
              <div className="flex items-start gap-2">
                <div className={`w-1 rounded-full flex-shrink-0 mt-0.5 self-stretch ${verdictCfg.dot}`} style={{ minHeight: 32 }} />
                <div className="space-y-1 flex-1">
                  <p className={`text-xs font-bold ${verdictCfg.color}`}>{verdictCfg.label} Bias</p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{analysis.sentiment}</p>
                </div>
              </div>
            </div>

            {/* ── Price Action ──────────────────────────────────────────── */}
            <div>
              <SectionHeader icon={BarChart2} title="Price Action" />
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{analysis.riskReward}</p>
              </div>
            </div>

            {/* ── Support & Resistance ──────────────────────────────────── */}
            {(supports.length > 0 || resistances.length > 0) && (
              <div>
                <SectionHeader icon={Target} title="Support & Resistance" />
                <div className="space-y-1.5">
                  {resistances.map((r) => (
                    <div key={r.level} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/15">
                      <span className="text-[10px] font-semibold text-[var(--color-danger)]">{r.label}</span>
                      <span className="text-[11px] font-bold font-mono text-[var(--color-danger)]">
                        ${fmt(r.level, instrument)}
                      </span>
                    </div>
                  ))}
                  {supports.map((s) => (
                    <div key={s.level} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[var(--color-success-bg)] border border-[var(--color-success)]/15">
                      <span className="text-[10px] font-semibold text-[var(--color-success)]">{s.label}</span>
                      <span className="text-[11px] font-bold font-mono text-[var(--color-success)]">
                        ${fmt(s.level, instrument)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Market Signals ────────────────────────────────────────── */}
            {analysis.keyPoints.length > 0 && (
              <div>
                <SectionHeader icon={Zap} title="Market Signals" />
                <ul className="space-y-2">
                  {analysis.keyPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] flex-shrink-0" />
                      <span className="text-[11px] text-[var(--text-secondary)] leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── AI Insights + R/R ────────────────────────────────────── */}
            {prediction && (prediction.buyingZone || prediction.sellingZone || prediction.stopLoss || prediction.takeProfit) && (
              <div>
                <SectionHeader icon={Brain} title="AI Insights" />
                <div className="grid grid-cols-2 gap-1.5">
                  {prediction.buyingZone != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/20 text-center">
                      <p className="text-[9px] font-bold text-[var(--color-success)] mb-0.5 uppercase tracking-wide">Buy Zone</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--color-success)]">${fmt(prediction.buyingZone, instrument)}</p>
                    </div>
                  )}
                  {prediction.sellingZone != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-center">
                      <p className="text-[9px] font-bold text-[var(--color-danger)] mb-0.5 uppercase tracking-wide">Sell Zone</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--color-danger)]">${fmt(prediction.sellingZone, instrument)}</p>
                    </div>
                  )}
                  {prediction.stopLoss != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                      <p className="text-[9px] font-bold text-orange-400 mb-0.5 uppercase tracking-wide">Stop Loss</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--text-primary)]">${fmt(prediction.stopLoss, instrument)}</p>
                    </div>
                  )}
                  {prediction.takeProfit != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                      <p className="text-[9px] font-bold text-emerald-400 mb-0.5 uppercase tracking-wide">TP1</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--text-primary)]">${fmt(prediction.takeProfit, instrument)}</p>
                    </div>
                  )}
                  {prediction.takeProfit2 != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                      <p className="text-[9px] font-bold text-emerald-300 mb-0.5 uppercase tracking-wide">TP2</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--text-primary)]">${fmt(prediction.takeProfit2, instrument)}</p>
                    </div>
                  )}
                  {prediction.takeProfit3 != null && (
                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-center">
                      <p className="text-[9px] font-bold text-emerald-200 mb-0.5 uppercase tracking-wide">TP3</p>
                      <p className="text-xs font-extrabold font-mono text-[var(--text-primary)]">${fmt(prediction.takeProfit3, instrument)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Disclaimer ───────────────────────────────────────────── */}
            <p className="text-[9px] text-[var(--text-muted)] italic leading-relaxed pb-1">
              AI commentary only — not financial advice. Signal levels are sourced from trader upload.
            </p>

            {/* ── Paper Trading CTA ────────────────────────────────────── */}
            {prediction && (
              <button
                type="button"
                onClick={() => { setSignal(prediction); navigate('/my-trades'); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl
                           bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)]
                           text-white text-xs font-bold shadow-lg shadow-[var(--brand-primary)]/25
                           hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Test on Paper Trading
              </button>
            )}
          </div>
        )}

        {/* ── Chat — only after analysis ──────────────────────────────────── */}
        {analysis && !isAnalyzing && (
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
            <button
              onClick={() => setChatOpen((p) => !p)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[var(--bg-secondary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
            >
              <span className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-primary)]">
                <Bot className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                Ask Snyprr AI
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              </span>
              {chatOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
            </button>

            {chatOpen && (
              <div className="flex flex-col bg-[var(--bg-surface)]">
                <div className="max-h-52 overflow-y-auto p-3 space-y-3 scrollbar-thin">
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
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 animate-pulse text-white" />
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
    </div>
  );
}
