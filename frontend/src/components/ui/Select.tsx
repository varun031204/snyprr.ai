import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium text-[var(--text-secondary)] tracking-wide">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
            error ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-[var(--color-danger)] mt-0.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
