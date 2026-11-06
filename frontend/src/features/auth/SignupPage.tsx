/**
 * SignupPage — Email + Password signup with OTP verification.
 * Simple, reliable, production-ready.
 * Phone OTP removed — email OTP via Supabase is sufficient for v1.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, Mail, Lock, User } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/useAuthStore';
import { Logo } from '../../components/ui/Logo';

// ── Password strength ───────────────────────────────────────────────────────────
type Strength = 'weak' | 'fair' | 'good' | 'strong';
function pwStrength(pw: string): { level: Strength; score: number; tip: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const tip =
    pw.length < 8 ? 'At least 8 characters' :
      !/[A-Z]/.test(pw) ? 'Add an uppercase letter' :
        !/\d/.test(pw) ? 'Add a number' :
          !/[^A-Za-z0-9]/.test(pw) ? 'Add a special character' : '';
  const level: Strength = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';
  return { level, score, tip };
}
const STR_COLOR: Record<Strength, string> = {
  weak: 'bg-[var(--color-danger)]', fair: 'bg-amber-400',
  good: 'bg-yellow-400', strong: 'bg-[var(--color-success)]',
};
const STR_LABEL: Record<Strength, string> = {
  weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong',
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { signUp, isLoading, authError, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const str = password ? pwStrength(password) : null;

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'At least 8 characters';
    else if (str && str.score < 3) e.password = 'Password too weak — ' + str.tip;
    if (!confirmPw) e.confirmPw = 'Please confirm your password';
    else if (confirmPw !== password) e.confirmPw = 'Passwords do not match';
    if (!terms) e.terms = 'Accept the Terms & Conditions to continue';
    return e;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const { needsOtp } = await signUp(email.trim().toLowerCase(), password, name.trim());
      if (needsOtp) {
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      } else {
        navigate('/dashboard');
      }
    } catch {
      // authError set by store
    }
  };

  const displayError = authError;

  return (
    <div className="w-full">
      <button type="button" onClick={() => navigate('/login')}
        className="flex items-center gap-1.5 mb-5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Sign In
      </button>

      <div className="flex flex-col items-center mb-6 text-center">
        <Logo className="w-14 h-14 object-contain mb-3" />
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Join the Snyprr.ai prediction community</p>
      </div>

      {displayError && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      <GlassCard className="w-full p-6" hoverEffect={false}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Full Name <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="text" value={name} onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="Your full name" autoComplete="name"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.name ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
            </div>
            {errors.name && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Email Address <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); clearError(); }}
                placeholder="you@gmail.com" autoComplete="email"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.email ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
            </div>
            {errors.email && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Password <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                placeholder="Min. 8 characters" autoComplete="new-password"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.password ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && str && (
              <div className="space-y-1 mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= str.score ? STR_COLOR[str.level] : 'bg-[var(--bg-secondary)]'}`} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className={str.level === 'strong' ? 'text-[var(--color-success)] font-semibold' : str.level === 'weak' ? 'text-[var(--color-danger)] font-semibold' : 'text-amber-400 font-semibold'}>
                    {STR_LABEL[str.level]}
                  </span>
                  {str.tip && <span className="text-[var(--text-muted)]">{str.tip}</span>}
                </div>
              </div>
            )}
            {errors.password && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Confirm Password <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type={showCpw ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setErrors(p => ({ ...p, confirmPw: '' })); }}
                placeholder="Re-enter password" autoComplete="new-password"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.confirmPw ? 'border-[var(--color-danger)]' : confirmPw && confirmPw === password ? 'border-[var(--color-success)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {confirmPw && confirmPw === password && <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />}
                <button type="button" onClick={() => setShowCpw(!showCpw)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  {showCpw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {errors.confirmPw && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPw}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div onClick={() => setTerms(!terms)}
              className={`flex-shrink-0 mt-0.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${terms ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : errors.terms ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)]'}`}>
              {terms && <CheckCircle2 className="w-3 h-3 text-white" />}
            </div>
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">
              I agree to{' '}
              <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Terms & Conditions</Link>
              {' '}and{' '}
              <Link to="/privacy" className="text-[var(--brand-primary)] hover:underline">Privacy Policy</Link>.
              Nothing on this platform constitutes financial advice.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1 -mt-2"><AlertCircle className="w-3 h-3" />{errors.terms}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full mt-1" isLoading={isLoading}>
            Create Account →
          </Button>
        </form>
      </GlassCard>

      <p className="text-center text-sm text-[var(--text-muted)] mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-[var(--brand-primary)] font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
