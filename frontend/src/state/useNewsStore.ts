/**
 * useNewsStore
 *
 * Zustand store for latest news headlines.
 * Shared between the NewsPage and the Dashboard news ticker so both
 * read from the same cached fetch — one network call, two consumers.
 */

import { create } from 'zustand';
import { fetchNewsCategory, type NewsArticle } from '../services/api/newsService';

interface NewsState {
  /** Latest headlines (up to 20, newest first) */
  headlines: NewsArticle[];
  isFetching: boolean;
  lastFetchedAt: number | null;
  /** Fetch or return cached headlines (TTL 3 minutes) */
  fetchHeadlines: () => Promise<void>;
}

const CACHE_TTL_MS = 3 * 60 * 1000;

export const useNewsStore = create<NewsState>((set, get) => ({
  headlines: [],
  isFetching: false,
  lastFetchedAt: null,

  fetchHeadlines: async () => {
    const { isFetching, lastFetchedAt } = get();
    if (isFetching) return;
    if (lastFetchedAt && Date.now() - lastFetchedAt < CACHE_TTL_MS) return;

    set({ isFetching: true });
    try {
      const articles = await fetchNewsCategory('all', 20);
      set({ headlines: articles, lastFetchedAt: Date.now() });
    } catch {
      // keep whatever was there — don't wipe on error
    } finally {
      set({ isFetching: false });
    }
  },
}));

// Start fetching immediately on import so headlines are ready
// before the dashboard or news page mounts
useNewsStore.getState().fetchHeadlines();
// Refresh every 5 minutes
setInterval(() => {
  useNewsStore.setState({ lastFetchedAt: null }); // bust cache
  useNewsStore.getState().fetchHeadlines();
}, 5 * 60 * 1000);
