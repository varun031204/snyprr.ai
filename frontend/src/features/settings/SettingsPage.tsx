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
function ChangePasswordSection({ addToast }: { addToast: (t: { type: string; title: string; message: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent]     = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setCurrent(''); setNewPw(''); setConfirm('');
    setError(''); setShowCurrent(false); setShowNew(false);
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!current) { setError('Please enter your current password.'); return; }
    if (newPw.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPw === current) { setError('New password must be different from your current password.'); return; }
    if (newPw !== confirm) { setError('Passwords do not match.'); return; }

    if (isSupabasePlaceholder) {
      addToast({ type: 'success', title: 'Password Updated', message: 'Your password has been changed successfully.' });
      reset();
      return;
    }

    setLoading(true);

    // Step 1 — verify current password by re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setError('Unable to verify your identity. Please sign in again.'); setLoading(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });

    if (signInError) {
      setError('Current password is incorrect.');
      setLoading(false);
      return;
    }

    // Step 2 — update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);

    if (updateError) {
      setError(updateError.message ?? 'Failed to update password. Please try again.');
      return;
    }

    addToast({ type: 'success', title: 'Password Changed', message: 'Your password has been updated successfully.' });
    reset();
  };

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-3.5">
        <div>
          <p className="text-xs font-semibold text-[var(--text-primary)]">Password</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {open ? 'Fill in the fields below to update your password.' : 'Change your account password.'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => { setOpen((v) => !v); setError(''); }}
        >
          {open ? 'Cancel' : 'Change Password'}
        </Button>
      </div>

      {/* Inline form — slides in when open */}
      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
          {/* Current password */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Current Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type={showCurrent ? 'text' : 'password'}
                value={current}
                onChange={(e) => { setCurrent(e.target.value); setError(''); }}
                placeholder="Your current password"
                autoComplete="current-password"
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
              <button type="button" onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => { setNewPw(e.target.value); setError(''); }}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="w-full pl-9 pr-10 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all"
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm new password */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Confirm New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type={showNew ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                placeholder="Re-enter new password"
                autoComplete="new-password"
                className={`w-full pl-9 pr-4 py-2 rounded-xl bg-[var(--bg-surface)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all ${
                  confirm && confirm === newPw ? 'border-[var(--color-success)]' : 'border-[var(--border-subtle)]'
                }`}
              />
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
              Update Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
