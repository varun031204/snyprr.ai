import { Sun, Moon } from 'lucide-react';
import React from 'react';
import { useUIStore } from '../../state/useUIStore';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { theme, toggleTheme } = useUIStore();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'neo-dark' ? 'light' : 'dark'} mode`}
      className={`w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] transition-all duration-200 cursor-pointer ${className}`}
    >
      {theme === 'neo-dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};
