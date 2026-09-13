import React, { useState } from 'react';
import { ShieldCheck, UserCheck, Sparkles, Globe, Send, Save, Crown } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../state/useAuthStore';
import { useUIStore } from '../../state/useUIStore';

export default function TraderSettingsPage() {
  const { currentUser } = useAuthStore();
  const { addToast } = useUIStore();

  const [displayName, setDisplayName] = useState(currentUser?.name || 'Satoshi Wave');
  const [handle, setHandle] = useState('@satoshiwave');
  const [bio, setBio] = useState('Macro crypto strategist & SMC practitioner with 8+ years experience in high-tf order flow analysis.');
  const [markets, setMarkets] = useState('BTC/USDT, ETH/USDT, SOL/USDT');
  const [twitter, setTwitter] = useState('satoshiwave');
  const [telegram, setTelegram] = useState('satoshitrade');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Trader Profile Updated',
      message: 'Your public analyst profile and subscription settings have been updated.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trader Profile & Tier Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Customize your public presence in the Verified Analysts Directory.
        </p>
      </div>

      <GlassCard hoverEffect={false} className="p-6 md:p-8">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center gap-5 pb-6 border-b border-[var(--border-subtle)]">
            <div className="relative">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'}
                alt={displayName}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--brand-primary)]/40"
              />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center ring-2 ring-[var(--bg-surface)]">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{displayName}</h2>
              <p className="text-xs text-[var(--text-muted)]">{handle} · Verified Analyst</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Public Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              label="Profile Handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[var(--text-secondary)]">
              Trader Bio & Methodology
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <Input
            label="Featured Markets (comma separated)"
            value={markets}
            onChange={(e) => setMarkets(e.target.value)}
            helperText="e.g. BTC/USDT, ETH/USDT, SOL/USDT, GOLD"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Twitter / X Handle"
              placeholder="username"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              leftIcon={<Globe className="w-4 h-4 text-[#1DA1F2]" />}
            />
            <Input
              label="Telegram Channel / Handle"
              placeholder="channelname"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              leftIcon={<Send className="w-4 h-4 text-[#0088cc]" />}
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
            <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
              Save Profile
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
