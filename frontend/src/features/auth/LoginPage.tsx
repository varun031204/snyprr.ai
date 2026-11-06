import { Eye, EyeOff, AlertCircle, Mail, KeyRound } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../state/useAuthStore';
import { Logo } from '../../components/ui/Logo';

type LoginMode = 'password' | 'otp';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, sendOtpLogin, isLoading, authError, clearError } = useAuthStore();

  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setLocalError('');
    clearError();
    setOtpSent(false);
  };

  // ── Password login ────────────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter your email and password.');
      return;
    }
    clearError();
    setLocalError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? '';
      if (
        msg.toLowerCase().includes('email not confirmed') ||
        msg.toLowerCase().includes('not confirmed')
      ) {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&mode=signup`);
      }
    }
  };

  // ── OTP login — step 1: send code ────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setLocalError('Please enter your email address.');
      return;
    }
    clearError();
    setLocalError('');
    try {
      await sendOtpLogin(email);
      setOtpSent(true);
    } catch {
      // authError set by store
    }
  };

  const displayError = localError || authError;

  return (
    <div className="w-full">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8 text-center">
        <Logo className="w-16 h-16 object-contain mb-4" />
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Welcome back</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Sign in to your Snyprr.ai account</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] mb-5">
        <button
          type="button"
          onClick={() => switchMode('password')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mode === 'password'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          Password
        </button>
        <button
          type="button"
          onClick={() => switchMode('otp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            mode === 'otp'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          Email OTP
        </button>
      </div>

      <GlassCard className="w-full p-6" hoverEffect={false}>

        {/* ── Password login ─────────────────────────────────────────────── */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="flex flex-col gap-5">
            {displayError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
              autoComplete="email"
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
              autoComplete="current-password"
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            <div className="flex items-center justify-end -mt-2">
              <Link to="/forgot-password" className="text-xs text-[var(--brand-primary)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        )}

        {/* ── OTP login ──────────────────────────────────────────────────── */}
        {mode === 'otp' && !otpSent && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
            {displayError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{displayError}</span>
              </div>
            )}
            <div className="text-center space-y-1 pb-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Passwordless sign in</p>
              <p className="text-xs text-[var(--text-muted)]">
                We'll email you a 6-digit code. No password needed.
              </p>
            </div>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
              autoComplete="email"
            />
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Send Code
            </Button>
          </form>
        )}

        {/* ── OTP sent confirmation ─────────────────────────────────────── */}
        {mode === 'otp' && otpSent && (
          <div className="flex flex-col items-center gap-5 py-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 flex items-center justify-center">
              <Mail className="w-7 h-7 text-[var(--color-success)]" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Code sent!</p>
              <p className="text-xs text-[var(--text-muted)]">
                Check <span className="font-semibold text-[var(--text-primary)]">{email}</span> for your 6-digit sign-in code.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={() => navigate(`/verify-otp?email=${encodeURIComponent(email)}&mode=login`)}
            >
              Enter Code
            </Button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              ← Use a different email
            </button>
          </div>
        )}
      </GlassCard>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[var(--brand-primary)] font-medium hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
