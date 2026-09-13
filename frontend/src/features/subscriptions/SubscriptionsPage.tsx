import React, { useState } from 'react';
import { Crown, Check, Sparkles, ShieldCheck, Zap, Gift, Clock } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useSubscriptionPlans, useSubscribeToPlan } from '../../hooks/useSubscriptionsQuery';
import { useUIStore } from '../../state/useUIStore';

export default function SubscriptionsPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const { data, isLoading } = useSubscriptionPlans();
  const subscribeMutation = useSubscribeToPlan();
  const { addToast } = useUIStore();

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
        title: '30-Day Free Trial Started 🎉',
        message: 'Your 30-day trial is now active with full access to premium predictions and VIP alerts.',
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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 30-Day Free Trial Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-[var(--brand-glow)] via-[var(--bg-surface)] to-[var(--brand-glow)] border border-[var(--brand-primary)]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center flex-shrink-0 shadow-md">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              30-Day Free Trial Available
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30">
                0 Cost Today
              </span>
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Experience all VIP trader predictions, high-conviction rationales, and real-time alerts free for 30 days.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
          PREMIUM ACCESS
        </span>
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">
          Upgrade Your Prediction Edge
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          Unlock subscriber-only and exclusive VIP analyst predictions, instant alerts, and detailed rationales.
        </p>

        {/* Billing cycle toggle */}
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] mt-2">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              billingCycle === 'monthly'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-[var(--brand-primary)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Yearly <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">2 Months Free</span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {plans.map((plan) => {
            const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
            return (
              <GlassCard
                key={plan.id}
                className={`relative flex flex-col justify-between p-8 rounded-3xl transition-all ${
                  plan.isPopular ? 'border-[var(--brand-primary)] shadow-xl shadow-[var(--brand-glow)]' : ''
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 right-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[var(--brand-primary)] text-white shadow-lg">
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{plan.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-1">{plan.description}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-mono-num text-[var(--text-primary)]">
                        ${price}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">/ month</span>
                      {billingCycle === 'yearly' && (
                        <span className="text-[10px] text-[var(--text-muted)] ml-2">
                          (billed ${plan.priceYearly}/yr)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-[var(--color-success)] mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Includes 30-Day Free Trial
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Included Features
                    </p>
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
                  className="w-full mt-8"
                  leftIcon={<Sparkles className="w-4 h-4" />}
                  onClick={() => handleOpenCheckout(plan.id)}
                >
                  Start 30-Day Free Trial
                </Button>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Mock Checkout Modal */}
      <Modal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        title="Start 30-Day Free Trial"
        maxWidth="md"
      >
        {selectedPlan && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--bg-secondary)] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedPlan.name} Tier</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--color-success-bg)] text-[var(--color-success)]">
                  30 Days Free
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{selectedPlan.description}</p>

              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Regular Rate:</span>
                  <span>${billingCycle === 'monthly' ? selectedPlan.priceMonthly : selectedPlan.priceYearly}/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </div>
                <div className="flex justify-between text-[var(--color-success)] font-semibold">
                  <span>30-Day Free Trial Discount:</span>
                  <span>-100%</span>
                </div>
                <div className="flex justify-between text-[var(--text-primary)] font-bold text-sm pt-1 border-t border-[var(--border-subtle)]">
                  <span>Due Today:</span>
                  <span className="font-mono-num text-[var(--color-success)]">$0.00</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
              <span>Zero risk. Instant activation. You will not be billed during your 30-day trial period.</span>
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
                Activate 30-Day Free Trial
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
