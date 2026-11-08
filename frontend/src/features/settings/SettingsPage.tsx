import React, { useState } from 'react';
import { Sliders, Bell, Shield, CheckCircle2, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useUIStore } from '../../state/useUIStore';
import { supabase, isSupabasePlaceholder } from '../../lib/supabase';

export default function SettingsPage() {
  const { theme, notifPrefs, saveNotifPrefs, addToast } = useUIStore();

  // Local state mirrors the persisted prefs — only saved when user clicks "Save Preferences"
  const [emailAlerts, setEmailAlerts] = useState(notifPrefs.emailAlerts);
  const [targetHitAlerts, setTargetHitAlerts] = useState(notifPrefs.targetHitAlerts);
  const [newFollowerAlerts, setNewFollowerAlerts] = useState(notifPrefs.newFollowerAlerts);

  // Track whether anything has actually changed
  const isDirty =
    emailAlerts !== notifPrefs.emailAlerts ||
    targetHitAlerts !== notifPrefs.targetHitAlerts ||
    newFollowerAlerts !== notifPrefs.newFollowerAlerts;

  const handleSave = () => {
    // Persist to localStorage via the store
    saveNotifPrefs({ emailAlerts, targetHitAlerts, newFollowerAlerts });
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your notification preferences have been updated and will persist across sessions.',
    });
  };

  const toggleItems = [
    {
      id: 'email',
      title: 'Email Forecast Alerts',
      desc: 'Receive immediate emails when followed analysts publish high-conviction ideas.',
      checked: emailAlerts,
      onChange: () => setEmailAlerts((v) => !v),
    },
    {
      id: 'target',
      title: 'Selling Zone Reached Alerts',
      desc: 'Get instant notifications when predictions in your watchlist reach selling zone levels.',
      checked: targetHitAlerts,
      onChange: () => setTargetHitAlerts((v) => !v),
    },
    {
      id: 'followers',
      title: 'Social & Follower Alerts',
      desc: 'Alerts when other traders follow your profile or comment.',
      checked: newFollowerAlerts,
      onChange: () => setNewFollowerAlerts((v) => !v),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Configure your theme, notifications, and application preferences.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── Appearance ─────────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--brand-primary)]" /> Appearance & Theme
          </h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Active Color Theme</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Toggle between Neo Dark and Neo Light mode. Saved automatically.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">{theme}</span>
              <ThemeToggle />
            </div>
          </div>
          {/* Theme saves automatically — no Save button needed */}
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
            Theme preference is saved automatically and persists across sessions.
          </p>
        </GlassCard>

        {/* ── Notifications ──────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--brand-primary)]" /> Alert Preferences
          </h3>

          <div className="space-y-3">
            {toggleItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
              >
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{item.desc}</p>
                </div>
                <button
                  type="button"
                  onClick={item.onChange}
                  aria-checked={item.checked}
                  role="switch"
                  className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer ${
                    item.checked ? 'bg-[var(--brand-primary)]' : 'bg-gray-600/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                      item.checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
            <p className="text-[11px] text-[var(--text-muted)]">
              {isDirty
                ? 'You have unsaved changes.'
                : (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                    All preferences saved.
                  </span>
                )}
            </p>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!isDirty}
            >
              Save Preferences
            </Button>
          </div>
        </GlassCard>

        {/* ── Security ───────────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--brand-primary)]" /> Security
          </h3>
          <div className="space-y-3">

            {/* ── Change Password ── */}
            <ChangePasswordSection addToast={addToast} />

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Active Sessions</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  View and revoke devices signed into your account.
                </p>
              </div>
              <Button variant="secondary" size="sm" disabled>
                Manage Sessions
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

// ── Change Password sub-component ────────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:4000';

function ChangePasswordSection({ addToast }: { addToast: (t: { type: string; title: string; message: string }) => void }) {
  const [open, setOpen]           = useState(false);
  const [step, setStep]           = useState<'form' | 'otp'>('form');

  // Step 1 state
  const [current, setCurrent]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  // Step 2 state
  const [otp, setOtp]             = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent(''); setNewPw(''); setConfirm(''); setOtp('');
    setError(''); setShowCurrent(false); setShowNew(false);
    setStep('form'); setOpen(false);
  };

  // ── Step 1: validate + send OTP ──────────────────────────────────────────
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!current)              { setError('Please enter your current password.'); return; }
    if (newPw.length < 8)      { setError('New password must be at least 8 characters.'); return; }
    if (newPw === current)     { setError('New password must be different from your current password.'); return; }
    if (newPw !== confirm)     { setError('Passwords do not match.'); return; }

    if (isSupabasePlaceholder) {
      // Dev bypass — skip OTP and pretend it worked
      addToast({ type: 'success', title: 'Password Updated (dev)', message: 'Password change simulated in dev mode.' });
      reset();
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Session expired. Please sign in again.'); setLoading(false); return; }

      const res = await fetch(`${API_BASE}/api/auth/password-change-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Could not send OTP. Please try again.'); setLoading(false); return; }

      // Mask the email for display: ab•••••yz@domain.com
      const email = session?.user?.email ?? '';
      const [local, domain] = email.split('@');
      setMaskedEmail(local.slice(0, 2) + '•'.repeat(Math.max(1, local.length - 4)) + local.slice(-2) + '@' + domain);

      setStep('otp');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otp.replace(/\D/g, '').length !== 6) { setError('Enter the 6-digit code sent to your email.'); return; }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Session expired. Please sign in again.'); setLoading(false); return; }

      const res = await fetch(`${API_BASE}/api/auth/verify-password-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ otp: otp.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Invalid code. Please try again.'); setLoading(false); return; }

      addToast({ type: 'success', title: 'Password Changed', message: 'Your password has been updated successfully.' });
      reset();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between p-3.5">
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">Password</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {open && step === 'otp'
              ? `Enter the 6-digit code sent to ${maskedEmail}`
              : open
              ? 'Fill in the fields below to update your password.'
              : 'Change your account password.'}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => { setOpen((v) => !v); setError(''); setStep('form'); }}>
          {open ? 'Cancel' : 'Change Password'}
        </Button>
      </div>

      {/* ── Step 1: Password form ── */}
      {open && step === 'form' && (
        <form onSubmit={handleRequestOtp} className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input type={showCurrent ? 'text' : 'password'} value={current}
                onChange={(e) => { setCurrent(e.target.value); setError(''); }}
                placeholder="Your current password" autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all" />
              <button type="button" onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input type={showNew ? 'text' : 'password'} value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setError(''); }}
                placeholder="Min. 8 characters" autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all" />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input type={showNew ? 'text' : 'password'} value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Re-enter new password" autoComplete="new-password"
                className={`w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all ${
                  confirm && confirm === newPw ? 'border-[var(--color-success)]' : 'border-[var(--border-subtle)]'
                }`} />
              {confirm && confirm === newPw && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-success)]" />
              )}
            </div>
          </div>

          {error && (
            <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}

          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="sm" isLoading={loading}>
              Send Verification Code
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2: OTP verification ── */}
      {open && step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="px-4 pb-4 space-y-4 border-t border-[var(--border-subtle)] pt-4">

          <div className="p-3 rounded-xl bg-[var(--brand-glow)]/20 border border-[var(--brand-primary)]/30 text-xs text-[var(--brand-primary)] flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>A 6-digit code was sent to <strong>{maskedEmail}</strong>. Valid for 10 minutes.</span>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Verification Code</label>
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
              className="w-full text-center text-2xl font-bold tracking-[0.4em] py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <button type="button"
              onClick={() => { setStep('form'); setOtp(''); setError(''); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
              ← Back
            </button>
            <Button type="submit" variant="primary" size="sm" isLoading={loading}
              disabled={otp.length !== 6}>
              Verify & Update Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
