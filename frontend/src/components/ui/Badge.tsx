import React from 'react';
import { PredictionDirection, PredictionStatus } from '../../types';

export const DirectionBadge: React.FC<{ direction: PredictionDirection; className?: string }> = ({
  direction,
  className = '',
}) => {
  const isLong = direction === 'LONG';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
        isLong
          ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30'
          : 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/30'
      } ${className}`}
    >
      {isLong ? '▲ LONG' : '▼ SHORT'}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: PredictionStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const styles: Record<PredictionStatus, string> = {
    DRAFT: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)]',
    PUBLISHED: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/30',
    ACTIVE: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info)]/30',
    TARGET_HIT: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30',
    STOP_HIT: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30',
    CLOSED: 'bg-[var(--brand-glow)] text-[var(--brand-soft)] border-[var(--brand-primary)]/30',
    CANCELLED: 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)]',
    EXPIRED: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning)]/30',
  };

  const labels: Record<PredictionStatus, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ACTIVE: 'Active',
    TARGET_HIT: 'Target Hit ✨',
    STOP_HIT: 'Stop Hit',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
    EXPIRED: 'Expired',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
};

export const RiskRewardBadge: React.FC<{ ratio: number; className?: string }> = ({ ratio, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono-num font-semibold bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 ${className}`}
    >
      1:{ratio.toFixed(2)} R:R
    </span>
  );
};
