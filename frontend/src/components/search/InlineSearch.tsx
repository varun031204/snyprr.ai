import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, ArrowRight, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { signalsService } from '../../services/api/signalsService';
import { useDebounce } from '../../hooks/useDebounce';

export const InlineSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut cmd+k
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const q = debouncedQuery.toLowerCase().trim();

  const { data, isFetching } = useQuery({
    queryKey: ['inline-search-predictions', q],
    queryFn: () => signalsService.getPredictions({ search: q, pageSize: 6, status: 'PUBLISHED' }),
    enabled: q.length >= 2 && isFocused,
    staleTime: 1000 * 60,
  });

  const matchedPredictions = q.length >= 2 ? (data?.data ?? []) : [];
  const showDropdown = isFocused && q.length >= 2;

  const handleSelect = (path: string) => {
    navigate(path);
    setIsFocused(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="relative hidden md:block w-full max-w-[240px] lg:max-w-[320px]" ref={wrapperRef}>
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-surface)] border transition-all w-full ${isFocused ? 'border-[var(--brand-primary)] shadow-sm' : 'border-[var(--border-subtle)]'}`}>
        {isFetching
          ? <Loader2 className="w-4 h-4 text-[var(--brand-primary)] animate-spin" />
          : <Search className="w-4 h-4 text-[var(--text-muted)]" />
        }
        <input
          ref={inputRef}
          type="text"
          placeholder="Search predictions, setups..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
          <div className="p-2 space-y-3">
            {matchedPredictions.length > 0 ? (
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 px-2 mt-1">
                  Predictions ({matchedPredictions.length})
                </p>
                <div className="space-y-0.5">
                  {matchedPredictions.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelect(`/predictions/${p.id}`)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-[var(--bg-secondary)] text-left transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{p.title}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{p.instrument} · {p.timeframe}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              !isFetching && (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                  No predictions found for "{query}"
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
