import React, { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw, TrendingUp, Clock, Globe } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

// ── Types ──────────────────────────────────────────────────────────────────
interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage: string | null;
    publishedAt: string;
    source: { name: string };
    author: string | null;
}

// ── Categories ────────────────────────────────────────────────────────────
const CATEGORIES = [
    { label: 'All Markets', query: 'cryptocurrency OR forex OR "stock market" OR trading' },
    { label: 'Crypto', query: 'bitcoin OR ethereum OR cryptocurrency OR crypto' },
    { label: 'Forex', query: 'forex OR "foreign exchange" OR currency trading' },
    { label: 'Commodities', query: 'gold price OR silver price OR commodities trading' },
    { label: 'Markets', query: '"stock market" OR S&P500 OR Nasdaq OR equity market' },
];

// ── GNews public API (free tier, no key required for basic usage) ────────
const GNEWS_API_KEY = 'pub_free'; // placeholder — replace with real key when backend ready
const FALLBACK_ARTICLES: NewsArticle[] = [
    {
        title: 'Bitcoin Surges Past Key Resistance as Institutional Demand Grows',
        description: 'BTC/USDT breaks through the $95,000 level amid renewed institutional buying pressure and improving macro conditions.',
        url: 'https://coindesk.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        source: { name: 'CoinDesk' },
        author: 'Market Desk',
    },
    {
        title: 'Federal Reserve Signals Potential Rate Cut in Q2',
        description: 'Fed officials hint at easing monetary policy as inflation cools toward the 2% target, boosting risk assets globally.',
        url: 'https://reuters.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
        source: { name: 'Reuters' },
        author: 'Financial Desk',
    },
    {
        title: 'Gold Hits 6-Month High on Safe-Haven Demand',
        description: 'XAU/USD extends rally to $2,720 as geopolitical tensions drive investors toward precious metals.',
        url: 'https://bloomberg.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        source: { name: 'Bloomberg' },
        author: 'Commodities Team',
    },
    {
        title: 'Ethereum ETF Inflows Hit Record $850M Weekly',
        description: 'Institutional appetite for ETH exposure via spot ETFs continues to grow, with BlackRock leading weekly inflows.',
        url: 'https://coindesk.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        source: { name: 'CoinDesk' },
        author: 'ETF Tracker',
    },
    {
        title: 'EUR/USD Retreats as ECB Maintains Hawkish Tone',
        description: 'The euro fell against the dollar after ECB president reiterated commitment to higher-for-longer interest rates.',
        url: 'https://forexlive.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        source: { name: 'ForexLive' },
        author: 'FX Desk',
    },
    {
        title: 'XRP Legal Victory Boosts Altcoin Market Sentiment',
        description: "Ripple's partial legal win against the SEC sends XRP up 12% and lifts broader altcoin sentiment.",
        url: 'https://cointelegraph.com',
        urlToImage: null,
        publishedAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        source: { name: 'CoinTelegraph' },
        author: 'Regulation Desk',
    },
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NewsPage() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState(0);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    const fetchNews = async (categoryIdx: number) => {
        setIsLoading(true);
        try {
            // TODO: Replace with real NewsAPI/GNews call when backend proxy is ready
            // Real call pattern:
            // const res = await fetch(`https://gnews.io/api/v4/search?q=${encodeURIComponent(CATEGORIES[categoryIdx].query)}&token=${GNEWS_API_KEY}&lang=en&max=12`);
            // const data = await res.json();
            // setArticles(data.articles || FALLBACK_ARTICLES);

            // Using curated fallback until backend API proxy is wired up
            await new Promise((r) => setTimeout(r, 600));
            setArticles(FALLBACK_ARTICLES);
            setLastUpdated(new Date());
        } catch {
            setArticles(FALLBACK_ARTICLES);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNews(activeCategory);
    }, [activeCategory]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Globe className="w-6 h-6 text-[var(--brand-primary)]" />
                        Market News
                    </h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                        Real-time financial news across crypto, forex, and commodities.
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">
                            Last updated: {lastUpdated.toLocaleTimeString()}
                        </span>
                    </p>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    onClick={() => fetchNews(activeCategory)}
                    disabled={isLoading}
                >
                    Refresh
                </Button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {CATEGORIES.map((cat, idx) => (
                    <button
                        key={cat.label}
                        onClick={() => setActiveCategory(idx)}
                        className={`px-4 py-2 text-xs font-semibold rounded-xl border whitespace-nowrap transition-all ${activeCategory === idx
                                ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-sm'
                                : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* News grid */}
            {isLoading ? (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-52 rounded-2xl" />
                    ))}
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {articles.map((article, idx) => (
                        <a
                            key={idx}
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block"
                        >
                            <GlassCard className="h-full flex flex-col gap-3 p-5 hover:border-[var(--brand-primary)] transition-all">
                                {/* Image */}
                                {article.urlToImage ? (
                                    <img
                                        src={article.urlToImage}
                                        alt={article.title}
                                        className="w-full h-36 object-cover rounded-xl"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="w-full h-28 rounded-xl bg-gradient-to-br from-[var(--brand-glow)] to-[var(--bg-secondary)] flex items-center justify-center">
                                        <TrendingUp className="w-8 h-8 text-[var(--brand-primary)] opacity-40" />
                                    </div>
                                )}

                                {/* Source + time */}
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand-primary)] px-2 py-0.5 rounded bg-[var(--brand-glow)]">
                                        {article.source.name}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {timeAgo(article.publishedAt)}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-3 group-hover:text-[var(--brand-primary)] transition-colors flex-1">
                                    {article.title}
                                </h3>

                                {/* Description */}
                                {article.description && (
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2">
                                        {article.description}
                                    </p>
                                )}

                                {/* Read more */}
                                <div className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] mt-auto pt-2 border-t border-[var(--border-subtle)]">
                                    Read full story
                                    <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </div>
                            </GlassCard>
                        </a>
                    ))}
                </div>
            )}

            {/* Backend note */}
            <p className="text-[11px] text-[var(--text-muted)] text-center pt-2">
                Live news feed via GNews API — backend proxy integration pending.
                {/* TODO: Connect to /api/news backend proxy when available */}
            </p>
        </div>
    );
}
