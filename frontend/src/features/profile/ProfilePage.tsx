import React, { useState } from 'react';
import { UserCircle, Shield, CheckCircle2, Loader2, Phone } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SubscriptionTierBadge } from '../../components/ui/SubscriptionTierBadge';
import { useAuthStore } from '../../state/useAuthStore';
import { useUIStore } from '../../state/useUIStore';
import { profilesUserService } from '../../services/api/profilesService';
import { isSupabasePlaceholder } from '../../lib/supabase';

export default function ProfilePage() {
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [name, setName]     = useState(currentUser?.name  || '');
  const [phone, setPhone]   = useState(currentUser?.phone || '');
  const [bio, setBio]       = useState(currentUser?.bio   || '');
  const [twoFactor, setTwoFactor] = useState(currentUser?.twoFactorEnabled || false);
  const [isSaving, setIsSaving]   = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const validatePhone = (val: string) => {
    if (!val.trim()) return '';          // phone is optional on profile edit
    if (!/^[+]?[\d\s\-()]{10,15}$/.test(val.trim())) return 'Enter a valid phone number (10–15 digits)';
    return '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const err = validatePhone(phone);
    if (err) { setPhoneError(err); return; }
    setPhoneError('');
    setIsSaving(true);

    // DEV BYPASS
    if (isSupabasePlaceholder) {
      useAuthStore.setState((state) => ({
        currentUser: state.currentUser
          ? { ...state.currentUser, name, phone: phone || undefined, bio, twoFactorEnabled: twoFactor }
          : null,
      }));
      setIsSaving(false);
      addToast({ type: 'success', title: 'Profile Updated', message: 'Your information has been saved.' });
      return;
    }

    try {
      const result = await profilesUserService.updateProfile({
        full_name: name,
        phone: phone.trim() || null,
        bio: bio || null,
      });

      if (result.data) {
        useAuthStore.setState((state) => ({
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                name:             result.data.name,
                phone:            result.data.phone,
                bio:              result.data.bio,
                twoFactorEnabled: twoFactor,
              }
            : null,
        }));
      }

      addToast({ type: 'success', title: 'Profile Updated', message: 'Your personal information has been saved successfully.' });
    } catch (err: any) {
      addToast({ type: 'danger', title: 'Update Failed', message: err?.message || 'Could not save profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Profile & Security</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account information and preferences.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-6">

          {/* ── Avatar & Role Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[var(--border-subtle)]">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {currentUser?.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[var(--brand-primary)]/40 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[var(--brand-glow)] flex items-center justify-center ring-2 ring-[var(--brand-primary)]/40 shadow-md">
                  <UserCircle className="w-12 h-12 text-[var(--brand-primary)]" />
                </div>
              )}
              <SubscriptionTierBadge tier={currentUser?.subscriptionTier || 'FREE'} size="md" />
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{name || currentUser?.name}</h2>
              <p className="text-xs text-[var(--text-muted)]">{currentUser?.email}</p>
              {/* Contact number shown in header if available */}
              {currentUser?.phone && (
                <p className="text-xs text-[var(--text-muted)] flex items-center justify-center sm:justify-start gap-1">
                  <Phone className="w-3 h-3" /> {currentUser.phone}
                </p>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--brand-glow)] text-[var(--brand-primary)] font-semibold">
                  {activeRole}
                </span>
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-success)]" /> Verified Account
                </span>
              </div>
            </div>
          </div>

          {/* ── Form Fields ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              value={currentUser?.email || ''}
              disabled
              helperText="Contact support to change your email address."
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                placeholder="+91 98765 43210"
                autoComplete="tel"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-all ${
                  phoneError ? 'border-[var(--color-danger)]' : 'border-[var(--border-subtle)] focus:border-[var(--brand-primary)]'
                }`}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-[var(--color-danger)]">{phoneError}</p>
            )}
            {!phoneError && (
              <p className="text-[11px] text-[var(--text-muted)]">Used for account recovery and important notifications.</p>
            )}
          </div>

          {/* Biography */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Biography</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself..."
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none transition-all"
            />
          </div>

          {/* ── Security & 2FA ── */}
          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--brand-primary)]" /> Security & 2FA
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">Two-Factor Authentication (2FA)</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Secure your account with authenticator app codes.</p>
              </div>
              <button
                type="button"
                onClick={() => setTwoFactor((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  twoFactor
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
                }`}
              >
                {twoFactor ? 'Enabled ✓' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-[11px] text-[var(--text-muted)]">
              Changes are saved to your account immediately.
            </p>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              leftIcon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
