import React, { useState } from 'react';
import { BookOpen, Plus, Star, Tag, Calendar, Sparkles, Smile, Frown, Meh } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useUIStore } from '../../state/useUIStore';
import { type TraderJournalEntry } from '../../types';
import { usePredictions } from '../../hooks/usePredictionsQuery';

export default function TraderJournalPage() {
  // Journal entries are stored locally — persisted API endpoint is a future feature
  const [entries, setEntries] = useState<TraderJournalEntry[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mindsetRating, setMindsetRating] = useState(5);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Discipline', 'SMC']);
  const [selectedPredId, setSelectedPredId] = useState('');
  const { data: mySignals } = usePredictions({ pageSize: 50 });
  const linkedSignals = mySignals?.data ?? [];

  const { addToast } = useUIStore();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleCreateEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newEntry: TraderJournalEntry = {
      id: `jnl_${Date.now()}`,
      traderId: 'trader_1',
      date: new Date().toISOString().split('T')[0],
      title,
      content,
      linkedPredictionIds: selectedPredId ? [selectedPredId] : [],
      tags,
      mindsetRating,
      createdAt: new Date().toISOString(),
    };

    setEntries([newEntry, ...entries]);
    addToast({
      type: 'success',
      title: 'Journal Entry Recorded',
      message: 'Your mindset and trade execution reflection has been logged.',
    });

    setTitle('');
    setContent('');
    setIsNewModalOpen(false);
  };

  const getMindsetIcon = (rating: number) => {
    if (rating >= 4) return <Smile className="w-5 h-5 text-[var(--color-success)]" />;
    if (rating === 3) return <Meh className="w-5 h-5 text-[var(--color-warning)]" />;
    return <Frown className="w-5 h-5 text-[var(--color-danger)]" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trader Journal & Mindset</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Log your psychology, discipline reflections, and execution rationale across prediction setups.
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          New Reflection
        </Button>
      </div>

      {/* Grid of Journal Entries */}
      <div className="space-y-4">
        {entries.map((entry) => (
          <GlassCard key={entry.id} hoverEffect={false} className="space-y-3 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                {getMindsetIcon(entry.mindsetRating)}
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{entry.title}</h3>
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" /> {entry.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--text-muted)] mr-1">Discipline:</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < entry.mindsetRating
                        ? 'text-[var(--brand-primary)] fill-[var(--brand-primary)]'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {entry.content}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2.5 py-0.5 rounded-lg bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30"
                  >
                    #{t}
                  </span>
                ))}
              </div>

              {entry.linkedPredictionIds.length > 0 && (
                <span className="text-xs text-[var(--text-muted)]">
                  Linked to Prediction: <strong className="text-[var(--text-primary)]">{entry.linkedPredictionIds[0]}</strong>
                </span>
              )}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* New Entry Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Log Psychology & Mindset Reflection"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateEntry} className="space-y-4">
          <Input
            label="Reflection Title"
            placeholder="e.g. Followed plan on BTC breakout without FOMO"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
              Mindset / Discipline Rating (1 to 5)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setMindsetRating(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                    mindsetRating === num
                      ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" /> {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
              Linked Prediction
            </label>
            <select
              value={selectedPredId}
              onChange={(e) => setSelectedPredId(e.target.value)}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            >
              <option value="">None (General Market Reflection)</option>
              {linkedSignals.map((p) => (
                <option key={p.id} value={p.id}>{p.instrument} — {p.title}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Retrospective Thoughts & Lessons
            </label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What went well? Were stop levels respected? Did emotional bias interfere?"
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add reflection tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="text-xs px-2.5 py-0.5 rounded-lg bg-[var(--brand-glow)] text-[var(--brand-primary)]">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
