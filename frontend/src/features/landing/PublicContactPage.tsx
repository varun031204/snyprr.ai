import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2, Clock, Headphones, ShieldCheck, HelpCircle } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Logo } from '../../components/ui/Logo';

const CATEGORIES = [
    { value: 'GENERAL', label: 'General Inquiry' },
    { value: 'SUBSCRIPTION', label: 'Plans & Subscriptions' },
    { value: 'TECHNICAL', label: 'Technical / Bug Report' },
    { value: 'PARTNERSHIP', label: 'Partnership & Business' },
    { value: 'VERIFICATION', label: 'Trader Verification' },
    { value: 'FEEDBACK', label: 'Feature Request / Feedback' },
];

export default function PublicContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [category, setCategory] = useState('GENERAL');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        // TODO: replace with real API call when backend is ready
        // await fetch('/api/contact', { method: 'POST', body: JSON.stringify({ name, email, category, subject, message }) });
        await new Promise((res) => setTimeout(res, 800));
        setSubmitting(false);
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
            <div className="fixed top-[-180px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-[var(--brand-primary)]/8 blur-[150px] pointer-events-none" />

            {/* ── Navbar ── */}
            <header className="sticky top-0 z-50 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/90 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-3.5">
                    <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                        <Logo className="h-8 object-contain" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Link to="/">
                            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="primary" size="sm">Sign Up Free</Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Content ── */}
            <main className="max-w-5xl mx-auto px-5 sm:px-8 py-16 space-y-12">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <span className="inline-flex items-center text-xs font-semibold px-3.5 py-1 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 uppercase tracking-wider">
                        Get in Touch
                    </span>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Contact Snyprr.ai</h1>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                        Have a question, feedback, or partnership inquiry? Our team responds within 2 hours during business hours.
                    </p>
                </div>

                {/* Channel cards */}
                <div className="grid sm:grid-cols-3 gap-4">
                    {[
                        { icon: <Mail className="w-5 h-5" />, title: 'Email Support', sub: 'support@snyprr.ai', badge: '< 2 hr response', badgeCls: 'text-[var(--color-success)]', bg: 'bg-[var(--brand-glow)]', color: 'text-[var(--brand-primary)]' },
                        { icon: <MessageSquare className="w-5 h-5" />, title: 'Discord Community', sub: 'discord.gg/snyprr', badge: '14,000+ traders', badgeCls: 'text-purple-400', bg: 'bg-purple-500/10', color: 'text-purple-400' },
                        { icon: <Headphones className="w-5 h-5" />, title: 'VIP Priority Desk', sub: 'For PRO & VIP subscribers', badge: 'Instant queue', badgeCls: 'text-amber-400', bg: 'bg-amber-500/10', color: 'text-amber-400' },
                    ].map((c) => (
                        <GlassCard key={c.title} hoverEffect={false} className="p-5 flex flex-col gap-3">
                            <div className={`w-10 h-10 rounded-xl ${c.bg} ${c.color} flex items-center justify-center`}>{c.icon}</div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">{c.title}</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{c.sub}</p>
                            </div>
                            <span className={`text-[11px] font-semibold flex items-center gap-1 mt-auto ${c.badgeCls}`}>
                                <Clock className="w-3.5 h-3.5" /> {c.badge}
                            </span>
                        </GlassCard>
                    ))}
                </div>

                {/* Form / success */}
                {submitted ? (
                    <GlassCard hoverEffect={false} className="p-10 text-center max-w-lg mx-auto space-y-5">
                        <div className="w-16 h-16 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success)] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)]">Message sent!</h2>
                        <p className="text-sm text-[var(--text-muted)]">
                            Thanks for reaching out. Our team will get back to you at{' '}
                            <strong className="text-[var(--text-primary)]">{email}</strong> within 2 hours.
                        </p>
                        <Button variant="secondary" onClick={() => { setSubmitted(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}>
                            Send Another Message
                        </Button>
                    </GlassCard>
                ) : (
                    <GlassCard hoverEffect={false} className="p-6 md:p-10 rounded-3xl max-w-3xl mx-auto">
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Send us a message</h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Input label="Your Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun Mehta" required />
                                <Input label="Email Address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arjun@email.com" required />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
                                    >
                                        {CATEGORIES.map((c) => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief subject line" required />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[var(--text-secondary)]">Message</label>
                                <textarea
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your question or request in detail..."
                                    required
                                    className="w-full bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)] flex items-start gap-1.5">
                                    <HelpCircle className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0 mt-0.5" />
                                    <span>
                                        Already a member?{' '}
                                        <Link to="/login" className="text-[var(--brand-primary)] hover:underline">Sign in</Link>{' '}
                                        to access priority support.
                                    </span>
                                </p>
                                <Button type="submit" variant="primary" size="md" isLoading={isSubmitting} leftIcon={<Send className="w-4 h-4" />}>
                                    Send Message
                                </Button>
                            </div>
                        </form>
                    </GlassCard>
                )}

                {/* FAQ link */}
                <div className="text-center space-y-4">
                    <p className="text-sm text-[var(--text-muted)]">Looking for quick answers?</p>
                    <a href="/#help">
                        <Button variant="outline" size="md" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                            View FAQ
                        </Button>
                    </a>
                </div>

            </main>
        </div>
    );
}
