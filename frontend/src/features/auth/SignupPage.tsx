/**
 * SignupPage — Step 1 of 2
 * Collects Full Name, Email, Phone (+91 default), Password, Confirm Password.
 * On submit: validates all fields, hits /api/auth/initiate (phone OTP) and
 * supabase.auth.signUp (email OTP), then navigates to /verify-otp with a
 * registrationToken query param.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2,
  Phone, Mail, Lock, User,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { Logo } from '../../components/ui/Logo';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

// Country codes
const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', label: 'India' },
  { code: '+1', flag: '🇺🇸', label: 'USA' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+61', flag: '🇦🇺', label: 'AU' },
  { code: '+971', flag: '🇦🇪', label: 'UAE' },
  { code: '+65', flag: '🇸🇬', label: 'SG' },
];

// Password strength
type StrengthLevel = 'weak' | 'fair' | 'good' | 'strong';
function getPasswordStrength(pw: string): { level: StrengthLevel; score: number; tips: string[] } {
  const tips: string[] = [];
  let score = 0;
  if (pw.length >= 8) { score++; } else { tips.push('At least 8 characters'); }
  if (/[A-Z]/.test(pw)) { score++; } else { tips.push('One uppercase letter'); }
  if (/[a-z]/.test(pw)) { score++; } else { tips.push('One lowercase letter'); }
  if (/\d/.test(pw)) { score++; } else { tips.push('One number'); }
  if (/[^A-Za-z0-9]/.test(pw)) { score++; } else { tips.push('One special character'); }
  const level: StrengthLevel = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score <= 3 ? 'good' : 'strong';
  return { level, score, tips };
}
const STRENGTH_COLORS: Record<StrengthLevel, string> = {
  weak: 'bg-[var(--color-danger)]',
  fair: 'bg-amber-400',
  good: 'bg-yellow-400',
  strong: 'bg-[var(--color-success)]',
};
const STRENGTH_LABELS: Record<StrengthLevel, string> = {
  weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong',
};

export default function SignupPage() {
  const navigate = useNavigate();

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [terms, setTerms] = useState(false);

  // UI state
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  const phoneE164 = `${countryCode}${phoneLocal.replace(/\D/g, '')}`;
  const strength = password ? getPasswordStrength(password) : null;

  // ── Client-side validation ─────────────────────────────────────────────────
  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email format';

    const digits = phoneLocal.replace(/\D/g, '');
    if (!digits) e.phone = 'Mobile number is required';
    else if (digits.length < 7 || digits.length > 12) e.phone = 'Enter a valid mobile number';

    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (strength && (strength.score < 3)) e.password = 'Password is too weak';

    if (!confirmPw) e.confirmPw = 'Please confirm your password';
    else if (confirmPw !== password) e.confirmPw = 'Passwords do not match';

    if (!terms) e.terms = 'You must accept the Terms & Conditions to continue';
    return e;
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    try {
      // 1. Initiate phone OTP via our backend
      const phoneRes = await fetch(`${API_BASE}/api/auth/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.toLowerCase().trim(), phone: phoneE164 }),
      });
      const phoneData = await phoneRes.json();
      if (!phoneRes.ok && !phoneData.warning) {
        setGlobalError(phoneData.error ?? 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }
      const registrationToken: string = phoneData.registrationToken ?? '';

      // 2. Initiate Supabase email OTP
      const { data, error: sbError } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phoneE164,
          },
        },
      });

      if (sbError) {
        const lower = sbError.message.toLowerCase();
        if (lower.includes('already registered') || lower.includes('user already exists')) {
          // Email already in Supabase — don't reveal, show generic
          setErrors(prev => ({ ...prev, email: 'This email is already registered. Please sign in.' }));
        } else if (lower.includes('rate limit')) {
          setGlobalError('Too many attempts. Please wait a few minutes.');
        } else {
          setGlobalError(sbError.message);
        }
        setIsLoading(false);
        return;
      }

      // Navigate to Step 2
      const params = new URLSearchParams({
        email: email.toLowerCase().trim(),
        token: registrationToken,
        needsEmailOtp: data.session ? '0' : '1',
      });
      navigate(`/verify-otp?${params.toString()}`);
    } catch (err: any) {
      setGlobalError(err?.message ?? 'Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Back */}
      <button type="button" onClick={() => navigate('/login')}
        className="flex items-center gap-1.5 mb-5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Sign In</span>
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center">1</span>
          <span className="text-xs font-semibold text-[var(--brand-primary)]">Registration</span>
        </div>
        <div className="flex-1 h-0.5 bg-[var(--border-subtle)] rounded-full" />
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-bold flex items-center justify-center">2</span>
          <span className="text-xs text-[var(--text-muted)]">Verification</span>
        </div>
      </div>

      <div className="flex flex-col items-center mb-6 text-center">
        <Logo className="w-14 h-14 object-contain mb-3" />
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Create your account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Join the Snyprr.ai prediction community</p>
      </div>

      {globalError && (
        <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{globalError}</span>
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
              <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
                placeholder="Your full name"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.fullName ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
            </div>
            {errors.fullName && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Email Address <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="you@gmail.com" autoComplete="email"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.email ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
            </div>
            {errors.email && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
          </div>

          {/* Mobile */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Mobile Number <span className="text-[var(--color-danger)]">*</span>
            </label>
            <div className="flex gap-2">
              <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                className="flex-shrink-0 pl-2 pr-6 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-primary)] cursor-pointer appearance-none min-w-[90px]">
                {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input type="tel" value={phoneLocal} onChange={e => { setPhoneLocal(e.target.value); setErrors(p => ({ ...p, phone: '' })); }}
                  placeholder="98765 43210" autoComplete="tel"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.phone ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
              </div>
            </div>
            {errors.phone && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.phone}</p>}
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
            {/* Strength meter */}
            {password && strength && (
              <div className="space-y-1 mt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= strength.score ? STRENGTH_COLORS[strength.level] : 'bg-[var(--bg-secondary)]'}`} />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-semibold ${strength.level === 'weak' ? 'text-[var(--color-danger)]' : strength.level === 'strong' ? 'text-[var(--color-success)]' : 'text-amber-400'}`}>
                    {STRENGTH_LABELS[strength.level]}
                  </span>
                  {strength.tips.length > 0 && (
                    <span className="text-[var(--text-muted)]">{strength.tips[0]}</span>
                  )}
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
              <input type={showConfirm ? 'text' : 'password'} value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setErrors(p => ({ ...p, confirmPw: '' })); }}
                placeholder="Re-enter your password" autoComplete="new-password"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-[var(--bg-secondary)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] transition-all ${errors.confirmPw ? 'border-[var(--color-danger)]' : confirmPw && confirmPw === password ? 'border-[var(--color-success)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {confirmPw && confirmPw === password && <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />}
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {errors.confirmPw && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPw}</p>}
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); setErrors(p => ({ ...p, terms: '' })); }}
                className="sr-only" />
              <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-all ${terms ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)]' : errors.terms ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)]'}`}
                style={{ width: 18, height: 18 }}>
                {terms && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
            </div>
            <span className="text-xs text-[var(--text-muted)] leading-relaxed">
              I agree to Snyprr.ai's{' '}
              <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Terms & Conditions</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-[var(--brand-primary)] hover:underline">Privacy Policy</Link>.
              Nothing on this platform constitutes financial advice.
            </span>
          </label>
          {errors.terms && <p className="text-xs text-[var(--color-danger)] flex items-center gap-1 -mt-2"><AlertCircle className="w-3 h-3" />{errors.terms}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full mt-1" isLoading={isLoading}>
            Continue to Verification →
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
