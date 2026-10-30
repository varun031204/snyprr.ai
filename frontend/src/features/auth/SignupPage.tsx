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
      const { needsOtp } = await signUp(email, password, name);
      if (needsOtp) {
        // Email confirmation is ON — redirect to OTP verification page
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        // Email confirmation is OFF — user is already logged in, go to dashboard
        navigate('/dashboard');
      }
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
            By creating an account you agree to our{' '}
            <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Terms &amp; Conditions</Link>{' '}
            and acknowledge that Snyprr.ai publishes analytical setups for educational and informational purposes only.
            No trade execution occurs on this platform. Nothing on Snyprr.ai constitutes financial or investment advice.
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
