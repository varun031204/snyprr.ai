/**
 * OTPVerificationPage — Step 2 of 2
 * Two independent OTP sections:
 *   A. Email OTP — verified via Supabase (type: 'signup')
 *   B. Phone OTP — verified via our backend /api/auth/verify-phone
 *
 * Account activation requires BOTH to succeed.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../state/useAuthStore';
import { supabase } from '../../lib/supabase';

const OTP_LEN = 6;
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

// ── Reusable OTP input row ────────────────────────────────────────────────────
function OtpBoxes({
  value, onChange, disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[i] = ch;
    onChange(next);
    if (ch && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (value[i]) { const n = [...value]; n[i] = ''; onChange(n); }
      else if (i > 0) refs.current[i - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LEN);
    if (!digits) return;
    const next = Array(OTP_LEN).fill('');
    digits.split('').forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs.current[Math.min(digits.length, OTP_LEN - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2.5">
      {value.map((d, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1}
          value={d} disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          className={`w-11 h-13 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none select-none
            bg-[var(--bg-secondary)] text-[var(--text-primary)] disabled:opacity-50
            ${d ? 'border-[var(--brand-primary)] shadow-[0_0_0_2px_rgba(177,124,254,0.2)]'
              : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'}`}
          style={{ height: 52 }}
        />
      ))}
    </div>
  );
}

// ── Countdown ────────────────────────────────────────────────────────────────
function useCountdown(initial: number) {
  const [secs, setSecs] = useState(initial);
  const [running, setRunning] = useState(true);

  const restart = useCallback(() => { setSecs(initial); setRunning(true); }, [initial]);

  useEffect(() => {
    if (!running) return;
    if (secs <= 0) { setRunning(false); return; }
    const id = setTimeout(() => setSecs(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secs, running]);

  return { secs, canAct: secs === 0, restart };
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function OTPVerificationPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const token = params.get('token') ?? '';         // registrationToken
  const needsEmailOtp = params.get('needsEmailOtp') !== '0'; // default true

  const { verifyOtp } = useAuthStore();

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [emailVerified, setEmailVerified] = useState(!needsEmailOtp);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const emailTimer = useCountdown(60);

  // Phone OTP state
  const [phoneOtp, setPhoneOtp] = useState<string[]>(Array(OTP_LEN).fill(''));
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const phoneTimer = useCountdown(60);

  // Session info (masked phone/email)
  const [maskedPhone, setMaskedPhone] = useState('•••••••••••');
  const [maskedEmail, setMaskedEmail] = useState(email);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/auth/session-info?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          setMaskedPhone(d.data.maskedPhone);
          setMaskedEmail(d.data.maskedEmail);
          if (d.data.phoneVerified) setPhoneVerified(true);
          if (d.data.emailVerified) setEmailVerified(true);
        }
      }).catch(() => { });
  }, [token]);

  // ── Verify email ────────────────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    const code = emailOtp.join('');
    if (code.length < OTP_LEN) return;
    setEmailLoading(true); setEmailError('');
    try {
      await verifyOtp(email, code);
      setEmailVerified(true);
      // Mark on backend
      if (token) {
        await fetch(`${API_BASE}/api/auth/mark-email-verified`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationToken: token }),
        });
      }
    } catch (err: any) {
      setEmailError(err?.message ?? 'Invalid code. Please try again.');
      setEmailOtp(Array(OTP_LEN).fill(''));
    } finally { setEmailLoading(false); }
  };

  // ── Resend email ────────────────────────────────────────────────────────
  const handleResendEmail = async () => {
    if (!emailTimer.canAct) return;
    setEmailError('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) setEmailError(error.message);
      else emailTimer.restart();
    } catch { setEmailError('Failed to resend. Please try again.'); }
  };

  // ── Verify phone ────────────────────────────────────────────────────────
  const handleVerifyPhone = async () => {
    const code = phoneOtp.join('');
    if (code.length < OTP_LEN || !token) return;
    setPhoneLoading(true); setPhoneError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-phone`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationToken: token, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) { setPhoneError(data.error ?? 'Verification failed.'); setPhoneOtp(Array(OTP_LEN).fill('')); }
      else setPhoneVerified(true);
    } catch { setPhoneError('Network error. Please try again.'); }
    finally { setPhoneLoading(false); }
  };

  // ── Resend phone ────────────────────────────────────────────────────────
  const handleResendPhone = async () => {
    if (!phoneTimer.canAct || !token) return;
    setPhoneError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-phone`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationToken: token }),
      });
      const data = await res.json();
      if (!res.ok) setPhoneError(data.error ?? 'Failed to resend.');
      else phoneTimer.restart();
    } catch { setPhoneError('Network error. Please try again.'); }
  };

  // ── Auto-redirect when both verified ────────────────────────────────────
  useEffect(() => {
    if (emailVerified && phoneVerified) {
      const t = setTimeout(() => navigate('/dashboard'), 1500);
      return () => clearTimeout(t);
    }
  }, [emailVerified, phoneVerified, navigate]);

  const bothDone = emailVerified && phoneVerified;

  return (
    <div className="w-full">
      {/* Back */}
      <button type="button" onClick={() => navigate('/signup')}
        className="flex items-center gap-1.5 mb-5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>Back to Registration</span>
      </button>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-7 h-7 text-[var(--color-success)]" />
          <span className="text-xs font-semibold text-[var(--color-success)]">Registration</span>
        </div>
        <div className="flex-1 h-0.5 bg-[var(--brand-primary)] rounded-full" />
        <div className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center">2</span>
          <span className="text-xs font-semibold text-[var(--brand-primary)]">Verification</span>
        </div>
      </div>

      <div className="flex flex-col items-center mb-6 text-center">
        <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Verify your identity</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Complete both verifications to activate your account
        </p>
      </div>

      {/* Both verified banner */}
      {bothDone && (
        <div className="flex items-center gap-2 p-4 mb-4 rounded-2xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-[var(--color-success)]">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">Account activated!</p>
            <p className="text-xs opacity-80">Redirecting to dashboard…</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* ── A. Email OTP ─────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false}
          className={`p-5 border-2 transition-all ${emailVerified ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]/20' : 'border-[var(--border-subtle)]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${emailVerified ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'}`}>
              {emailVerified ? <CheckCircle2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Email Verification {emailVerified && <span className="text-[var(--color-success)] text-xs ml-1">✓ Verified</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">{maskedEmail}</p>
            </div>
          </div>

          {!emailVerified && (
            <>
              {emailError && (
                <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{emailError}
                </div>
              )}
              <OtpBoxes value={emailOtp} onChange={setEmailOtp} disabled={emailLoading} />
              <Button variant="primary" size="md" className="w-full mt-3" onClick={handleVerifyEmail}
                disabled={emailOtp.join('').length < OTP_LEN} isLoading={emailLoading}>
                Verify Email
              </Button>
              <div className="text-center mt-2">
                {emailTimer.canAct ? (
                  <button type="button" onClick={handleResendEmail}
                    className="text-xs text-[var(--brand-primary)] hover:underline cursor-pointer">
                    Resend email code
                  </button>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    Resend in {String(Math.floor(emailTimer.secs / 60)).padStart(2, '0')}:{String(emailTimer.secs % 60).padStart(2, '0')}
                  </p>
                )}
              </div>
            </>
          )}
        </GlassCard>

        {/* ── B. Phone OTP ─────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false}
          className={`p-5 border-2 transition-all ${phoneVerified ? 'border-[var(--color-success)]/40 bg-[var(--color-success-bg)]/20' : 'border-[var(--border-subtle)]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${phoneVerified ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'}`}>
              {phoneVerified ? <CheckCircle2 className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Mobile Verification {phoneVerified && <span className="text-[var(--color-success)] text-xs ml-1">✓ Verified</span>}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{maskedPhone}</p>
            </div>
          </div>

          {!phoneVerified && (
            <>
              {phoneError && (
                <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{phoneError}
                </div>
              )}
              <OtpBoxes value={phoneOtp} onChange={setPhoneOtp} disabled={phoneLoading} />
              <Button variant="primary" size="md" className="w-full mt-3" onClick={handleVerifyPhone}
                disabled={phoneOtp.join('').length < OTP_LEN || !token} isLoading={phoneLoading}>
                Verify Mobile
              </Button>
              <div className="text-center mt-2">
                {phoneTimer.canAct ? (
                  <button type="button" onClick={handleResendPhone}
                    className="text-xs text-[var(--brand-primary)] hover:underline cursor-pointer">
                    Resend SMS code
                  </button>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    Resend in {String(Math.floor(phoneTimer.secs / 60)).padStart(2, '0')}:{String(phoneTimer.secs % 60).padStart(2, '0')}
                  </p>
                )}
              </div>
            </>
          )}
        </GlassCard>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)] mt-5">
        Both verifications required to activate your account
      </p>
    </div>
  );
}
