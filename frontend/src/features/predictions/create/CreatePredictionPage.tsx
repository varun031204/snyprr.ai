import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SimpleChart } from '../../../components/charts/SimpleChart';
import { INSTRUMENTS } from '../../../constants';
import { useCreatePrediction } from '../../../hooks/usePredictionsQuery';
import { useMarketStore } from '../../../state/useMarketStore';
import { useAuthStore } from '../../../state/useAuthStore';
import { useUIStore } from '../../../state/useUIStore';
import { predictionFormSchema } from '../../../schemas';
import { type Prediction, type PredictionDirection, type PredictionVisibility } from '../../../types';

export default function CreatePredictionPage() {
  const navigate = useNavigate();
  const createMutation = useCreatePrediction();
  const { currentUser } = useAuthStore();
  const { candleCache, tickers } = useMarketStore();
  const { addToast } = useUIStore();

  const [instrument, setInstrument] = useState('BTC/USDT');
  const [direction, setDirection] = useState<PredictionDirection>('LONG');
  const [buyingZone, setBuyingZone] = useState<string>('91200');
  const [sellingZone, setSellingZone] = useState<string>('98500');
  const [stopLoss, setStopLoss] = useState<string>('89000');
  const [takeProfit, setTakeProfit] = useState<string>('97500');
  const [timeframe, setTimeframe] = useState('4h');
  const [visibility, setVisibility] = useState<PredictionVisibility>('PUBLIC');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // When instrument changes, update category and default prices
  const handleInstrumentChange = (newSymbol: string) => {
    setInstrument(newSymbol);
    const ticker = tickers.find((t) => t.symbol === newSymbol);
    if (ticker) {
      const price = ticker.price;
      const decimals = ticker.category === 'FOREX' ? 4 : 2;
      if (direction === 'LONG') {
        setBuyingZone((price * 0.97).toFixed(decimals));
        setSellingZone((price * 1.06).toFixed(decimals));
      } else {
        setBuyingZone((price * 0.94).toFixed(decimals));
        setSellingZone((price * 1.03).toFixed(decimals));
      }
    }
  };

  // Switch direction and auto-adjust zones
  const handleDirectionChange = (newDir: PredictionDirection) => {
    setDirection(newDir);
    const base = parsedBuying || 100;
    const ticker = tickers.find((t) => t.symbol === instrument);
    const decimals = ticker?.category === 'FOREX' ? 4 : 2;

    if (newDir === 'LONG') {
      setBuyingZone((base * 0.97).toFixed(decimals));
      setSellingZone((base * 1.06).toFixed(decimals));
    } else {
      setBuyingZone((base * 0.94).toFixed(decimals));
      setSellingZone((base * 1.03).toFixed(decimals));
    }
  };

  // Real-time calculation of Zone Spread & Validation
  const parsedBuying = parseFloat(buyingZone) || 0;
  const parsedSelling = parseFloat(sellingZone) || 0;

  const metrics = useMemo(() => {
    if (parsedBuying <= 0 || parsedSelling <= 0) {
      return { spreadPct: 0, isValid: false, message: 'Enter positive prices for Buying Zone and Selling Zone' };
    }
    if (parsedBuying === parsedSelling) {
      return { spreadPct: 0, isValid: false, message: 'Buying Zone and Selling Zone cannot be the same level' };
    }

    const spreadPct = ((parsedSelling - parsedBuying) / parsedBuying) * 100;
    return {
      spreadPct,
      isValid: true,
      message: `Active Zones Configured · Expected Range: ${spreadPct >= 0 ? '+' : ''}${spreadPct.toFixed(2)}%`,
    };
  }, [parsedBuying, parsedSelling]);

  // Reset all parameters to defaults
  const handleReset = () => {
    const defaultSymbol = 'BTC/USDT';
    setInstrument(defaultSymbol);
    setDirection('LONG');
    const ticker = tickers.find((t) => t.symbol === defaultSymbol);
    const price = ticker ? ticker.price : 92500;
    setBuyingZone((price * 0.97).toFixed(2));
    setSellingZone((price * 1.06).toFixed(2));
    setStopLoss((price * 0.94).toFixed(2));
    setTakeProfit((price * 1.10).toFixed(2));
    setTimeframe('4h');
    setVisibility('PUBLIC');
    setErrors({});
    addToast({ type: 'info', title: 'Form Reset', message: 'Parameters restored to defaults.' });
  };

  const handleSave = async (status: 'DRAFT' | 'PUBLISHED') => {
    setErrors({});
    const selectedInst = INSTRUMENTS.find((i) => i.symbol === instrument);
    const category = selectedInst?.category || 'CRYPTO';
    const autoTitle = `${instrument} ${direction} (${timeframe})`;

    const parsedStopLoss = parseFloat(stopLoss) || 0;
    const parsedTakeProfit = parseFloat(takeProfit) || 0;

    const formData = {
      title: autoTitle,
      instrument,
      category,
      direction,
      entryPrice: parsedBuying,
      buyingZone: parsedBuying,
      sellingZone: parsedSelling,
      stopLoss: parsedStopLoss || undefined,
      takeProfit: parsedTakeProfit || undefined,
      timeframe,
      strategy: 'Key Price Zones',
      analysis: `Forecast for ${instrument} (${timeframe}).\n- Buying Zone: ${parsedBuying.toLocaleString()}\n- Selling Zone: ${parsedSelling.toLocaleString()}${parsedStopLoss ? `\n- Stop Loss: ${parsedStopLoss.toLocaleString()}` : ''}${parsedTakeProfit ? `\n- Take Profit: ${parsedTakeProfit.toLocaleString()}` : ''}`,
      visibility,
      tags: [instrument.split('/')[0], direction, timeframe],
    };

    // Validate with Zod
    const validation = predictionFormSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const path = issue.path[0] as string;
        if (path) fieldErrors[path] = issue.message;
      });
      setErrors(fieldErrors);
      addToast({
        type: 'danger',
        title: 'Validation Error',
        message: 'Please resolve the highlighted fields before saving.',
      });
      return;
    }

    if (!currentUser?.id) {
      addToast({ type: 'danger', title: 'Auth Error', message: 'You must be signed in to create a prediction.' });
      return;
    }

    try {
      const newPrediction: Partial<Prediction> = {
        ...formData,
        status,
        traderId: currentUser.id,
        trader: {
          id: currentUser.id,
          displayName: 'snyprr.ai Desk',
          handle: '@snyprr',
          avatar: '/snyprr-logo.png',
          verifiedBadge: true,
          winRate: 78.5,
        },
      };

      const result = await createMutation.mutateAsync(newPrediction);
      addToast({
        type: 'success',
        title: status === 'PUBLISHED' ? 'Prediction Published!' : 'Draft Saved',
        message: status === 'PUBLISHED' ? 'Your prediction is now live for subscribers.' : 'Draft saved to your workspace.',
      });
      navigate(`/predictions/${result.data.id}`);
    } catch {
      addToast({
        type: 'danger',
        title: 'Save Failed',
        message: 'Failed to create prediction. Please try again.',
      });
    }
  };

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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Prediction</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Publish a high-conviction forecast with explicit buying and selling levels.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Form (2/3) + Visual Context Overlay & Summary (1/3) */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-2 space-y-5">
          <GlassCard hoverEffect={false} className="space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Setup & Market Parameters
              </h3>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">
                Zone Configuration
              </span>
            </div>

            {/* Instrument, Direction, Audience Visibility */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Instrument
                </label>
                <select
                  value={instrument}
                  onChange={(e) => handleInstrumentChange(e.target.value)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] cursor-pointer font-medium"
                >
                  {INSTRUMENTS.map((inst) => (
                    <option key={inst.symbol} value={inst.symbol}>
                      {inst.symbol} ({inst.name})
                    </option>
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
                    onClick={() => handleDirectionChange('LONG')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      direction === 'LONG'
                        ? 'bg-[var(--color-success)] text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('SHORT')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      direction === 'SHORT'
                        ? 'bg-[var(--color-danger)] text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5" /> SHORT
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                  Audience Visibility
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as any)}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] cursor-pointer font-medium"
                >
                  <option value="PUBLIC">🌐 Public (All Users)</option>
                  <option value="SUBSCRIBERS_ONLY">⭐ Subscribers Only</option>
                  <option value="EXCLUSIVE">💎 Exclusive VIP Tier</option>
                </select>
              </div>
            </div>

            {/* Price Zones: Buying Zone & Selling Zone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_var(--color-success)]"></span>
                    Buying Zone
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">Demand / Entry Area</span>
                </div>
                <Input
                  type="number"
                  step="any"
                  value={buyingZone}
                  onChange={(e) => setBuyingZone(e.target.value)}
                  error={errors?.buyingZone}
                  placeholder="e.g. 91200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--color-danger)] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] shadow-[0_0_8px_var(--color-danger)]"></span>
                    Selling Zone
                  </label>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">Supply / Exit Target</span>
                </div>
                <Input
                  type="number"
                  step="any"
                  value={sellingZone}
                  onChange={(e) => setSellingZone(e.target.value)}
                  error={errors?.sellingZone}
                  placeholder="e.g. 98500"
                  required
                />
              </div>

              {/* Stop Loss */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-warning)] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-warning)]"></span>
                  Stop Loss
                </label>
                <Input
                  type="number"
                  step="any"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  error={errors?.stopLoss}
                  placeholder="e.g. 89000"
                  required
                />
              </div>

              {/* Take Profit */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--color-success)] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-success)]"></span>
                  Take Profit 1
                </label>
                <Input
                  type="number"
                  step="any"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  error={errors?.takeProfit}
                  placeholder="e.g. 97500"
                  required
                />
              </div>
            </div>

            {/* Validation Banner */}
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-xs ${
                metrics.isValid
                  ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30'
                  : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30'
              }`}
            >
              {metrics.isValid ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="font-medium">{metrics.message}</span>
            </div>

            {/* Action Buttons in the same box */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[var(--border-subtle)] gap-3">
              <Button
                type="button"
                variant="outline"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                onClick={handleReset}
                className="w-full sm:w-auto"
              >
                Reset
              </Button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleSave('DRAFT')}
                  isLoading={createMutation.isPending}
                >
                  Save as Draft
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => handleSave('PUBLISHED')}
                  isLoading={createMutation.isPending}
                >
                  Publish Prediction
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar Context & Live Preview */}
        <div className="space-y-5">
          {/* Live Chart Preview */}
          <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-[var(--text-primary)]">Live Level Overlay</h3>
                <p className="text-[10px] text-[var(--text-muted)]">{instrument} · Visual Context</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] font-semibold">
                PREVIEW
              </span>
            </div>

            <div className="h-56">
              <SimpleChart
                candles={currentCandles}
                buyingZone={parsedBuying}
                sellingZone={parsedSelling}
                direction={direction}
              />
            </div>
          </GlassCard>

          {/* Metric Summary Card */}
          <GlassCard hoverEffect={false} className="space-y-3">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Price Zone Summary
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Buying Zone:</span>
                <span className="font-bold font-mono-num text-[var(--color-success)]">
                  {parsedBuying > 0 ? parsedBuying.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Selling Zone:</span>
                <span className="font-bold font-mono-num text-[var(--color-danger)]">
                  {parsedSelling > 0 ? parsedSelling.toLocaleString() : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">Zone Spread:</span>
                <span className="font-bold font-mono-num text-[var(--brand-primary)]">
                  {metrics.isValid ? `${metrics.spreadPct >= 0 ? '+' : ''}${metrics.spreadPct.toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Visibility Tier:</span>
                <span className="font-medium text-[var(--text-primary)]">{visibility}</span>
              </div>
            </div>
          </GlassCard>

          {/* Guidelines info card */}
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-2">
            <p className="font-semibold text-[var(--text-primary)]">💡 snyprr.ai Prediction Guidelines</p>
            <p>
              • Predictions declare buying zone and selling zone levels for technical analysis.
            </p>
            <p>
              • Respective green and red level lines are projected onto the price chart in real-time.
            </p>
            <p>
              • No direct order executions or exchange transactions are placed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
