import React, { useState } from 'react';
import { Check, Sparkles, ShieldCheck, Zap, Gift, Clock } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSubscriptionPlans, useSubscribeToPlan } from '../../hooks/useSubscriptionsQuery';
import { useUIStore } from '../../state/useUIStore';
import { useTrialStore } from '../../state/useTrialStore';
import { useAuthStore } from '../../state/useAuthStore';

export default function SubscriptionsPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { data, isLoading } = useSubscriptionPlans();
  const subscribeMutation = useSubscribeToPlan();
  const { addToast } = useUIStore();
  const { isTrialActive, isTrialExpired, trialDaysLeft, trialEndsAt } = useTrialStore();
  const { currentUser } = useAuthStore();

  const isPaidSubscriber =
    currentUser?.subscriptionTier === 'PRO' || currentUser?.subscriptionTier === 'VIP';

  const plans = data?.data || [];

  const handleOpenCheckout = (planId: string) => {
    setSelectedPlanId(planId);
    setIsCheckoutOpen(true);
  };

  const handleConfirmSubscribe = async () => {
    if (!selectedPlanId) return;
    try {
      await subscribeMutation.mutateAsync(selectedPlanId);
      addToast({
        type: 'success',
        title: '14-Day Free Trial Started 🎉',
        message: 'Your 14-day trial is now active with full access to all features.',
      });
      setIsCheckoutOpen(false);
    } catch {
      addToast({
        type: 'danger',
        title: 'Activation Failed',
        message: 'Could not start trial. Please try again.',
      });
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const isFreeTrialSelected = selectedPlan?.priceMonthly === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">

      {/* ── Trial Status Banners ── */}
      {isTrialActive && !isPaidSubscriber && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--brand-glow)] via-[var(--bg-surface)] to-[var(--brand-glow)] border border-[var(--brand-primary)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-md">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                Free Trial Active
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                  {trialDaysLeft} {trialDaysLeft === 1 ? 'day' : 'days'} left
                </span>
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Full access until{' '}
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
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--color-danger)]/10 via-[var(--bg-surface)] to-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-danger)]/20 text-[var(--color-danger)] flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--color-danger)]">Your free trial has ended</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Subscribe to a plan below to restore full access to AI analysis, signals, and premium features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs font-medium text-[var(--brand-primary)] uppercase tracking-widest">Plans &amp; Pricing</p>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Simple, Transparent Pricing</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Choose the plan that works for you. Start with a 14-day free trial, full access, no credit card required.
        </p>

        {/* Billing Toggle */}
        <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-lg mt-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
              billingCycle === 'monthly'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md scale-105'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white shadow-lg shadow-[var(--brand-glow)] scale-105'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]/50'
            }`}
          >
            Yearly
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
              billingCycle === 'yearly' ? 'bg-white/20' : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'
            }`}>
              Save up to 11%
            </span>
          </button>
        </div>
      </div>

      {/* ── Plan Cards ── */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {plans.map((plan) => {
            const isFree = plan.priceMonthly === 0;
            const yearlyActualDiscount = isFree
              ? 0
              : Math.round(((plan.priceMonthly * 12 - plan.priceYearly) / (plan.priceMonthly * 12)) * 100);

            return (
              <GlassCard
                key={plan.id}
                className={`relative flex flex-col p-8 rounded-3xl transition-all h-full ${
                  plan.isPopular
                    ? 'border-2 border-[var(--brand-primary)] shadow-2xl shadow-[var(--brand-glow)]'
                    : 'border border-[var(--border-subtle)]'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] text-white shadow-lg animate-pulse">
                    {plan.badge}
                  </span>
                )}

                {/* Card body — grows to fill space */}
                <div className="flex flex-col flex-1 space-y-6">

                  {/* Header — fixed height for description to keep price block aligned */}
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed h-10 line-clamp-2">{plan.description}</p>
                  </div>

                  {/* Price — fixed-height block so all cards align */}
                  <div className="h-[112px] flex flex-col justify-start">
                    {isFree ? (
                      /* Free trial always ₹0 / 14 days regardless of billing toggle */
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">₹0</span>
                          <span className="text-sm text-[var(--text-muted)]">for 14 days</span>
                        </div>
                        <p className="text-[11px] font-semibold text-[var(--color-success)] mt-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> No credit card required
                        </p>
                      </>
                    ) : billingCycle === 'monthly' ? (
                      /* Monthly: per-month price */
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">
                            ₹{plan.priceMonthly.toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">/ month</span>
                        </div>
                        <p className="text-[11px] font-semibold text-[var(--color-success)] mt-3 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> 14-Day Free Trial (₹0 due today)
                        </p>
                      </>
                    ) : (
                      /* Yearly: annual total + discount only — no monthly equivalent */
                      <>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">
                            ₹{plan.priceYearly.toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm text-[var(--text-muted)]">/ year</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                            <Check className="w-3 h-3" /> Save {yearlyActualDiscount}% annually
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1.5">Billed annually</p>
                      </>
                    )}
                  </div>

                  {/* Features — flex-1 pushes button to bottom */}
                  <div className="flex-1 space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      What's Included
                    </p>
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                        <div className="w-4 h-4 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="leading-relaxed">{f}</span>
                      </div>
                    ))}
                  </div>

                </div>{/* end card body */}

                {/* CTA Button — always at bottom */}
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-8 flex-shrink-0"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => handleOpenCheckout(plan.id)}
                >
                  {isFree ? 'Start Free Trial' : 'Buy Now'}
                </Button>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* ── Checkout Modal ── */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title={isFreeTrialSelected ? 'Start 14-Day Free Trial' : `Subscribe to ${selectedPlan?.name ?? ''}`}
        maxWidth="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedPlan.name}</span>
                {isFreeTrialSelected && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)]">
                    14 Days Free
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)]">{selectedPlan.description}</p>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs">
                {isFreeTrialSelected ? (
                  <>
                    <div className="flex justify-between text-[var(--color-success)] font-semibold">
                      <span>14-Day Free Trial:</span>
                      <span>₹0.00</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-primary)] font-bold text-sm pt-1 border-t border-[var(--border-subtle)]">
                      <span>Due Today:</span>
                      <span className="font-mono-num text-[var(--color-success)]">₹0.00</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Plan:</span>
                      <span>{selectedPlan.name}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Billing:</span>
                      <span className="capitalize">{billingCycle}</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-primary)] font-bold text-sm pt-1 border-t border-[var(--border-subtle)]">
                      <span>Amount:</span>
                      <span className="font-mono-num">
                        ₹{billingCycle === 'monthly'
                          ? selectedPlan.priceMonthly.toLocaleString('en-IN')
                          : selectedPlan.priceYearly.toLocaleString('en-IN')}
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
              {isFreeTrialSelected
                ? 'Zero risk. Instant activation. No charges during your 14-day trial period.'
                : 'Your subscription will be activated immediately after confirmation.'}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmSubscribe}
                isLoading={subscribeMutation.isPending}
                leftIcon={<Zap className="w-4 h-4" />}
              >
                {isFreeTrialSelected ? 'Activate 14-Day Free Trial' : 'Confirm & Subscribe'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
