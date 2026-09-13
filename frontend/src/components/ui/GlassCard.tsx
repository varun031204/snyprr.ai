import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  elevated = false,
  hoverEffect = true,
  ...props
}) => {
  return (
    <div
      className={`neo-glass-card ${elevated ? 'neo-glass-panel' : ''} ${
        hoverEffect ? 'hover:border-[var(--brand-primary)]' : ''
      } ${props.onClick ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
