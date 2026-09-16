import React from 'react';
import { BotMessageSquare, X } from 'lucide-react';
import { useUIStore } from '../../state/useUIStore';

export const AIFloatingButton: React.FC = () => {
  const { aiDrawerOpen, toggleAIDrawer } = useUIStore();

  return (
    <button
      onClick={toggleAIDrawer}
      aria-label={aiDrawerOpen ? 'Close snyprr AI' : 'Open snyprr AI Assistant'}
      title={aiDrawerOpen ? 'Close snyprr AI' : 'Open snyprr AI Assistant'}
      className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 group cursor-pointer
        ${aiDrawerOpen
          ? 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] scale-95'
          : 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white hover:scale-110 hover:shadow-[0_0_28px_var(--brand-primary)/60]'
        }`}
      style={{ bottom: aiDrawerOpen ? '548px' : '1.5rem' }}
    >
      {/* Pulse ring when closed */}
      {!aiDrawerOpen && (
        <span className="absolute inset-0 rounded-full bg-[var(--brand-primary)] opacity-30 animate-ping pointer-events-none" />
      )}

      {aiDrawerOpen
        ? <X className="w-5 h-5 transition-transform" />
        : <BotMessageSquare className="w-6 h-6 transition-transform group-hover:scale-110" />
      }
    </button>
  );
};
