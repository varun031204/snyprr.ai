import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lock } from 'lucide-react';
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

export default function PrivacyPage() {
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
                        <Lock className="w-6 h-6 text-[var(--brand-primary)]" />
                        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">Last updated: {LAST_UPDATED}</p>
                    <p className="text-sm text-[var(--text-muted)] max-w-2xl mx-auto">
                        This Privacy Policy explains how Snyprr.ai collects, uses, and protects your personal information
                        when you use our platform. We are committed to protecting your privacy and handling your data responsibly.
                    </p>
                </div>

                <Section title="1. Information We Collect">
                    <p><strong className="text-[var(--text-primary)]">Account Information:</strong> When you register, we collect your full name, email address, and password (stored securely as a hash — never in plaintext).</p>
                    <p><strong className="text-[var(--text-primary)]">Usage Data:</strong> We collect information about how you use the platform, including pages visited, features used, signals viewed, and time spent on the platform.</p>
                    <p><strong className="text-[var(--text-primary)]">Payment Information:</strong> We do not store your full card details. Payment processing is handled by secure third-party providers (Razorpay/Stripe). We only store transaction IDs and subscription status.</p>
                    <p><strong className="text-[var(--text-primary)]">Device & Technical Data:</strong> IP address, browser type, device type, and operating system — used for security, fraud prevention, and improving the platform.</p>
                </Section>

                <Section title="2. How We Use Your Information">
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>To provide, maintain, and improve the Snyprr.ai platform.</li>
                        <li>To verify your identity and secure your account.</li>
                        <li>To process subscription payments and manage your account.</li>
                        <li>To send service-related communications (OTP verification, subscription receipts, important updates).</li>
                        <li>To detect and prevent fraud, abuse, and security incidents.</li>
                        <li>To comply with legal obligations.</li>
                    </ul>
                    <p>We do <strong className="text-[var(--text-primary)]">not</strong> send marketing emails without your explicit consent, and we do <strong className="text-[var(--text-primary)]">not</strong> sell your personal data to third parties.</p>
                </Section>

                <Section title="3. One Account Per Device Policy">
                    <p>
                        Snyprr.ai enforces a <strong className="text-[var(--text-primary)]">one active session per account</strong> policy.
                        When you sign in on a new device, all other active sessions are automatically terminated.
                        This is a security measure to protect your account from unauthorised access.
                    </p>
                    <p>
                        Account sharing is strictly prohibited. Each subscription is for a single user only.
                        We monitor for simultaneous logins from different devices and may suspend accounts that violate this policy.
                    </p>
                </Section>

                <Section title="4. Data Storage & Security">
                    <p>Your data is stored securely on Supabase-hosted PostgreSQL infrastructure with the following protections:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Row-Level Security (RLS) — you can only access your own data.</li>
                        <li>All passwords hashed using bcrypt.</li>
                        <li>All data transmitted over TLS/HTTPS.</li>
                        <li>OTP codes stored as secure hashes and expire within 15 minutes.</li>
                        <li>No sensitive credentials (API keys, payment details) ever stored in frontend code.</li>
                    </ul>
                </Section>

                <Section title="5. Cookies & Tracking">
                    <p>
                        Snyprr.ai uses minimal, essential cookies only — for session management and authentication.
                        We do not use third-party advertising trackers or analytics services that share your data externally.
                    </p>
                    <p>You can clear cookies at any time through your browser settings. This will log you out of the platform.</p>
                </Section>

                <Section title="6. Third-Party Services">
                    <p>We use the following trusted third-party services to operate Snyprr.ai:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong className="text-[var(--text-primary)]">Supabase</strong> — Authentication and database infrastructure.</li>
                        <li><strong className="text-[var(--text-primary)]">Render</strong> — Backend API hosting.</li>
                        <li><strong className="text-[var(--text-primary)]">Vercel</strong> — Frontend hosting.</li>
                        <li><strong className="text-[var(--text-primary)]">Binance API</strong> — Live market price data (no user data shared).</li>
                        <li><strong className="text-[var(--text-primary)]">Google Gemini AI</strong> — AI analysis generation (signal data only, no personal data).</li>
                    </ul>
                    <p>Each service operates under its own privacy policy. We only share the minimum data necessary for each service to function.</p>
                </Section>

                <Section title="7. Your Rights">
                    <p>You have the right to:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li><strong className="text-[var(--text-primary)]">Access</strong> — Request a copy of the personal data we hold about you.</li>
                        <li><strong className="text-[var(--text-primary)]">Correction</strong> — Update inaccurate or incomplete personal data.</li>
                        <li><strong className="text-[var(--text-primary)]">Deletion</strong> — Request deletion of your account and personal data.</li>
                        <li><strong className="text-[var(--text-primary)]">Portability</strong> — Request your data in a structured, machine-readable format.</li>
                        <li><strong className="text-[var(--text-primary)]">Opt-out</strong> — Unsubscribe from any marketing communications.</li>
                    </ul>
                    <p>To exercise any of these rights, contact us at <strong className="text-[var(--brand-primary)]">support@snyprr.ai</strong>. We will respond within 30 days.</p>
                </Section>

                <Section title="8. Data Retention">
                    <p>We retain your personal data for as long as your account is active or as needed to provide you services. If you delete your account:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                        <li>Your profile and personal data are deleted within 30 days.</li>
                        <li>Transaction records may be retained for up to 7 years for legal and financial compliance.</li>
                        <li>Anonymised usage data may be retained indefinitely for platform improvement.</li>
                    </ul>
                </Section>

                <Section title="9. Children's Privacy">
                    <p>
                        Snyprr.ai is not intended for users under the age of 18. We do not knowingly collect personal information from children.
                        If you believe a child has registered on our platform, please contact us immediately at <strong className="text-[var(--brand-primary)]">support@snyprr.ai</strong>.
                    </p>
                </Section>

                <Section title="10. Changes to This Policy">
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant changes via email or a prominent notice on the platform.
                        Continued use of Snyprr.ai after changes are posted constitutes your acceptance of the updated policy.
                    </p>
                </Section>

                <Section title="11. Contact Us">
                    <p>If you have questions about this Privacy Policy or how we handle your data, please contact us:</p>
                    <ul className="list-none space-y-1 pl-2">
                        <li>📧 <strong className="text-[var(--text-primary)]">Email:</strong> support@snyprr.ai</li>
                        <li>🌐 <strong className="text-[var(--text-primary)]">Website:</strong> snyprr.ai</li>
                    </ul>
                </Section>

                {/* Footer links */}
                <div className="flex flex-wrap justify-center gap-4 pt-6 text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
                    <Link to="/terms" className="hover:text-[var(--brand-primary)] transition-colors">Terms & Conditions</Link>
                    <Link to="/refund" className="hover:text-[var(--brand-primary)] transition-colors">Refund Policy</Link>
                    <Link to="/contact-us" className="hover:text-[var(--brand-primary)] transition-colors">Contact Us</Link>
                </div>
            </main>
        </div>
    );
}
