import React, { useState } from 'react';
import { Check, Sparkles, ShieldCheck, Zap, Gift, Clock, Rocket, Crown, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSubscriptionPlans } from '../../hooks/useSubscriptionsQuery';
import { useUIStore } from '../../state/useUIStore';
import { useTrialStore } from '../../state/useTrialStore';
import { useAuthStore } from '../../state/useAuthStore';
import { subscriptionsService, FREE_TRIAL_PLAN } from '../../services/api/subscriptionsService';
import type { SubscriptionPlan } from '../../types';

// ── Modal types ───────────────────────────────────────────────────────────────
type ModalMode = 'trial' | 'checkout';

export default function SubscriptionsPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('checkout');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useSubscriptionPlans();
  const { addToast } = useUIStore();
  const { isTrialActive, isTrialExpired, trialDaysLeft, trialEndsAt } = useTrialStore();
  const { currentUser } = useAuthStore();

  const isPaidSubscriber =
    currentUser?.subscriptionTier === 'PRO' || currentUser?.subscriptionTier === 'VIP';

  const plans = data?.data ?? [];

  // ── Open trial modal ────────────────────────────────────────────────────────
  const handleStartTrial = () => {
    setSelectedPlan(FREE_TRIAL_PLAN);
    setModalMode('trial');
    setIsModalOpen(true);
  };

  // ── Open checkout modal for paid plans ──────────────────────────────────────
  const handleAvailNow = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setModalMode('checkout');
    setIsModalOpen(true);
  };

  // ── Activate trial ──────────────────────────────────────────────────────────
  const handleConfirmTrial = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await subscriptionsService.activateTrial();
      addToast({
        type: 'success',
        title: '14-Day Free Trial Active 🎉',
        message: 'You now have full PRO access for 14 days — no card required.',
      });
      setIsModalOpen(false);
    } catch {
      addToast({ type: 'danger', title: 'Activation Failed', message: 'Could not activate trial. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Initiate paid checkout ──────────────────────────────────────────────────
  const handleConfirmCheckout = async () => {
    if (isSubmitting || !selectedPlan) return;
    setIsSubmitting(true);
    try {
      const result = await subscriptionsService.subscribeToPlan(selectedPlan.id);
      if (result.success) {
        addToast({ type: 'success', title: 'Subscription Started!', message: `Welcome to ${selectedPlan.name}!` });
        setIsModalOpen(false);
      } else {
        // Payment gateway not yet live — inform the user clearly
        addToast({
          type: 'warning',
          title: 'Payment Gateway Coming Soon',
          message: 'Online payment is being set up. Please contact support to subscribe manually.',
        });
        setIsModalOpen(false);
      }
    } catch {
      addToast({ type: 'danger', title: 'Checkout Failed', message: 'Could not process payment. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const price = (plan: SubscriptionPlan) =>
    billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ── Trial Status Banners ─────────────────────────────────────────── */}
      {isTrialActive && !isPaidSubscriber && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--brand-glow)] via-[var(--bg-surface)] to-[var(--brand-glow)] border border-[var(--brand-primary)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                14-Day Free Trial Active
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                  {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Full PRO access until{' '}
                {trialEndsAt
                  ? new Date(trialEndsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
                  : '—'}.
                Upgrade before it ends to keep access.
              </p>
            </div>
          </div>
        </div>
      )}

      {isTrialExpired && !isPaidSubscriber && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--color-danger)]/10 via-[var(--bg-surface)] to-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 flex items-center gap-3.5 shadow-xl">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--color-danger)]">Your free trial has ended</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Subscribe to a plan below to restore full access to AI analysis, signals, and premium alerts.
            </p>
          </div>
        </div>
      )}

      {!isTrialActive && !isTrialExpired && !isPaidSubscriber && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--brand-glow)] via-[var(--bg-surface)] to-[var(--brand-glow)] border border-[var(--brand-primary)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                14-Day Free Trial Available
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                  ₹0 Today
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Experience full PRO access — predictions, AI analysis, paper trading — free for 14 days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
          PREMIUM ACCESS
        </span>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
          Upgrade Your Prediction Edge
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Unlock subscriber-only predictions, instant alerts, and detailed AI rationales.
        </p>

        {/* Billing cycle toggle */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] mt-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${billingCycle === 'monthly'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${billingCycle === 'yearly'
              ? 'bg-[var(--brand-primary)] text-white shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
          >
            Yearly <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">2 Months Free</span>
          </button>
        </div>
      </div>

      {/* ── Plan Cards ──────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-96 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* ── Card 1: 14-Day Free Trial ─────────────────────────────── */}
          <GlassCard className="relative flex flex-col justify-between p-7 rounded-3xl border-[var(--color-success)]/40">
            <span className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--color-success)] text-white shadow-lg">
              Free
            </span>

            <div className="space-y-5">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Gift className="w-5 h-5 text-[var(--color-success)]" />
                  14-Day Free Trial
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-1">Try the full platform free — no card required</p>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">₹0</span>
                  <span className="text-xs text-[var(--text-muted)]">/ 14 days</span>
                </div>
                <p className="text-[11px] font-semibold text-[var(--color-success)] mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Full PRO access, zero cost, cancel anytime
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Included Features</p>
                {FREE_TRIAL_PLAN.features.map((f) => (
                  <div key={f} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                    <div className="w-4 h-4 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="w-full mt-7 border-[var(--color-success)]/40 text-[var(--color-success)] hover:bg-[var(--color-success-bg)]"
              leftIcon={<Rocket className="w-4 h-4" />}
              onClick={handleStartTrial}
              disabled={isTrialActive || isTrialExpired || isPaidSubscriber}
            >
              {isTrialActive
                ? `Trial Active (${trialDaysLeft}d left)`
                : isTrialExpired
                  ? 'Trial Expired'
                  : isPaidSubscriber
                    ? 'Already Subscribed'
                    : 'Start 14-Day Free Trial'}
            </Button>
          </GlassCard>

          {/* ── Cards 2 & 3: Standard and Premium ────────────────────── */}
          {plans.map((plan) => (
            <GlassCard
              key={plan.id}
              className={`relative flex flex-col justify-between p-7 rounded-3xl transition-all ${plan.isPopular ? 'border-[var(--brand-primary)] shadow-xl shadow-[var(--brand-glow)]' : ''}`}
            >
              {plan.badge && (
                <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--brand-primary)] text-white shadow-lg">
                  {plan.badge}
                </span>
              )}

              <div className="space-y-5">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                    {plan.isPopular ? <Crown className="w-5 h-5 text-[var(--brand-primary)]" /> : <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" />}
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{plan.description}</p>
                </div>

                <div>
                  {billingCycle === 'monthly' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">
                        ₹{price(plan).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">/ month</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">
                          ₹{plan.priceYearly.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">/ year</span>
                      </div>
                      <p className="text-sm text-[var(--color-success)] font-semibold mt-1.5 flex items-center gap-1.5">
                        ₹{Math.round(plan.priceYearly / 12).toLocaleString('en-IN')}/month
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                          10% OFF
                        </span>
                      </p>
                    </>
                  )}
                  <p className="text-[11px] font-semibold text-[var(--brand-primary)] mt-1.5 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Start with 14-Day Free Trial
                  </p>
                </div>

                <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Included Features</p>
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                      <div className="w-4 h-4 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                variant={plan.isPopular ? 'primary' : 'secondary'}
                size="lg"
                className="w-full mt-7"
                leftIcon={<Zap className="w-4 h-4" />}
                onClick={() => handleAvailNow(plan)}
              >
                Avail Now
              </Button>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Modal — Trial Activation ─────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen && modalMode === 'trial'}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title="Start 14-Day Free Trial"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[var(--text-primary)]">14-Day Free Trial</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20">
                ₹0 Today
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Full PRO access for 14 days — no credit card required.</p>

            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Trial Duration:</span>
                <span className="font-semibold text-[var(--text-primary)]">14 Days</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Access Level:</span>
                <span className="font-semibold text-[var(--text-primary)]">Full PRO</span>
              </div>
              <div className="flex justify-between text-[var(--color-success)] font-bold text-sm pt-1 border-t border-[var(--border-subtle)]">
                <span>Due Today:</span>
                <span className="font-mono-num">₹0.00</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
            <span>Zero risk. No payment info required. Full access starts immediately.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleConfirmTrial}
              isLoading={isSubmitting}
              leftIcon={<Rocket className="w-4 h-4" />}
            >
              Start Free Trial
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal — Checkout ─────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen && modalMode === 'checkout'}
        onClose={() => !isSubmitting && setIsModalOpen(false)}
        title={`Avail ${selectedPlan?.name ?? ''}`}
        maxWidth="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedPlan.name}</span>
                {selectedPlan.badge && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20">
                    {selectedPlan.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{selectedPlan.description}</p>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Billing:</span>
                  <span className="font-semibold text-[var(--text-primary)] capitalize">{billingCycle}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Plan Amount:</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    ₹{billingCycle === 'monthly'
                      ? selectedPlan.priceMonthly.toLocaleString('en-IN')
                      : selectedPlan.priceYearly.toLocaleString('en-IN')}
                    /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <div className="flex justify-between text-[var(--text-primary)] font-bold text-sm pt-1 border-t border-[var(--border-subtle)]">
                  <span>Due Today:</span>
                  <span className="font-mono-num">
                    ₹{billingCycle === 'monthly'
                      ? selectedPlan.priceMonthly.toLocaleString('en-IN')
                      : selectedPlan.priceYearly.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment gateway notice */}
            <div className="p-3 rounded-xl border border-[var(--color-warning)]/40 bg-[var(--color-warning-bg)] text-xs text-[var(--color-warning)] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Online payment gateway is being configured. To subscribe now, contact us at{' '}
                <strong>support@snyprr.ai</strong> with your preferred plan and we'll activate it immediately.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleConfirmCheckout}
                isLoading={isSubmitting}
                leftIcon={<Zap className="w-4 h-4" />}
              >
                Proceed to Payment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
