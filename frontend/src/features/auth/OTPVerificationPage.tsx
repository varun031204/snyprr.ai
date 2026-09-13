import React, { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, AlertCircle, RotateCcw } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/useAuthStore';
import { supabase } from '../../lib/supabase';

const OTP_LENGTH = 6;

export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const { verifyOtp, isLoading, authError, clearError } = useAuthStore();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown for resend
  useEffect(() => {
    const timer = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(timer);
          setCanResend(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = (index: number, value: string) => {
    clearError();
    const cleaned = value.replace(/\D/g, '').slice(-1); // digits only, 1 char
    const next = [...otp];
    next[index] = cleaned;
    setOtp(next);
    if (cleaned && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  // Handle paste — fill all 6 digits at once
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setOtp(next);
    focusInput(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < OTP_LENGTH) return;
    clearError();
    try {
      await verifyOtp(email, code);
      navigate('/dashboard');
    } catch {
      // authError is set by store
      setOtp(Array(OTP_LENGTH).fill(''));
      focusInput(0);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendMsg('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) {
        setResendMsg(error.message);
      } else {
        setResendMsg('A new code has been sent to your email.');
        setCanResend(false);
        setResendCooldown(60);
        // Restart countdown
        const timer = setInterval(() => {
          setResendCooldown((s) => {
            if (s <= 1) { clearInterval(timer); setCanResend(true); return 0; }
            return s - 1;
          });
        }, 1000);
      }
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    }
  };

  const isComplete = otp.every((d) => d !== '');

  return (
    <div className="w-full">
      {/* Icon + heading */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/30 flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-[var(--brand-primary)]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Verify your email</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-xs">
          We sent a <span className="font-semibold text-[var(--text-primary)]">6-digit code</span> to{' '}
          <span className="text-[var(--brand-primary)] font-medium">{email || 'your email'}</span>.
          Enter it below.
        </p>
      </div>

      <GlassCard className="w-full p-6" hoverEffect={false}>
        <div className="flex flex-col gap-6">
          {/* Error */}
          {authError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* OTP input boxes */}
          <div className="flex justify-center gap-3">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 transition-all outline-none
                  bg-[var(--bg-secondary)]
                  text-[var(--text-primary)]
                  ${digit
                    ? 'border-[var(--brand-primary)] shadow-[0_0_0_3px_var(--brand-primary)]/20'
                    : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)] focus:shadow-[0_0_0_3px_rgba(var(--brand-primary-rgb),0.15)]'
                  }`}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleVerify}
            isLoading={isLoading}
            disabled={!isComplete}
          >
            Verify & Continue
          </Button>
        </div>
      </GlassCard>

      {/* Resend section */}
      <div className="mt-5 text-center space-y-2">
        {resendMsg && (
          <p className={`text-sm ${resendMsg.includes('new code') ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
            {resendMsg}
          </p>
        )}
        <p className="text-sm text-[var(--text-muted)]">
          {canResend ? (
            <button
              onClick={handleResend}
              className="inline-flex items-center gap-1.5 text-[var(--brand-primary)] font-medium hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resend code
            </button>
          ) : (
            <span>
              Resend code in{' '}
              <span className="font-mono font-semibold text-[var(--text-primary)]">
                {String(Math.floor(resendCooldown / 60)).padStart(2, '0')}:
                {String(resendCooldown % 60).padStart(2, '0')}
              </span>
            </span>
          )}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  );
}
