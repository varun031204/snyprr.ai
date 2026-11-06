import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase, isSupabasePlaceholder } from '../../lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError('');
    setIsLoading(true);

    try {
      if (isSupabasePlaceholder) {
        // Dev mode: simulate success without a real email
        await new Promise((r) => setTimeout(r, 600));
        setSubmitted(true);
        return;
      }

      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        // redirectTo must match the URL configured in Supabase Auth → Email Templates
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (supabaseError) {
        const lower = supabaseError.message.toLowerCase();
        if (lower.includes('rate limit')) {
          setError('Too many requests. Please wait a few minutes and try again.');
        } else {
          setError(supabaseError.message);
        }
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
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
        <div className="p-4 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-center space-y-2">
          <p className="text-sm font-semibold text-[var(--color-success)]">Email sent!</p>
          <p className="text-xs text-[var(--text-muted)]">
            If <strong>{email}</strong> is registered, you'll receive a password reset link shortly.
            Check your spam folder too.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Input
            type="email"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            leftIcon={<Mail className="w-4 h-4" />}
            autoFocus
            required
          />
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
