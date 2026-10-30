/**
 * newsService.ts
 *
 * Fetches real financial news from cryptocurrency.cv — a free, no-key-required
 * aggregator that pulls from 300+ sources including CoinDesk, CoinTelegraph,
 * Decrypt, Reuters, Bloomberg, ForexLive, and macro news outlets.
 *
 * API base: https://cryptocurrency.cv/api/
 * No authentication required. Rate-limited but generous for normal usage.
 * Response content is paraphrased for compliance; attribution is preserved
 * via source name and original URL in each article.
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  source: string;
  category: NewsCategory;
  timeAgo: string;
  credibility: number; // 0–1
}

export type NewsCategory =
  | 'all'
  | 'crypto'
  | 'bitcoin'
  | 'ethereum'
  | 'forex-macro'
  | 'regulation'
  | 'breaking';

const BASE = 'https://cryptocurrency.cv/api';

// Maps our UI category to the correct endpoint(s)
// Only endpoints confirmed working: news, bitcoin, ethereum, defi
const ENDPOINT_MAP: Record<Exclude<NewsCategory, 'all'>, string[]> = {
  crypto: ['news', 'defi'],
  bitcoin: ['bitcoin'],
  ethereum: ['ethereum'],
  'forex-macro': ['news'],      // general news filtered for macro keywords below
  regulation: ['news'],      // general news filtered for regulation keywords below
  breaking: ['bitcoin', 'ethereum'], // freshest articles from main categories
};

// Keywords used to filter "news" endpoint into macro/regulation sub-feeds
const MACRO_KEYWORDS = ['fed', 'federal reserve', 'ecb', 'interest rate', 'inflation', 'cpi', 'gdp', 'dollar', 'dxy', 'fx', 'forex', 'central bank', 'macro', 'fomc', 'rate cut', 'rate hike', 'treasury', 'yield'];
const REGULATION_KEYWORDS = ['sec', 'cftc', 'regulation', 'regulatory', 'ban', 'legal', 'court', 'law', 'compliance', 'policy', 'government', 'congress', 'senate', 'mifid', 'mica', 'crypto bill'];

// Cache articles per category to avoid hammering the API on quick tab switches
const cache: Map<string, { articles: NewsArticle[]; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

interface RawArticle {
  title?: string;
  link?: string;
  description?: string;
  imageUrl?: string;
  pubDate?: string;
  source?: string;
  category?: string;
  timeAgo?: string;
  credibility?: number;
}

function toNewsArticle(raw: RawArticle, cat: NewsCategory, idx: number): NewsArticle {
  return {
    id: `${cat}-${idx}-${raw.pubDate ?? Date.now()}`,
    title: raw.title ?? 'Untitled',
    description: raw.description ?? '',
    url: raw.link ?? '#',
    imageUrl: raw.imageUrl ?? null,
    publishedAt: raw.pubDate ?? new Date().toISOString(),
    source: raw.source ?? 'Unknown',
    category: cat,
    timeAgo: raw.timeAgo ?? '',
    credibility: raw.credibility ?? 0.5,
  };
}

export async function fetchNewsCategory(
  category: NewsCategory,
  limit = 12,
): Promise<NewsArticle[]> {
  const cacheKey = category;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles;
  }

  try {
    if (category === 'all') {
      // Merge bitcoin + ethereum + defi, deduplicate, sort by newest
      const [btc, eth, defi] = await Promise.all([
        fetchNewsCategory('bitcoin', 8),
        fetchNewsCategory('ethereum', 6),
        fetchNewsCategory('crypto', 6),
      ]);
      const seen = new Set<string>();
      const merged = [...btc, ...eth, ...defi]
        .filter((a) => {
          const key = a.title.slice(0, 60);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
        )
        .slice(0, limit);

      cache.set(cacheKey, { articles: merged, fetchedAt: Date.now() });
      return merged;
    }

    const endpoints = ENDPOINT_MAP[category];
    const fetchLimit = Math.ceil(limit * 2); // over-fetch for filtering categories

    // Fetch all endpoints in parallel, then flatten
    const rawLists = await Promise.all(
      endpoints.map(async (ep) => {
        const res = await fetch(`${BASE}/${ep}?limit=${fetchLimit}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${ep}`);
        const data = await res.json();
        return (data.articles ?? data.data ?? []) as RawArticle[];
      }),
    );

    let rawArticles = rawLists.flat();

    // Apply keyword filtering for macro and regulation categories
    if (category === 'forex-macro') {
      const filtered = rawArticles.filter((a) => {
        const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase();
        return MACRO_KEYWORDS.some((kw) => text.includes(kw));
      });
      // Fall back to unfiltered if too few results
      rawArticles = filtered.length >= 4 ? filtered : rawArticles;
    } else if (category === 'regulation') {
      const filtered = rawArticles.filter((a) => {
        const text = `${a.title ?? ''} ${a.description ?? ''}`.toLowerCase();
        return REGULATION_KEYWORDS.some((kw) => text.includes(kw));
      });
      rawArticles = filtered.length >= 4 ? filtered : rawArticles;
    }

    // Deduplicate and trim
    const seen = new Set<string>();
    const articles = rawArticles
      .filter((a) => {
        const key = (a.title ?? '').slice(0, 60);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit)
      .map((r, i) => toNewsArticle(r, category, i));

    cache.set(cacheKey, { articles, fetchedAt: Date.now() });
    return articles;
  } catch (err) {
    console.warn(`[newsService] fetchNewsCategory(${category}) failed:`, err);
    return cache.get(cacheKey)?.articles ?? [];
  }
}

/** Force-refresh a category by clearing its cache entry first */
export function clearNewsCache(category?: NewsCategory) {
  if (category) {
    cache.delete(category);
  } else {
    cache.clear();
  }
}
