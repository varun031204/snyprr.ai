import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variants = {
    primary:
      'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-vivid)] hover:scale-[1.03] hover:shadow-xl hover:shadow-[var(--brand-glow)] active:scale-[0.98] shadow-lg shadow-[var(--brand-glow)] focus:ring-[var(--brand-primary)]',
    secondary:
      'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-glow)] hover:scale-[1.03] hover:shadow-md active:scale-[0.98] focus:ring-[var(--brand-primary)]',
    outline:
      'bg-transparent text-[var(--brand-primary)] border border-[var(--brand-primary)] hover:bg-[var(--brand-glow)] hover:scale-[1.03] hover:shadow-md hover:shadow-[var(--brand-glow)] active:scale-[0.98] focus:ring-[var(--brand-primary)]',
    danger:
      'bg-[var(--color-danger)] text-white hover:opacity-90 hover:scale-[1.03] hover:shadow-lg hover:shadow-[var(--color-danger)]/30 active:scale-[0.98] focus:ring-[var(--color-danger)]',
    ghost:
      'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:scale-[1.02] active:scale-[0.98]',
  };

  return (
    <button
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
