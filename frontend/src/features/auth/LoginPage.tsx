import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
      const msg = (err as { message?: string })?.message ?? '';
      if (msg.toLowerCase().includes('email not confirmed') || msg.toLowerCase().includes('not confirmed')) {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
    }
  };

  const displayError = localError || authError;

  return (
    <div className="w-full">

      {/* ── Heading — white text so it's visible over any video ── */}
      <div className="flex flex-col items-center mb-8 text-center">
        <Logo className="w-16 h-16 object-contain mb-4" />
        <h1 className="text-2xl font-extrabold text-white drop-shadow">Welcome back</h1>
        <p className="text-sm text-white/70 mt-1">Sign in to your Snyprr.ai account</p>
      </div>

      {/* ── Glass card ── */}
      <div className="w-full p-6 rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleLogin} className="flex flex-col gap-5">

          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 text-sm">
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
      </div>

      <p className="text-center text-sm text-white/60 mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-[var(--brand-primary)] font-medium hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
