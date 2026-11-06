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
                    <div className="flex items-center gap-2">
                        <Link to="/">
                            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                        </Link>
                    </div>
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
                        This Privacy Policy explains how Snyprr.ai collects, uses, shares, and protects your personal
                        information when you use our platform and services.
                    </p>
                    <p className="text-xs text-[var(--text-muted)] max-w-2xl mx-auto italic">
                        This policy is prepared with reference to the Digital Personal Data Protection Act, 2023 (India)
                        and generally applicable data protection principles.{' '}
                        <strong className="text-[var(--text-primary)]">
                            [LEGAL REVIEW REQUIRED: Sections marked with ⚠️ should be reviewed by a qualified legal
                            professional before publication.]
                        </strong>
                    </p>
                </div>

                {/* Sections */}
                <Section title="1. Who We Are">
                    <p>
                        Snyprr.ai is a market analysis and chart education platform. We publish analyst desk setups,
                        AI-assisted insights, and educational trading content.
                    </p>
                    <p>
                        <strong className="text-[var(--text-primary)]">⚠️ [PLACEHOLDER — Legal Review Required]:</strong>{' '}
                        Company legal name, registered address, and CIN/registration number should be inserted here by
                        your legal team before this policy is published.
                    </p>
                    <p>
                        For privacy-related queries, contact us at:{' '}
                        <a href="mailto:support@snyprr.ai" className="text-[var(--brand-primary)] hover:underline">
                            support@snyprr.ai
                        </a>
                    </p>
                </Section>

                <Section title="2. Information We Collect">
                    <p>We collect the following categories of personal information:</p>

                    <p><strong className="text-[var(--text-primary)]">A. Account & Registration Information</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Full name</li>
                        <li>Email address</li>
                        <li>Phone number (if provided during registration or OTP verification)</li>
                        <li>Username</li>
                        <li>Password (stored in hashed form — never in plain text)</li>
                        <li>Profile avatar (if uploaded)</li>
                    </ul>

                    <p><strong className="text-[var(--text-primary)]">B. Subscription & Transaction Information</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Subscription plan selected (Free Trial, Standard, or Premium)</li>
                        <li>Subscription status and expiry dates</li>
                        <li>Payment transaction records (processed via third-party payment providers)</li>
                        <li>Billing frequency (monthly or annual)</li>
                    </ul>

                    <p><strong className="text-[var(--text-primary)]">C. Usage & Activity Data</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Pages and features accessed within the platform</li>
                        <li>Market analysis and predictions viewed</li>
                        <li>Paper trading activity and simulation history</li>
                        <li>AI Copilot interactions and queries</li>
                        <li>Watchlist and alert configurations</li>
                        <li>Notification preferences</li>
                    </ul>

                    <p><strong className="text-[var(--text-primary)]">D. Technical & Device Information</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>IP address</li>
                        <li>Browser type and version</li>
                        <li>Operating system</li>
                        <li>Device type</li>
                        <li>Session identifiers and authentication tokens</li>
                        <li>Cookies and similar tracking technologies (see Section 9)</li>
                    </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                    <p>We use your personal data for the following purposes:</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Creating and managing your account</li>
                        <li>Verifying your identity during login and OTP authentication</li>
                        <li>Delivering platform features including market analysis, predictions, and AI-powered insights</li>
                        <li>Activating, managing, and renewing your subscription plan</li>
                        <li>Processing payments via third-party payment providers</li>
                        <li>Sending important service-related notifications (trial expiry, subscription renewals, account alerts)</li>
                        <li>Responding to your support requests and inquiries</li>
                        <li>Improving platform functionality based on usage patterns</li>
                        <li>Preventing fraud, abuse, and unauthorised access</li>
                        <li>Complying with applicable legal and regulatory obligations</li>
                    </ul>
                    <p>
                        We do not use your data for targeted advertising or sell your personal information to third parties.
                    </p>
                </Section>

                <Section title="4. Sharing of Information">
                    <p>
                        We do not sell your personal data. We share your information only in the following limited circumstances:
                    </p>

                    <p><strong className="text-[var(--text-primary)]">Service Providers & Data Processors</strong></p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong>Authentication & Database:</strong> Supabase (authentication, database hosting, and
                            secure storage). Your data is processed under Supabase's data processing terms.
                        </li>
                        <li>
                            <strong>AI Services:</strong> Google Gemini API (for AI-powered market analysis features).
                            Queries sent to this service are subject to Google's privacy and data handling terms.
                        </li>
                        <li>
                            <strong>Payment Processing:</strong> Third-party payment gateway providers process your
                            subscription payments. Snyprr.ai does not store full card or bank account details.{' '}
                            <strong className="text-[var(--text-primary)]">⚠️ [Insert payment provider name when confirmed by legal team.]</strong>
                        </li>
                        <li>
                            <strong>Email Services:</strong> Transactional emails (OTP, account notifications) are sent
                            via email infrastructure. Email content is limited to service-related communications.
                        </li>
                        <li>
                            <strong>Hosting & Infrastructure:</strong> Cloud infrastructure providers that host the
                            platform and backend services.
                        </li>
                    </ul>

                    <p><strong className="text-[var(--text-primary)]">Legal Requirements</strong></p>
                    <p>
                        We may disclose your personal information if required to do so by law, court order, or governmental
                        authority, or where we believe disclosure is necessary to protect the rights, safety, or property of
                        Snyprr.ai, its users, or the public.
                    </p>

                    <p><strong className="text-[var(--text-primary)]">Business Transfers</strong></p>
                    <p>
                        In the event of a merger, acquisition, or sale of assets, your personal data may be transferred to
                        the successor entity, subject to the same protections described in this policy.
                    </p>
                </Section>

                <Section title="5. Data Security">
                    <p>We implement reasonable technical and organisational measures to protect your personal data, including:</p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Password hashing using industry-standard algorithms — passwords are never stored in plain text</li>
                        <li>Encrypted data transmission via HTTPS/TLS</li>
                        <li>Row-level security (RLS) on database tables to restrict data access to authorised users only</li>
                        <li>Role-based access controls limiting internal access to personal data</li>
                        <li>Secure JWT-based authentication tokens with expiry controls</li>
                        <li>OTP-based phone verification for sensitive account operations</li>
                    </ul>
                    <p>
                        No system is completely secure. We cannot guarantee absolute security of your data. In the event of
                        a data breach that is likely to affect your rights, we will notify you as required by applicable law.
                    </p>
                </Section>

                <Section title="6. Data Retention">
                    <p>
                        We retain your personal data for as long as your account is active or as necessary to provide you
                        with our services.
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>Account data is retained while your account exists and for a reasonable period after account closure</li>
                        <li>Subscription and payment records are retained as required by financial record-keeping obligations</li>
                        <li>Usage logs and activity data may be retained for a limited period for security and fraud prevention</li>
                    </ul>
                    <p>
                        <strong className="text-[var(--text-primary)]">⚠️ [PLACEHOLDER — Legal Review Required]:</strong>{' '}
                        Specific retention periods should be confirmed by your legal and compliance team in accordance with
                        applicable Indian law, including the DPDP Act 2023.
                    </p>
                </Section>

                <Section title="7. Your Rights">
                    <p>
                        Subject to applicable law, including the Digital Personal Data Protection Act, 2023 (India), you
                        have the following rights regarding your personal data:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong>Right to Access:</strong> You may request a copy of the personal data we hold about you.
                        </li>
                        <li>
                            <strong>Right to Correction:</strong> You may update or correct inaccurate account information
                            directly from your profile settings, or by contacting us.
                        </li>
                        <li>
                            <strong>Right to Erasure:</strong> You may request deletion of your account and associated
                            personal data by contacting us at{' '}
                            <a href="mailto:support@snyprr.ai" className="text-[var(--brand-primary)] hover:underline">
                                support@snyprr.ai
                            </a>
                            . Certain data may be retained where legally required.
                        </li>
                        <li>
                            <strong>Right to Withdraw Consent:</strong> Where processing is based on your consent, you may
                            withdraw it at any time. This does not affect the lawfulness of processing prior to withdrawal.
                        </li>
                        <li>
                            <strong>Right to Grievance Redressal:</strong> You may raise a privacy grievance by contacting
                            us at{' '}
                            <a href="mailto:support@snyprr.ai" className="text-[var(--brand-primary)] hover:underline">
                                support@snyprr.ai
                            </a>
                            . We will respond within a reasonable period.
                        </li>
                    </ul>
                    <p>
                        <strong className="text-[var(--text-primary)]">⚠️ [PLACEHOLDER — Legal Review Required]:</strong>{' '}
                        Under the DPDP Act 2023, additional obligations regarding the appointment of a Data Protection
                        Officer and formal grievance mechanisms may apply depending on the scale of data processing.
                        Please verify with your legal team.
                    </p>
                </Section>

                <Section title="8. Children's Privacy">
                    <p>
                        Snyprr.ai is not intended for use by individuals under 18 years of age. We do not knowingly collect
                        personal data from minors. If we become aware that a minor has registered on the platform, we will
                        take steps to delete the relevant account and data.
                    </p>
                    <p>
                        If you believe a minor has submitted personal information to us, please contact us at{' '}
                        <a href="mailto:support@snyprr.ai" className="text-[var(--brand-primary)] hover:underline">
                            support@snyprr.ai
                        </a>
                        .
                    </p>
                </Section>

                <Section title="9. Cookies & Tracking Technologies">
                    <p>
                        Snyprr.ai uses cookies and similar technologies to operate the platform and improve user experience.
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong>Essential Cookies:</strong> Required for authentication, session management, and
                            platform security. These cannot be disabled without affecting core functionality.
                        </li>
                        <li>
                            <strong>Preference Cookies:</strong> Store your UI preferences such as theme selection
                            (light/dark mode).
                        </li>
                        <li>
                            <strong>Analytics:</strong> We may use anonymised usage data to understand platform
                            performance.{' '}
                            <strong className="text-[var(--text-primary)]">⚠️ [Confirm analytics tools in use with your team.]</strong>
                        </li>
                    </ul>
                    <p>
                        You can manage cookie preferences through your browser settings. Disabling essential cookies may
                        prevent you from using certain features of the platform.
                    </p>
                </Section>

                <Section title="10. Third-Party Services">
                    <p>
                        The platform integrates with third-party services to deliver its functionality. Each service
                        operates under its own privacy policy:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong>Supabase</strong> — Database, authentication, and real-time infrastructure.{' '}
                            <a
                                href="https://supabase.com/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--brand-primary)] hover:underline"
                            >
                                Supabase Privacy Policy
                            </a>
                        </li>
                        <li>
                            <strong>Google Gemini API</strong> — AI-powered analysis features.{' '}
                            <a
                                href="https://policies.google.com/privacy"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[var(--brand-primary)] hover:underline"
                            >
                                Google Privacy Policy
                            </a>
                        </li>
                        <li>
                            <strong>Payment Gateway</strong> — Subscription payment processing.{' '}
                            <strong className="text-[var(--text-primary)]">⚠️ [Insert payment provider and link to their privacy policy once confirmed.]</strong>
                        </li>
                    </ul>
                    <p>
                        We are not responsible for the privacy practices of third-party services. We encourage you to
                        review their respective privacy policies.
                    </p>
                </Section>

                <Section title="11. Changes to This Policy">
                    <p>
                        We may update this Privacy Policy from time to time to reflect changes in our practices,
                        technology, or legal requirements. When we make material changes, we will update the "Last updated"
                        date at the top of this page and, where appropriate, notify registered users via email or an
                        in-platform notification.
                    </p>
                    <p>
                        Your continued use of Snyprr.ai after any changes constitutes your acceptance of the updated
                        Privacy Policy.
                    </p>
                </Section>

                <Section title="12. Contact Us">
                    <p>
                        For any privacy-related questions, requests, or grievances, please contact us:
                    </p>
                    <ul className="list-disc list-inside pl-2 space-y-1">
                        <li>
                            <strong>Email:</strong>{' '}
                            <a href="mailto:support@snyprr.ai" className="text-[var(--brand-primary)] hover:underline">
                                support@snyprr.ai
                            </a>
                        </li>
                        <li>
                            <strong>Platform:</strong> Use the{' '}
                            <Link to="/contact-us" className="text-[var(--brand-primary)] hover:underline">
                                Contact Us
                            </Link>{' '}
                            page on Snyprr.ai
                        </li>
                    </ul>
                    <p>
                        <strong className="text-[var(--text-primary)]">⚠️ [PLACEHOLDER — Legal Review Required]:</strong>{' '}
                        Insert postal/registered address and any required Data Protection Officer contact details here.
                    </p>
                </Section>

                {/* Legal notice */}
                <div className="p-4 rounded-2xl border border-[var(--brand-primary)]/20 bg-[var(--brand-glow)] text-xs text-[var(--text-muted)] space-y-1">
                    <p className="font-semibold text-[var(--text-primary)]">Legal Notice</p>
                    <p>
                        This Privacy Policy is prepared with reference to the Digital Personal Data Protection Act, 2023
                        (India) and generally applicable data protection principles. It requires review by a qualified
                        legal professional before final publication. Sections marked ⚠️ contain placeholders that must be
                        completed with verified company and operational details.
                    </p>
                    <p>
                        This policy does not constitute legal advice. Snyprr.ai recommends seeking independent legal
                        counsel to ensure compliance with all applicable Indian and international privacy regulations.
                    </p>
                </div>

                {/* Footer nav */}
                <div className="text-center pt-4">
                    <p className="text-xs text-[var(--text-muted)]">
                        See also:{' '}
                        <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Terms &amp; Conditions</Link>
                        {' · '}
                        <Link to="/risk-disclosure" className="text-[var(--brand-primary)] hover:underline">Risk Disclosure</Link>
                    </p>
                </div>

            </main>
        </div>
    );
}
