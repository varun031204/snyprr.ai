import { TrendingUp, Eye, EyeOff, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../state/useAuthStore';
import { Logo } from '../../components/ui/Logo';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, authError, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
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
      // Supabase returns "Email not confirmed" when account exists but OTP not done
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
      // Otherwise authError is set by the store and shown below
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

      <GlassCard className="w-full p-6" hoverEffect={false}>
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
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
