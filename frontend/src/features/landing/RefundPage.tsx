import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Logo } from '../../components/ui/Logo';

const LAST_UPDATED = 'November 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <GlassCard hoverEffect={false} className="p-6 space-y-3">
            <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
            <div className="text-sm text-[var(--text-muted)] leading-relaxed space-y-2">{children}</div>
        </GlassCard>
    );
}

function HighlightCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

export default function RefundPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <div className="fixed top-[-180px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[var(--brand-primary)]/8 blur-[150px] pointer-events-none" />

            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
                    <Link to="/">
                        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                            <Logo className="h-8 object-contain" />
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-5 sm:px-8 py-16 space-y-6">

                {/* Header */}
                <div className="text-center space-y-3 pb-6 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center justify-center gap-2">
                        <RotateCcw className="w-6 h-6 text-[var(--brand-primary)]" />
                        <h1 className="text-3xl font-extrabold tracking-tight">Refund Policy</h1>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-2xl mx-auto">
                        We want you to feel confident subscribing to Snyprr.ai. Please read our refund policy carefully before purchasing.
                    </p>
                </div>

                {/* Key highlights */}
                <div className="grid sm:grid-cols-3 gap-4">
                    <HighlightCard
                        icon="🎁"
                        title="15-Day Free Trial"
                        desc="Every new account gets a full 15-day free trial. No charge until the trial ends."
                    />
                    <HighlightCard
                        icon="⏰"
                        title="Cancel Anytime"
                        desc="Cancel your subscription at any time before renewal. No lock-in contracts."
                    />
                    <HighlightCard
                        icon="📧"
                        title="Refund Requests"
                        desc="Email support@snyprr.ai within 7 days of a charge to request a refund review."
                    />
                </div>

                <Section title="1. Free Trial">
                    <p>
                        All new Snyprr.ai accounts receive a <strong className="text-[var(--text-primary)]">15-day free trial</strong> with full access to the platform.
                        No payment information is required to start the trial.
                    </p>
                    <p>
                        If you do not wish to continue after the trial, simply do not subscribe. Your account will automatically
                        revert to limited access — you will <strong className="text-[var(--text-primary)]">not be charged automatically</strong>.
                    </p>
                </Section>

                <Section title="2. Subscription Billing">
                    <p>
                        Snyprr.ai subscriptions are billed in advance on a <strong className="text-[var(--text-primary)]">monthly or yearly</strong> cycle, depending on the plan you select.
                        All prices are displayed clearly on the Subscriptions page before you confirm payment.
                    </p>
                    <p>
                        You will receive an email receipt for every successful charge. If you do not receive a receipt within 24 hours of a charge,
                        please contact us immediately.
                    </p>
                </Section>

                <Section title="3. Refund Eligibility">
                    <p>You may be eligible for a full refund if:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>You were charged in error (technical issue, duplicate charge, etc.).</li>
                        <li>You contact us within <strong className="text-[var(--text-primary)]">7 days</strong> of the charge and have not consumed a significant portion of the subscription period.</li>
                        <li>The platform was unavailable for more than 48 consecutive hours during your paid period due to our fault.</li>
                    </ul>
                    <p className="font-semibold text-[var(--text-primary)]">Refunds will not be issued if:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>You simply change your mind after using the platform.</li>
                        <li>The refund request is made more than 7 days after the charge.</li>
                        <li>You violated our Terms & Conditions (account sharing, scraping, etc.).</li>
                        <li>The signals did not result in profitable trades — we are an information platform, not a financial adviser.</li>
                        <li>You purchased an annual plan and more than 30 days of the annual period have elapsed.</li>
                    </ul>
                </Section>

                <Section title="4. How to Request a Refund">
                    <p>To request a refund:</p>
                    <ol className="list-decimal list-inside space-y-2 pl-2">
                        <li>Email <strong className="text-[var(--brand-primary)]">support@snyprr.ai</strong> with the subject line: <em>"Refund Request — [Your Email]"</em></li>
                        <li>Include your registered email address and the approximate date of the charge.</li>
                        <li>Briefly describe the reason for your refund request.</li>
                    </ol>
                    <p>
                        We will review your request and respond within <strong className="text-[var(--text-primary)]">3–5 business days</strong>.
                        Approved refunds are processed back to the original payment method within 5–10 business days, depending on your bank.
                    </p>
                </Section>

                <Section title="5. Cancellation">
                    <p>
                        You can cancel your subscription at any time from <strong className="text-[var(--text-primary)]">Settings → Subscription</strong> in your account dashboard.
                        Cancellation takes effect at the end of your current billing period — you retain full access until that date.
                    </p>
                    <p>
                        Cancellation does not automatically trigger a refund for the current period. If you believe you are entitled to a refund
                        alongside your cancellation, please follow the refund request process above.
                    </p>
                </Section>

                <Section title="6. Annual Plan Refunds">
                    <p>
                        For annual subscriptions, a pro-rata refund may be available if:
                    </p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>You request within 30 days of purchase and have used fewer than 30 days of access.</li>
                        <li>There was a technical error in billing.</li>
                    </ul>
                    <p>
                        After 30 days, annual plans are generally non-refundable. The remaining period will remain active
                        until the annual term ends.
                    </p>
                </Section>

                <Section title="7. Chargebacks">
                    <p>
                        Filing a chargeback with your bank without first contacting us is a violation of our Terms & Conditions
                        and will result in immediate account suspension. We encourage you to reach out to us first —
                        we are committed to resolving legitimate billing issues quickly and fairly.
                    </p>
                </Section>

                <Section title="8. Contact">
                    <p>For any billing or refund questions:</p>
                    <ul className="list-none space-y-1 pl-2">
                        <li>📧 <strong className="text-[var(--text-primary)]">Email:</strong> support@snyprr.ai</li>
                        <li>⏱️ <strong className="text-[var(--text-primary)]">Response time:</strong> Within 3–5 business days</li>
                        <li>🌐 <strong className="text-[var(--text-primary)]">Website:</strong> snyprr.ai</li>
                    </ul>
                </Section>

                {/* Footer links */}
                <div className="flex flex-wrap justify-center gap-4 pt-6 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                    <Link to="/terms" className="hover:text-[var(--brand-primary)] transition-colors">Terms & Conditions</Link>
                    <Link to="/privacy" className="hover:text-[var(--brand-primary)] transition-colors">Privacy Policy</Link>
                    <Link to="/contact-us" className="hover:text-[var(--brand-primary)] transition-colors">Contact Us</Link>
                </div>
            </main>
        </div>
    );
}
