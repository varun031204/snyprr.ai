import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-subtle)] ${className}`}
    />
  );
};
