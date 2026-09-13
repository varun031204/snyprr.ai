import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../state/useAuthStore';
import { Logo } from '../../components/ui/Logo';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, authError, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    clearError();
    setLocalError('');
    try {
      await signUp(email, password, name);
      // Redirect to OTP verification — code sent to email automatically
      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch {
      // authError is set by the store
    }
  };

  const displayError = localError || authError;

  return (
    <div className="w-full">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 mb-6 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
        <span>Back</span>
      </button>

      <div className="flex flex-col items-center mb-8 text-center">
        <Logo className="w-16 h-16 object-contain mb-4" />
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Join the Snyprr.ai prediction community</p>
      </div>

      <GlassCard className="w-full p-6" hoverEffect={false}>
        <form onSubmit={handleSignup} className="flex flex-col gap-5">
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <Input label="Full Name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setLocalError(''); }} required />
          <Input label="Password" type="password" placeholder="Min. 8 characters" value={password} onChange={(e) => { setPassword(e.target.value); setLocalError(''); }} required />

          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            By creating an account, you acknowledge that Snyprr.ai is a prediction platform only. No trades are executed. Predictions are for informational purposes.
          </p>

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Create Account
          </Button>
        </form>
      </GlassCard>

      <p className="text-center text-sm text-[var(--text-muted)] mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
