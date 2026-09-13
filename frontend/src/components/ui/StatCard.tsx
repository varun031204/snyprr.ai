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
    <GlassCard className="flex flex-col justify-between relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)] tracking-wider uppercase">
          {title}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-glow)] text-[var(--brand-primary)] flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold font-mono-num text-[var(--text-primary)] tracking-tight">
          {value}
        </div>
        {change && (
          <div className="flex items-center gap-1 mt-1 text-xs font-medium">
            <span
              className={
                isPositive !== undefined
                  ? isPositive
                    ? 'text-[var(--color-success)]'
                    : 'text-[var(--color-danger)]'
                  : 'text-[var(--text-muted)]'
              }
            >
              {isPositive !== undefined ? (isPositive ? '↑' : '↓') : ''} {change}
            </span>
            {subtext && <span className="text-[var(--text-muted)]">vs last period</span>}
          </div>
        )}
      </div>
    </GlassCard>
  );
};
