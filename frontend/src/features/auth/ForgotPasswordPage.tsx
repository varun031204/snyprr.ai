import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setSubmitted(true);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Reset Password</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    {submitted
                        ? 'Check your inbox for reset instructions.'
                        : "Enter your account email and we'll send you a reset link."}
                </p>
            </div>

            {submitted ? (
                <div className="p-4 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-center">
                    <p className="text-sm font-semibold text-[var(--color-success)] mb-1">Email sent!</p>
                    <p className="text-xs text-[var(--text-muted)]">
                        If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                    />
                    <Button type="submit" variant="primary" className="w-full justify-center">
                        Send Reset Link
                    </Button>
                    <p className="text-[11px] text-center text-[var(--text-muted)]">
                        Password reset is available once backend integration is complete.
                    </p>
                </form>
            )}

            <div className="text-center">
                <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--brand-primary)] hover:underline"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Sign In
                </Link>
            </div>
        </div>
    );
}
