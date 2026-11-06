import React, { useState } from 'react';
import { Sliders, Bell, Shield, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useUIStore } from '../../state/useUIStore';
import { ChangePasswordForm } from '../../components/auth/ChangePasswordForm';

export default function SettingsPage() {
  const { theme, notifPrefs, saveNotifPrefs, addToast } = useUIStore();

  // Notification prefs local state
  const [emailAlerts, setEmailAlerts] = useState(notifPrefs.emailAlerts);
  const [targetHitAlerts, setTargetHitAlerts] = useState(notifPrefs.targetHitAlerts);
  const [newFollowerAlerts, setNewFollowerAlerts] = useState(notifPrefs.newFollowerAlerts);

  // Password change panel visibility
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const isDirty =
    emailAlerts !== notifPrefs.emailAlerts ||
    targetHitAlerts !== notifPrefs.targetHitAlerts ||
    newFollowerAlerts !== notifPrefs.newFollowerAlerts;

  const handleSave = () => {
    saveNotifPrefs({ emailAlerts, targetHitAlerts, newFollowerAlerts });
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your notification preferences have been updated and will persist across sessions.',
    });
  };

  const handlePasswordSuccess = () => {
    setShowPasswordForm(false);
    addToast({
      type: 'success',
      title: 'Password Changed',
      message: 'Your password has been changed successfully. You can now log in with your new password.',
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
          Configure your theme, notifications, and account security.
        </p>
      </div>

      <div className="space-y-5">

        {/* ── Appearance ───────────────────────────────────────────────── */}
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
          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
            Theme preference is saved automatically and persists across sessions.
          </p>
        </GlassCard>

        {/* ── Notifications ─────────────────────────────────────────────── */}
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
              {isDirty ? (
                'You have unsaved changes.'
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" />
                  All preferences saved.
                </span>
              )}
            </p>
            <Button variant="primary" onClick={handleSave} disabled={!isDirty}>
              Save Preferences
            </Button>
          </div>
        </GlassCard>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--brand-primary)]" /> Security
          </h3>

          <div className="space-y-3">

            {/* ── Change Password row ─────────────────────────────────── */}
            <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] overflow-hidden">
              {/* Header row — always visible */}
              <div className="flex items-center justify-between p-3.5">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Password</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {showPasswordForm
                      ? 'Fill in the form below to set a new password.'
                      : 'Update your account password. You\'ll need your current password.'}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPasswordForm((v) => !v)}
                  rightIcon={showPasswordForm
                    ? <ChevronUp className="w-3.5 h-3.5" />
                    : <ChevronDown className="w-3.5 h-3.5" />}
                >
                  {showPasswordForm ? 'Cancel' : 'Change Password'}
                </Button>
              </div>

              {/* Expandable form */}
              {showPasswordForm && (
                <div className="px-4 pb-5 border-t border-[var(--border-subtle)]">
                  <ChangePasswordForm
                    onCancel={() => setShowPasswordForm(false)}
                    onSuccess={handlePasswordSuccess}
                  />
                </div>
              )}
            </div>

            {/* ── Active Sessions row ─────────────────────────────────── */}
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
