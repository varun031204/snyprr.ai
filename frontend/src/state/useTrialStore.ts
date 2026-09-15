/**
 * useTrialStore
 *
 * Computes trial state from the user's account creation date.
 *
 * Business rules:
 * - Every new user gets a FREE 15-day PRO trial starting from their createdAt date.
 * - Days 11–15: warning period — banner shown urging upgrade.
 * - Day 16+: trial expired — user drops to FREE tier, locked out of AI analysis.
 */

import { create } from 'zustand';

const TRIAL_DURATION_DAYS = 15;
const WARNING_THRESHOLD_DAYS = 5; // Show warning when ≤ 5 days left

export interface TrialState {
    /** Days remaining in trial (0 means expired) */
    trialDaysLeft: number;
    /** True while trial is still active (days > 0) */
    isTrialActive: boolean;
    /** True once trial has ended */
    isTrialExpired: boolean;
    /** True when ≤ WARNING_THRESHOLD_DAYS remain */
    isInWarningPeriod: boolean;
    /** ISO string of when the trial ends */
    trialEndsAt: string | null;
    /** Recompute from a createdAt ISO string */
    compute: (createdAt: string | null | undefined) => void;
}

export const useTrialStore = create<TrialState>((set) => ({
    trialDaysLeft: TRIAL_DURATION_DAYS,
    isTrialActive: true,
    isTrialExpired: false,
    isInWarningPeriod: false,
    trialEndsAt: null,

    compute: (createdAt) => {
        if (!createdAt) {
            // No creation date — treat as expired (safe default)
            set({
                trialDaysLeft: 0,
                isTrialActive: false,
                isTrialExpired: true,
                isInWarningPeriod: false,
                trialEndsAt: null,
            });
            return;
        }

        const created = new Date(createdAt);
        const trialEndsAt = new Date(created);
        trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DURATION_DAYS);

        const now = new Date();
        const msLeft = trialEndsAt.getTime() - now.getTime();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

        set({
            trialDaysLeft: daysLeft,
            isTrialActive: daysLeft > 0,
            isTrialExpired: daysLeft === 0,
            isInWarningPeriod: daysLeft > 0 && daysLeft <= WARNING_THRESHOLD_DAYS,
            trialEndsAt: trialEndsAt.toISOString(),
        });
    },
}));
