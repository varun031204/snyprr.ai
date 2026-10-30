import React, { useState, useEffect, useCallback } from 'react';
import {
    ExternalLink, RefreshCw, TrendingUp, Clock, Globe,
    Zap, Bitcoin, BarChart2, ShieldCheck, Newspaper,
    AlertCircle, Sparkles, X, TrendingDown, Minus, CalendarDays,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import {
    fetchNewsCategory,
    clearNewsCache,
    type NewsArticle,
    type NewsCategory,
} from '../../services/api/newsService';
import { httpPost } from '../../services/api/httpClient';
import { getLivePriceContext } from '../../services/market/priceService';
import { EconomicCalendarFull } from '../../components/news/EconomicCalendar';

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORIES: Array<{
    id: NewsCategory;
    label: string;
    icon: React.ReactNode;
    description: string;
}> = [
        { id: 'all', label: 'All Markets', icon: <Globe className="w-3.5 h-3.5" />, description: 'Latest news across crypto, macro, and markets' },
        { id: 'bitcoin', label: 'Bitcoin', icon: <Bitcoin className="w-3.5 h-3.5" />, description: 'BTC price action, on-chain, and market analysis' },
        { id: 'ethereum', label: 'Ethereum', icon: <TrendingUp className="w-3.5 h-3.5" />, description: 'ETH ecosystem, DeFi, and layer-2 news' },
        { id: 'forex-macro', label: 'Forex & Macro', icon: <BarChart2 className="w-3.5 h-3.5" />, description: 'Fed, ECB, interest rates, DXY — macro events that move crypto' },
        { id: 'regulation', label: 'Regulation', icon: <ShieldCheck className="w-3.5 h-3.5" />, description: 'SEC, CFTC, global crypto regulation and policy' },
        { id: 'breaking', label: 'Breaking', icon: <Zap className="w-3.5 h-3.5" />, description: 'Breaking news from the last 2 hours' },
    ];

// ── AI Market Analysis types ───────────────────────────────────────────────────

interface MarketAnalysis {
    headline: string;
    overview: string;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTION';
    impact: {
        btc: string;
        eth: string;
        gold: string;
        forex: string;
    };
    keyRisks: string[];
    keyDrivers: string[];
    disclaimer: string;
}

// ── AI analysis helpers ───────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
    BULLISH: { color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-bg)]', border: 'border-[var(--color-success)]/30', Icon: TrendingUp, label: 'Bullish' },
    BEARISH: { color: 'text-[var(--color-danger)]', bg: 'bg-[var(--color-danger-bg)]', border: 'border-[var(--color-danger)]/30', Icon: TrendingDown, label: 'Bearish' },
    NEUTRAL: { color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--bg-secondary)]', border: 'border-[var(--border-subtle)]', Icon: Minus, label: 'Neutral' },
    CAUTION: { color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-bg)]', border: 'border-[var(--color-warning)]/30', Icon: AlertCircle, label: 'Caution' },
} as const;

async function analyseMarketWithAI(articles: NewsArticle[]): Promise<MarketAnalysis> {
    // Build headline list from top articles (max 15 to stay within token limits)
    const top = articles.slice(0, 15);
    const bulletList = top
        .map((a) => `• [${a.source}] ${a.title}`)
        .join('\n');

    let priceContext = '';
    try { priceContext = await getLivePriceContext(); } catch { /* non-fatal */ }

    const prompt = `You are a professional market analyst reviewing today's financial news headlines. Analyse these headlines and provide a concise structured market assessment.

TODAY'S HEADLINES:
${bulletList}
${priceContext}

IMPORTANT RULES:
- Base your analysis on the headlines above only — do not invent data
- Do NOT provide financial advice — frame everything as educational market commentary
- Be concise and specific
- AI must never invent trader reasoning or make price predictions

Respond in this EXACT JSON format (no markdown, no extra text):
{
  "headline": "<one sentence headline summarising the overall market story today>",
  "overview": "<2-3 sentences summarising the dominant market narrative based on these headlines>",
  "sentiment": "<one of: BULLISH | BEARISH | NEUTRAL | CAUTION>",
  "impact": {
    "btc":   "<one sentence on BTC-specific news impact>",
    "eth":   "<one sentence on ETH-specific news impact>",
    "gold":  "<one sentence on gold/commodities news impact>",
    "forex": "<one sentence on forex/macro news impact>"
  },
  "keyRisks":   ["<risk 1>", "<risk 2>", "<risk 3>"],
  "keyDrivers": ["<driver 1>", "<driver 2>", "<driver 3>"],
  "disclaimer": "This analysis is based on published news headlines and is for educational purposes only. Not financial advice."
}`;

    const res = await httpPost<{ response?: string }>('/api/ai/copilot', {
        messages: [{ role: 'user', parts: [{ text: prompt }] }],
        priceContext,
    });

    const raw = res.response ?? '';
    const cleaned = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(cleaned) as MarketAnalysis;
}

// ── Market Analysis Modal ─────────────────────────────────────────────────────

function MarketAnalysisModal({
    analysis,
    onClose,
}: {
    analysis: MarketAnalysis;
    onClose: () => void;
}) {
    const cfg = SENTIMENT_CONFIG[analysis.sentiment] ?? SENTIMENT_CONFIG.NEUTRAL;
    const SentimentIcon = cfg.Icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[var(--border-glass)] bg-[var(--bg-surface-glass)] backdrop-blur-2xl shadow-2xl scrollbar-thin"
                style={{ animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both' }}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl rounded-t-3xl">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] flex items-center justify-center shadow-md">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">AI Market Analysis</h2>
                            <p className="text-[10px] text-[var(--text-muted)]">Based on today's headlines · Educational only</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">
                    {/* Sentiment verdict */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
                        <SentimentIcon className={`w-5 h-5 ${cfg.color} flex-shrink-0`} />
                        <div>
                            <p className={`text-sm font-extrabold ${cfg.color}`}>{cfg.label} Market Sentiment</p>
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">{analysis.headline}</p>
                        </div>
                    </div>

                    {/* Overview */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Market Overview</p>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{analysis.overview}</p>
                    </div>

                    {/* Asset impact grid */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">Asset Impact</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {[
                                { label: 'BTC', value: analysis.impact.btc, color: 'text-[var(--color-warning)]' },
                                { label: 'ETH', value: analysis.impact.eth, color: 'text-[var(--brand-primary)]' },
                                { label: 'GOLD', value: analysis.impact.gold, color: 'text-amber-400' },
                                { label: 'FOREX', value: analysis.impact.forex, color: 'text-[var(--color-info)]' },
                            ].map((item) => (
                                <div key={item.label} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                                    <p className={`text-[10px] font-extrabold uppercase tracking-wider ${item.color} mb-1`}>{item.label}</p>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Key drivers & risks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-success)] uppercase tracking-wider mb-2">Key Drivers</p>
                            <ul className="space-y-1.5">
                                {analysis.keyDrivers.map((d, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-success)] flex-shrink-0" />
                                        {d}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-[var(--color-danger)] uppercase tracking-wider mb-2">Key Risks</p>
                            <ul className="space-y-1.5">
                                {analysis.keyRisks.map((r, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] flex-shrink-0" />
                                        {r}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="text-[10px] text-[var(--text-muted)] italic leading-relaxed border-t border-[var(--border-subtle)] pt-4">
                        ⚠️ {analysis.disclaimer}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Credibility dot ───────────────────────────────────────────────────────────

function CredibilityDot({ score }: { score: number }) {
    const color =
        score >= 0.8 ? 'bg-[var(--color-success)]' :
            score >= 0.6 ? 'bg-[var(--color-warning)]' :
                'bg-[var(--text-muted)]';
    return (
        <span
            title={`Source credibility: ${Math.round(score * 100)}%`}
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color}`}
        />
    );
}

// ── Single news card ──────────────────────────────────────────────────────────

function NewsCard({ article }: { article: NewsArticle }) {
    return (
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="group block">
            <GlassCard className="h-full flex flex-col gap-3 p-5 hover:border-[var(--brand-primary)] transition-all duration-200">
                {article.imageUrl ? (
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-36 object-cover rounded-xl"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                ) : (
                    <div className="w-full h-28 rounded-xl bg-gradient-to-br from-[var(--brand-glow)] to-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                        <Newspaper className="w-8 h-8 text-[var(--brand-primary)] opacity-40" />
                    </div>
                )}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <CredibilityDot score={article.credibility} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)] truncate">{article.source}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {article.timeAgo || timeAgo(article.publishedAt)}
                    </span>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-3 group-hover:text-[var(--brand-primary)] transition-colors flex-1">
                    {article.title}
                </h3>
                {article.description && (
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">{article.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] mt-auto pt-2 border-t border-[var(--border-subtle)]">
                    Read full story
                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
            </GlassCard>
        </a>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActiveTab = NewsCategory | 'calendar';

export default function NewsPage() {
    const [activeTab, setActiveTab] = useState<ActiveTab>('all');
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    // AI analysis state
    const [isAnalysing, setIsAnalysing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<MarketAnalysis | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const isCalendar = activeTab === 'calendar';
    const activeCategory = isCalendar ? 'all' : (activeTab as NewsCategory);

    const loadNews = useCallback(async (category: NewsCategory, force = false) => {
        setIsLoading(true);
        setError(null);
        if (force) clearNewsCache(category);
        try {
            const data = await fetchNewsCategory(category, 12);
            setArticles(data);
            setLastUpdated(new Date());
            if (data.length === 0) {
                setError('No articles found for this category right now. Try another tab.');
            }
        } catch {
            setError('Could not load news. Check your connection and try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isCalendar) loadNews(activeCategory);
    }, [activeTab, loadNews, isCalendar, activeCategory]);

    // Auto-refresh news every 3 minutes (not calendar)
    useEffect(() => {
        if (isCalendar) return;
        const timer = setInterval(() => loadNews(activeCategory, true), 3 * 60 * 1000);
        return () => clearInterval(timer);
    }, [activeCategory, isCalendar, loadNews]);

    const handleAnalyseMarket = async () => {
        if (articles.length === 0) return;
        setIsAnalysing(true);
        setAnalysisError(null);
        try {
            const result = await analyseMarketWithAI(articles);
            setAnalysisResult(result);
        } catch (e: any) {
            if (e?.status === 429 || (e?.message ?? '').includes('quota')) {
                setAnalysisError('AI quota exceeded. Please wait and try again.');
            } else if ((e?.message ?? '').includes('Unauthorized') || e?.status === 401) {
                setAnalysisError('Please log in to use AI market analysis.');
            } else {
                setAnalysisError('Analysis failed. Check your connection and try again.');
            }
        } finally {
            setIsAnalysing(false);
        }
    };

    const activeCatDesc = isCalendar
        ? 'Scheduled macro events that historically move crypto — CPI, Fed decisions, NFP, GDP, PMI and more'
        : (CATEGORIES.find((c) => c.id === activeTab)?.description ?? '');

    return (
        <div className="max-w-7xl mx-auto space-y-6">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Globe className="w-6 h-6 text-[var(--brand-primary)]" />
                        Market News
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
                        {activeCatDesc}
                        {!isCalendar && ` · Updated ${timeAgo(lastUpdated.toISOString())}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Analyse Market — only visible on news tabs */}
                    {!isCalendar && (
                        <Button
                            variant="primary"
                            size="sm"
                            leftIcon={
                                isAnalysing
                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0" />
                                    : <Sparkles className="w-4 h-4" />
                            }
                            onClick={handleAnalyseMarket}
                            disabled={isAnalysing || articles.length === 0}
                        >
                            {isAnalysing ? 'Analysing...' : 'Analyse Market'}
                        </Button>
                    )}
                    {!isCalendar && (
                        <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
                            onClick={() => loadNews(activeCategory, true)}
                            disabled={isLoading}
                        >
                            Refresh
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Analysis error ───────────────────────────────────────────────── */}
            {analysisError && (
                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-xs">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {analysisError}
                    </div>
                    <button onClick={() => setAnalysisError(null)} className="p-1 hover:opacity-70">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* ── Tabs ─────────────────────────────────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {/* News category tabs */}
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all ${activeTab === cat.id
                                ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-sm'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                            }`}
                    >
                        {cat.icon}
                        {cat.label}
                        {cat.id === 'breaking' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-danger)] animate-pulse" />
                        )}
                    </button>
                ))}

                {/* Divider */}
                <div className="w-px h-8 self-center bg-[var(--border-subtle)] flex-shrink-0 mx-1" />

                {/* Economic Calendar tab */}
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all ${activeTab === 'calendar'
                            ? 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/50 shadow-sm'
                            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                        }`}
                >
                    <CalendarDays className="w-3.5 h-3.5" />
                    Upcoming Events
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30 ml-0.5">
                        NEW
                    </span>
                </button>
            </div>

            {/* ── Forex/Macro notice ───────────────────────────────────────────── */}
            {activeTab === 'forex-macro' && (
                <div className="p-3 rounded-2xl bg-[var(--brand-glow)]/30 border border-[var(--brand-primary)]/30 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
                    <BarChart2 className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                    <span>
                        <strong className="text-[var(--text-primary)]">Forex & macro events directly impact crypto markets.</strong>{' '}
                        Fed rate decisions affect BTC and ETH valuations. Dollar strength (DXY) typically moves inversely with crypto.
                    </span>
                </div>
            )}

            {/* ── Calendar tab content ─────────────────────────────────────────── */}
            {isCalendar && <EconomicCalendarFull />}

            {/* ── News tab content ─────────────────────────────────────────────── */}
            {!isCalendar && (
                <>
                    {/* Error state */}
                    {error && !isLoading && (
                        <div className="flex items-center gap-2 p-4 rounded-2xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* News grid */}
                    {isLoading ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-64 rounded-2xl" />
                            ))}
                        </div>
                    ) : articles.length > 0 ? (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {articles.map((article) => (
                                <NewsCard key={article.id} article={article} />
                            ))}
                        </div>
                    ) : null}

                    {/* Attribution */}
                    {!isLoading && articles.length > 0 && (
                        <p className="text-[10px] text-[var(--text-muted)] text-center pt-2">
                            News aggregated from 300+ sources via{' '}
                            <a href="https://cryptocurrency.cv" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">
                                cryptocurrency.cv
                            </a>{' '}
                            · Click any article to read on the original publisher's site ·{' '}
                            Not financial advice — educational information only.
                        </p>
                    )}
                </>
            )}

            {/* ── AI Analysis Modal ────────────────────────────────────────────── */}
            {analysisResult && (
                <MarketAnalysisModal
                    analysis={analysisResult}
                    onClose={() => setAnalysisResult(null)}
                />
            )}
        </div>
    );
}
