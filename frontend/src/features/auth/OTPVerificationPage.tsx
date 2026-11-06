/**
 * OTPVerificationPage — Email OTP only.
 * User receives a 6-digit code from Supabase to their email.
 * Account is only activated after this verification succeeds.
 */
import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/useAuthStore';
import { supabase } from '../../lib/supabase';

const OTP_LEN = 6;

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';

  const { verifyOtp, isLoading, authError, clearError } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) { setCanResend(true); return; }
    const id = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const focus = (i: number) => inputRefs.current[i]?.focus();

  const handleChange = (i: number, val: string) => {
    clearError();
    const ch = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = ch; setOtp(next);
    if (ch && i < OTP_LEN - 1) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (otp[i]) { const n = [...otp]; n[i] = ''; setOtp(n); }
      else if (i > 0) focus(i - 1);
    } else if (e.key === 'ArrowLeft' && i > 0) focus(i - 1);
    else if (e.key === 'ArrowRight' && i < OTP_LEN - 1) focus(i + 1);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (!digits) return;
    const next = Array(OTP_LEN).fill('');
    digits.split('').forEach((d, i) => { next[i] = d; });
    setOtp(next);
    focus(Math.min(digits.length, OTP_LEN - 1));
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LEN) return;
    try {
      await verifyOtp(email, code);
      navigate('/dashboard');
    } catch {
      setOtp(Array(OTP_LEN).fill(''));
      focus(0);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendMsg('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) { setResendMsg(error.message); return; }
      setResendMsg('A new code has been sent to your email.');
      setCanResend(false);
      setCooldown(60);
    } catch { setResendMsg('Failed to resend. Please try again.'); }
  };

  const isComplete = otp.every(d => d !== '');
  const mm = String(Math.floor(cooldown / 60)).padStart(2, '0');
  const ss = String(cooldown % 60).padStart(2, '0');

  // Mask the email for display
  const maskedEmail = email ? (() => {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    const visible = Math.min(2, local.length);
    return local.slice(0, visible) + '•'.repeat(Math.max(1, local.length - visible * 2)) + local.slice(-Math.min(2, local.length)) + '@' + domain;
  })() : 'your email';

  return (
    <div className="w-full">
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[var(--brand-primary)]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Check your email</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs leading-relaxed">
          We sent a <span className="font-semibold text-[var(--text-primary)]">6-digit code</span> to{' '}
          <span className="text-[var(--brand-primary)] font-medium">{maskedEmail}</span>.
          Enter it below to activate your account.
        </p>
      </div>

      <GlassCard className="w-full p-6" hoverEffect={false}>
        <div className="flex flex-col gap-5">

          {authError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* OTP boxes */}
          <div className="flex justify-center gap-2.5">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text" inputMode="numeric" maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={e => e.target.select()}
                className={`w-12 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
                  bg-[var(--bg-secondary)] text-[var(--text-primary)]
                  ${digit
                    ? 'border-[var(--brand-primary)] shadow-[0_0_0_2px_rgba(139,92,246,0.2)]'
                    : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'
                  }`}
                style={{ height: 52 }}
              />
            ))}
          </div>

          <Button variant="primary" size="lg" className="w-full" onClick={handleVerify}
            disabled={!isComplete} isLoading={isLoading}>
            {isLoading ? 'Verifying…' : 'Verify Email & Continue'}
          </Button>

          {/* Resend */}
          <div className="text-center text-sm space-y-1">
            {resendMsg && (
              <p className={`text-xs flex items-center justify-center gap-1 ${resendMsg.includes('sent') ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {resendMsg.includes('sent') && <CheckCircle2 className="w-3.5 h-3.5" />}
                {resendMsg}
              </p>
            )}
            {canResend ? (
              <button type="button" onClick={handleResend}
                className="text-[var(--brand-primary)] font-medium hover:underline cursor-pointer text-sm">
                Resend code
              </button>
            ) : (
              <p className="text-[var(--text-muted)] text-xs">
                Resend available in <span className="font-mono font-semibold text-[var(--text-secondary)]">{mm}:{ss}</span>
              </p>
            )}
          </div>

        </div>
      </GlassCard>

      <p className="text-center text-xs text-[var(--text-muted)] mt-5 leading-relaxed">
        Wrong email?{' '}
        <button type="button" onClick={() => navigate('/signup')} className="text-[var(--brand-primary)] hover:underline cursor-pointer">
          Go back and re-enter
        </button>
      </p>
    </div>
  );
}
