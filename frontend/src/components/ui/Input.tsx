import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[var(--text-muted)] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'
            } ${className}`}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 text-[var(--text-muted)]">{rightIcon}</div>}
        </div>
        {error && <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
