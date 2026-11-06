import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuthStore } from '../../state/useAuthStore';
import { Logo } from '../../components/ui/Logo';

// Password strength rules
function getPasswordStrength(pw: string) {
  const rules = [
    { label: 'At least 8 characters', pass: pw.length >= 8 },
    { label: 'Contains a number', pass: /\d/.test(pw) },
    { label: 'Contains a letter', pass: /[a-zA-Z]/.test(pw) },
  ];
  const score = rules.filter((r) => r.pass).length;
  return { rules, score, level: score === 3 ? 'strong' : score === 2 ? 'medium' : score === 1 ? 'weak' : 'none' };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, authError, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState('');

  const strength = getPasswordStrength(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    try {
      const { needsOtp } = await signUp(email, password, name.trim());
      if (needsOtp) {
        navigate(`/verify-otp?email=${encodeURIComponent(email)}&mode=signup`);
      } else {
        navigate('/dashboard');
      }
    } catch {
      // authError is set by the store
    }
  };

  const displayError = localError || authError;

  const strengthColor =
    strength.level === 'strong' ? 'bg-[var(--color-success)]' :
    strength.level === 'medium' ? 'bg-[var(--color-warning)]' :
    strength.level === 'weak'   ? 'bg-[var(--color-danger)]' : 'bg-[var(--border-subtle)]';

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

          {/* Error banner */}
          {displayError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Full name */}
          <Input
            label="Full Name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => { setName(e.target.value); setLocalError(''); }}
            autoFocus
            required
          />

          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setLocalError(''); }}
            autoComplete="email"
            required
          />

          {/* Password */}
          <div className="space-y-2">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setLocalError(''); }}
              autoComplete="new-password"
              required
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strengthColor : 'bg-[var(--border-subtle)]'}`}
                    />
                  ))}
                </div>
                <div className="space-y-1">
                  {strength.rules.map((rule) => (
                    <div key={rule.label} className="flex items-center gap-1.5 text-[11px]">
                      {rule.pass
                        ? <CheckCircle2 className="w-3 h-3 text-[var(--color-success)] flex-shrink-0" />
                        : <XCircle className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />}
                      <span className={rule.pass ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <Input
            label="Confirm Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setLocalError(''); }}
            autoComplete="new-password"
            required
            error={passwordsMismatch ? 'Passwords do not match' : undefined}
            rightIcon={
              <div className="flex items-center gap-1.5">
                {passwordsMatch && <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />}
                {passwordsMismatch && <XCircle className="w-4 h-4 text-[var(--color-danger)]" />}
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            }
          />

          {/* Terms */}
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            By creating an account you agree to our{' '}
            <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Terms &amp; Conditions</Link>{' '}
            and acknowledge that Snyprr.ai publishes analytical setups for educational purposes only.
            Nothing on Snyprr.ai constitutes financial or investment advice.
          </p>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading || passwordsMismatch}
          >
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
