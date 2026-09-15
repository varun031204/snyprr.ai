/**
 * TrialBanner
 *
 * Shown to USER-role accounts:
 * - Warning mode (≤5 days left): amber banner with countdown
 * - Expired mode: red banner urging upgrade
 *
 * Hidden for TRADER / ADMIN roles and for users who have a paid subscription.
 */

import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { useTrialStore } from '../../state/useTrialStore';
import { useAuthStore } from '../../state/useAuthStore';

export function TrialBanner() {
    const navigate = useNavigate();
    const { activeRole, currentUser } = useAuthStore();
    const { isTrialActive, isTrialExpired, isInWarningPeriod, trialDaysLeft } = useTrialStore();
    const [dismissed, setDismissed] = useState(false);

    // Only show for regular users
    if (activeRole !== 'USER') return null;

    // Already on a paid tier — hide
    if (currentUser?.subscriptionTier === 'PRO' || currentUser?.subscriptionTier === 'VIP') return null;

    // Trial still running and not in warning window — hide
    if (isTrialActive && !isInWarningPeriod) return null;

    // User dismissed the warning banner this session
    if (dismissed && !isTrialExpired) return null;

    // Nothing to show
    if (!isInWarningPeriod && !isTrialExpired) return null;

    if (isTrialExpired) {
        return (
            <div className="w-full bg-gradient-to-r from-[var(--color-danger)]/15 via-[var(--color-danger)]/10 to-[var(--color-danger)]/15 border-b border-[var(--color-danger)]/30 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[var(--color-danger)]/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
                    </div>
                    <div>
                        <span className="text-sm font-bold text-[var(--color-danger)]">Your free trial has ended.</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">
                            Upgrade to keep AI analysis, signals, and premium alerts.
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/subscriptions')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--color-danger)] text-white text-xs font-bold hover:opacity-90 transition-all flex-shrink-0 cursor-pointer"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade Now
                </button>
            </div>
        );
    }

    // Warning period
    return (
        <div className="w-full bg-gradient-to-r from-amber-500/10 via-amber-500/8 to-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div>
                    <span className="text-sm font-bold text-amber-400">
                        {trialDaysLeft === 1 ? 'Last day' : `${trialDaysLeft} days`} left on your free trial.
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">
                        Upgrade before it ends to keep full access.
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => navigate('/subscriptions')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Upgrade
                </button>
                <button
                    onClick={() => setDismissed(true)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-all cursor-pointer"
                    aria-label="Dismiss"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}
