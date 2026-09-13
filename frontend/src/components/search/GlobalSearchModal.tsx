import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, ArrowRight, X, Loader2 } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';
import { useQuery } from '@tanstack/react-query';
import { signalsService } from '../../services/api/signalsService';
import { useDebounce } from '../../hooks/useDebounce';

export const GlobalSearchModal: React.FC = () => {
  const { globalSearchOpen, setGlobalSearchOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGlobalSearchOpen(false);
    };
    if (globalSearchOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  const q = debouncedQuery.toLowerCase().trim();

  const { data, isFetching } = useQuery({
    queryKey: ['search-predictions', q],
    queryFn: () => signalsService.getPredictions({ search: q, pageSize: 5, status: 'PUBLISHED' }),
    enabled: q.length >= 2,
    staleTime: 1000 * 60,
  });

  const matchedPredictions = q.length >= 2 ? (data?.data ?? []) : [];

  if (!globalSearchOpen) return null;

  const handleSelect = (path: string) => {
    navigate(path);
    setGlobalSearchOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[var(--bg-surface-glass)] backdrop-blur-2xl border border-[var(--border-glass)] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-[var(--border-subtle)] gap-3">
          {isFetching
            ? <Loader2 className="w-5 h-5 text-[var(--brand-primary)] animate-spin" />
            : <Search className="w-5 h-5 text-[var(--brand-primary)]" />
          }
          <input
            type="text"
            placeholder="Search predictions, instruments, strategies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <button
            onClick={() => setGlobalSearchOpen(false)}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-4">
          {q.length < 2 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] space-y-2">
              <p>Type at least 2 characters to search live predictions.</p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="px-2 py-1 rounded bg-[var(--bg-secondary)] text-[10px]">BTC/USDT</span>
                <span className="px-2 py-1 rounded bg-[var(--bg-secondary)] text-[10px]">Breakout</span>
                <span className="px-2 py-1 rounded bg-[var(--bg-secondary)] text-[10px]">SOL/USDT</span>
              </div>
            </div>
          ) : (
            <>
              {matchedPredictions.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2">
                    Verified Predictions
                  </p>
                  <div className="space-y-1">
                    {matchedPredictions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelect(`/predictions/${p.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-[var(--bg-secondary)] text-left transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.title}</p>
                            <p className="text-[10px] text-[var(--text-muted)]">{p.instrument} · {p.strategy} · {p.timeframe}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isFetching && matchedPredictions.length === 0 && (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No matches found for "{query}".
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
