import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, TrendingUp, TrendingDown, Tag, X } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/ui/ErrorState';
import { SimpleChart } from '../../../components/charts/SimpleChart';
import { INSTRUMENTS, TIMEFRAMES, STRATEGIES } from '../../../constants';
import { usePredictionDetail, useUpdatePrediction } from '../../../hooks/usePredictionsQuery';
import { useMarketStore } from '../../../state/useMarketStore';
import { useUIStore } from '../../../state/useUIStore';
import { type PredictionDirection, type PredictionVisibility } from '../../../types';

export default function EditPredictionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePredictionDetail(id || '');
  const updateMutation = useUpdatePrediction();
  const { candleCache } = useMarketStore();
  const { addToast } = useUIStore();

  const prediction = data?.data;

  const [title, setTitle] = useState('');
  const [instrument, setInstrument] = useState('BTC/USDT');
  const [direction, setDirection] = useState<PredictionDirection>('LONG');
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [buyingZone, setBuyingZone] = useState<string>('');
  const [sellingZone, setSellingZone] = useState<string>('');
  const [timeframe, setTimeframe] = useState('4h');
  const [strategy, setStrategy] = useState('Smart Money Concepts (SMC)');
  const [visibility, setVisibility] = useState<PredictionVisibility>('PUBLIC');
  const [analysis, setAnalysis] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (prediction) {
      setTitle(prediction.title);
      setInstrument(prediction.instrument);
      setDirection(prediction.direction);
      setEntryPrice(prediction.entryPrice.toString());
      setBuyingZone(prediction.buyingZone ? prediction.buyingZone.toString() : (prediction.entryPrice * 0.97).toFixed(2));
      setSellingZone(prediction.sellingZone ? prediction.sellingZone.toString() : (prediction.entryPrice * 1.05).toFixed(2));
      setTimeframe(prediction.timeframe);
      setStrategy(prediction.strategy);
      setVisibility(prediction.visibility);
      setAnalysis(prediction.analysis);
      setTags(prediction.tags || []);
    }
  }, [prediction]);

  const parsedEntry = parseFloat(entryPrice) || 0;
  const parsedBuying = parseFloat(buyingZone) || 0;
  const parsedSelling = parseFloat(sellingZone) || 0;

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (t: string) => setTags(tags.filter((tag) => tag !== t));

  const handleSave = async () => {
    if (!id || !prediction) return;
    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          title,
          instrument,
          direction,
          entryPrice: parsedEntry > 0 ? parsedEntry : parsedBuying,
          buyingZone: parsedBuying,
          sellingZone: parsedSelling,
          timeframe,
          strategy,
          visibility,
          analysis,
          tags,
        },
      });

      addToast({
        type: 'success',
        title: 'Prediction Updated',
        message: 'Your modifications have been saved.',
      });
      navigate(`/predictions/${id}`);
    } catch {
      addToast({
        type: 'danger',
        title: 'Update Failed',
        message: 'Could not update prediction. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (isError || !prediction) {
    return <ErrorState message="Prediction not found" onRetry={() => refetch()} />;
  }

  const currentCandles = candleCache[instrument] || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Prediction</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{prediction.instrument} · {prediction.status}</p>
          </div>
        </div>

        <Button
          variant="primary"
          leftIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          isLoading={updateMutation.isPending}
        >
          Save Changes
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <GlassCard hoverEffect={false} className="space-y-4">
            <Input
              label="Prediction Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Instrument
                </label>
                <select
                  value={instrument}
                  onChange={(e) => setInstrument(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>{inst.symbol}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Direction
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setDirection('LONG')}
                    className={`flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      direction === 'LONG'
                        ? 'bg-[var(--color-success)] text-white shadow-md'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('SHORT')}
                    className={`flex items-center justify-center gap-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      direction === 'SHORT'
                        ? 'bg-[var(--color-danger)] text-white shadow-md'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Timeframe
                </label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {TIMEFRAMES.map((tf) => (
                    <option key={tf} value={tf}>{tf}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Input
                label="Buying Zone Level"
                type="number"
                step="any"
                value={buyingZone}
                onChange={(e) => setBuyingZone(e.target.value)}
                placeholder="e.g. 91200"
                required
              />
              <Input
                label="Selling Zone Level"
                type="number"
                step="any"
                value={sellingZone}
                onChange={(e) => setSellingZone(e.target.value)}
                placeholder="e.g. 98500"
                required
              />
            </div>
          </GlassCard>

          <GlassCard hoverEffect={false} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Strategy
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {STRATEGIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Audience Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  <option value="PUBLIC">🌐 Public (All Users)</option>
                  <option value="SUBSCRIBERS_ONLY">⭐ Subscribers Only</option>
                  <option value="EXCLUSIVE">💎 Exclusive VIP Tier</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Detailed Analysis
              </label>
              <textarea
                rows={8}
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] leading-relaxed"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  leftIcon={<Tag className="w-4 h-4" />}
                />
                <Button type="button" variant="secondary" onClick={handleAddTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30"
                  >
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[var(--border-subtle)]">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Price Context</h3>
            </div>
            <div className="h-56">
              <SimpleChart
                candles={currentCandles}
                entryPrice={parsedEntry}
                buyingZone={parsedBuying}
                sellingZone={parsedSelling}
                direction={direction}
              />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
