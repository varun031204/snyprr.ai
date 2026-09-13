import { CheckCircle, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import React from 'react';
import { type ToastItem, useUIStore } from '../../state/useUIStore';

const icons: Record<ToastItem['type'], React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-[var(--color-success)]" />,
  danger: <XCircle className="w-5 h-5 text-[var(--color-danger)]" />,
  warning: <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />,
  info: <Info className="w-5 h-5 text-[var(--color-info)]" />,
};

const ToastCard: React.FC<{ toast: ToastItem }> = ({ toast }) => {
  const { removeToast } = useUIStore();
  return (
    <div className="flex items-start gap-3 bg-[var(--bg-surface-glass)] backdrop-blur-xl border border-[var(--border-glass)] rounded-xl p-4 shadow-2xl min-w-[280px] max-w-sm animate-slide-up">
      <div className="flex-shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm text-[var(--text-secondary)]">{toast.message}</p>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts } = useUIStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} />
      ))}
    </div>
  );
};
