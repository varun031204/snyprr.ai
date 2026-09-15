import React from 'react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  subtext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive,
  icon,
  subtext,
}) => {
  return (
    <GlassCard className="flex flex-col gap-3 p-4 relative overflow-hidden min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium text-[var(--text-muted)] uppercase leading-tight break-words min-w-0">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-xl bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold font-mono-num text-[var(--text-primary)] tracking-tight">
          {value}
        </div>
        {change && (
          <p className={`text-[11px] font-medium mt-1 leading-snug ${
            isPositive !== undefined
              ? isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'
              : 'text-[var(--text-muted)]'
          }`}>
            {isPositive !== undefined ? (isPositive ? '↑ ' : '↓ ') : ''}{change}
          </p>
        )}
      </div>
    </GlassCard>
  );
};
