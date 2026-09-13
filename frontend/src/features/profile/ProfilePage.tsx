import React, { useState } from 'react';
import { UserCircle, Mail, Shield, Key, Bell, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SubscriptionTierBadge } from '../../components/ui/SubscriptionTierBadge';
import { useAuthStore } from '../../state/useAuthStore';
import { useUIStore } from '../../state/useUIStore';

export default function ProfilePage() {
  const { currentUser, activeRole } = useAuthStore();
  const { addToast } = useUIStore();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [twoFactor, setTwoFactor] = useState(currentUser?.twoFactorEnabled || false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Profile Updated',
      message: 'Your personal information and preferences have been saved.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Profile & Security</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account information and preferences.</p>
      </div>

      <GlassCard hoverEffect={false} className="p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar & Role Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-[var(--border-subtle)]">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'}
                alt={currentUser?.name}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-[var(--brand-primary)]/40 shadow-md"
              />
              <SubscriptionTierBadge tier={currentUser?.subscriptionTier || 'PRO'} size="md" />
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{currentUser?.name}</h2>
              <p className="text-xs text-[var(--text-muted)]">{currentUser?.email}</p>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">Biography</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {/* Security & 2FA */}
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
                onClick={() => setTwoFactor(!twoFactor)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  twoFactor
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/30'
                    : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                }`}
              >
                {twoFactor ? 'Enabled ✓' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary">
              Save Changes
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
