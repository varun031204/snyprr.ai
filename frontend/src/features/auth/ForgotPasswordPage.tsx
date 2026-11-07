import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setIsLoading(true);
        setError('');

        // ── Step 1: Check if the email is registered ───────────────────────
        try {
            const res = await fetch(`${API_BASE}/api/auth/check-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'Check failed');

            if (!json.exists) {
                setError('No account found with that email address.');
                setIsLoading(false);
                return;
            }
        } catch (checkErr: any) {
            // If the check itself fails (network/server down), fall through and
            // let Supabase handle it silently — don't block the user
            console.warn('[ForgotPassword] Email check failed, proceeding anyway:', checkErr.message);
        }

        // ── Step 2: Send the Supabase password reset email ─────────────────
        const redirectTo = `${window.location.origin}/reset-password`;

        const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
            email.trim(),
            { redirectTo },
        );

        setIsLoading(false);

        if (supabaseError) {
            setError('Something went wrong sending the reset email. Please try again.');
            return;
        }

        setSubmitted(true);
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
                        A reset link has been sent to <strong>{email}</strong>.
                        Check your spam folder if it doesn't arrive within a few minutes.
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setError(''); }}
                        leftIcon={<Mail className="w-4 h-4" />}
                        required
                        disabled={isLoading}
                    />
                    {error && (
                        <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                            {error}
                        </p>
                    )}
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full justify-center"
                        isLoading={isLoading}
                    >
                        Send Reset Link
                    </Button>
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
