import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { type Prediction, type PredictionOutcome } from '../../../types';
import { useClosePrediction } from '../../../hooks/usePredictionsQuery';
import { useUIStore } from '../../../state/useUIStore';

interface ClosePredictionModalProps {
  prediction: Prediction | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ClosePredictionModal: React.FC<ClosePredictionModalProps> = ({
  prediction,
  isOpen,
  onClose,
}) => {
  const [outcomeStatus, setOutcomeStatus] = useState<PredictionOutcome['status']>('TARGET_HIT');
  const targetPrice = prediction ? (prediction.sellingZone ?? prediction.takeProfit ?? prediction.entryPrice) : 0;
  const stopPrice = prediction ? (prediction.buyingZone ?? prediction.stopLoss ?? prediction.entryPrice) : 0;

  const [exitPrice, setExitPrice] = useState<string>(() =>
    prediction
      ? (outcomeStatus === 'TARGET_HIT'
        ? targetPrice.toString()
        : outcomeStatus === 'STOP_HIT'
        ? stopPrice.toString()
        : prediction.entryPrice.toString())
      : ''
  );
  const [returnPercentage, setReturnPercentage] = useState<string>('12.5');
  const [summaryNotes, setSummaryNotes] = useState<string>('');

  const closeMutation = useClosePrediction();
  const { addToast } = useUIStore();

  if (!prediction) return null;

  const handleStatusChange = (status: PredictionOutcome['status']) => {
    setOutcomeStatus(status);
    if (status === 'TARGET_HIT') {
      setExitPrice(targetPrice.toString());
      // Calculate return %
      const diff = Math.abs(targetPrice - prediction.entryPrice);
      const pct = (diff / (prediction.entryPrice || 1)) * 100;
      setReturnPercentage(pct.toFixed(2));
    } else if (status === 'STOP_HIT') {
      setExitPrice(stopPrice.toString());
      const diff = Math.abs(prediction.entryPrice - stopPrice);
      const pct = -(diff / (prediction.entryPrice || 1)) * 100;
      setReturnPercentage(pct.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numExit = parseFloat(exitPrice) || prediction.entryPrice;
    const numReturn = parseFloat(returnPercentage) || 0;

    const outcome: PredictionOutcome = {
      status: outcomeStatus,
      exitPrice: numExit,
      closedAt: new Date().toISOString(),
      returnPercentage: numReturn,
      summaryNotes: summaryNotes || undefined,
    };

    try {
      await closeMutation.mutateAsync({ id: prediction.id, outcome });
      
      if (outcomeStatus === 'TARGET_HIT') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#41d49a', '#b17cfe', '#60a5fa', '#ffd700'],
        });
      }

      addToast({
        type: 'success',
        title: 'Prediction Resolved',
        message: `Prediction marked as ${outcomeStatus.replace('_', ' ')} (${numReturn >= 0 ? '+' : ''}${numReturn}%)`,
      });
      onClose();
    } catch {
      addToast({
        type: 'danger',
        title: 'Update Failed',
        message: 'Could not resolve prediction status. Please try again.',
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Declare Prediction Outcome" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-1">{prediction.instrument} · {prediction.direction}</p>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{prediction.title}</h4>
        </div>

        <Select
          label="Outcome Result"
          value={outcomeStatus}
          onChange={(e) => handleStatusChange(e.target.value as any)}
          options={[
            { value: 'TARGET_HIT', label: '🎯 Target Hit (Take Profit Reached)' },
            { value: 'STOP_HIT', label: '🛑 Stop Loss Hit' },
            { value: 'CLOSED_MANUALLY', label: '🔒 Closed Manually (Early Exit)' },
            { value: 'EXPIRED', label: '⏳ Expired (Timeframe Expired)' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Exit Price"
            type="number"
            step="any"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            required
          />
          <Input
            label="Return Percentage (%)"
            type="number"
            step="any"
            value={returnPercentage}
            onChange={(e) => setReturnPercentage(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-secondary)]">
            Summary / Retrospective Notes
          </label>
          <textarea
            rows={3}
            value={summaryNotes}
            onChange={(e) => setSummaryNotes(e.target.value)}
            placeholder="Key takeaways from this prediction setup..."
            className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={closeMutation.isPending}>
            Confirm Outcome
          </Button>
        </div>
      </form>
    </Modal>
  );
};
