import React from 'react';
import { Crown, Zap, Sparkles } from 'lucide-react';

interface SubscriptionTierBadgeProps {
  tier?: 'FREE' | 'PRO' | 'VIP';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SubscriptionTierBadge: React.FC<SubscriptionTierBadgeProps> = ({
  tier = 'PRO',
  size = 'md',
  className = '',
}) => {
  if (tier === 'VIP') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[9px]'
            : size === 'lg'
            ? 'px-3.5 py-1 text-xs shadow-md'
            : 'px-2.5 py-0.5 text-[10px]'
        } ${className}`}
      >
        <Crown className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        VIP Tier
      </span>
    );
  }

  if (tier === 'PRO') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-extrabold uppercase tracking-wider rounded-full bg-gradient-to-r from-[var(--brand-primary)]/20 to-[var(--brand-vivid)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/40 shadow-sm ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[9px]'
            : size === 'lg'
            ? 'px-3.5 py-1 text-xs shadow-md'
            : 'px-2.5 py-0.5 text-[10px]'
        } ${className}`}
      >
        <Zap className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
        PRO Tier
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-subtle)] ${
        size === 'sm'
          ? 'px-2 py-0.5 text-[9px]'
          : size === 'lg'
          ? 'px-3.5 py-1 text-xs'
          : 'px-2.5 py-0.5 text-[10px]'
      } ${className}`}
    >
      <Sparkles className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      Free Plan
    </span>
  );
};
