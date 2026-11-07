import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [invalidLink, setInvalidLink] = useState(false);

    /**
     * Supabase sends the recovery token in the URL hash as:
     *   /reset-password#access_token=...&type=recovery
     *
     * With detectSessionInUrl=true the client fires an onAuthStateChange
     * event with type PASSWORD_RECOVERY. We listen for that to confirm
     * the link is valid before showing the form.
     */
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setSessionReady(true);
            }
        });

        // Fallback: if there's already an active session (user navigated back),
        // check if there's a recovery token in the URL hash directly.
        const hash = window.location.hash;
        if (hash.includes('type=recovery') || hash.includes('access_token')) {
            setSessionReady(true);
        }

        // If after 3 seconds nothing fired, the link is stale/invalid
        const timer = setTimeout(() => {
            setSessionReady((prev) => {
                if (!prev) setInvalidLink(true);
                return prev;
            });
        }, 3000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timer);
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPw) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password });
        setIsLoading(false);

        if (updateError) {
            setError(updateError.message ?? 'Failed to update password. Try requesting a new reset link.');
            return;
        }

        setSuccess(true);
        // Redirect to login after 2.5 seconds
        setTimeout(() => navigate('/login'), 2500);
    };

    // Invalid / expired link
    if (invalidLink) {
        return (
            <div className="w-full max-w-sm mx-auto space-y-6 text-center">
                <AlertCircle className="w-10 h-10 text-[var(--color-danger)] mx-auto" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Link Expired or Invalid</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    This reset link has expired or already been used. Please request a new one.
                </p>
                <Button variant="primary" className="w-full justify-center" onClick={() => navigate('/forgot-password')}>
                    Request New Link
                </Button>
            </div>
        );
    }

    // Waiting for Supabase to fire the PASSWORD_RECOVERY event
    if (!sessionReady) {
        return (
            <div className="w-full max-w-sm mx-auto text-center space-y-4">
                <div className="w-10 h-10 rounded-full border-[3px] border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] animate-spin mx-auto" />
                <p className="text-sm text-[var(--text-muted)]">Verifying reset link…</p>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className="w-full max-w-sm mx-auto space-y-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-[var(--color-success)] mx-auto" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Password Updated!</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    Your password has been changed. Redirecting you to sign in…
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-sm mx-auto space-y-6">
            <div className="text-center space-y-1.5">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Set New Password</h2>
                <p className="text-sm text-[var(--text-muted)]">
                    Choose a strong password for your account.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={<KeyRound className="w-4 h-4" />}
                    rightIcon={
                        <button
                            type="button"
                            onClick={() => setShowPw(!showPw)}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            tabIndex={-1}
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    }
                    required
                    disabled={isLoading}
                />
                <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    leftIcon={<KeyRound className="w-4 h-4" />}
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
                    Update Password
                </Button>
            </form>
        </div>
    );
}
