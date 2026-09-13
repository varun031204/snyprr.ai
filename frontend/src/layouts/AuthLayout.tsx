import React from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Logo } from '../components/ui/Logo';

export const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[var(--brand-primary)]/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] rounded-full bg-[var(--brand-vivid)]/6 blur-[100px] pointer-events-none" />

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-[var(--border-subtle)]">
        <Link to="/" className="flex items-center">
          <Logo className="h-10 w-auto object-contain" />
        </Link>
        <ThemeToggle />
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

      <footer className="text-center py-4 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        © {new Date().getFullYear()} Snyprr.ai · Predictions only. Not financial advice.
      </footer>
    </div>
  );
};
