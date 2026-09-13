import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Sun, Shield, Lock, Sliders } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useUIStore } from '../../state/useUIStore';

export default function SettingsPage() {
  const { theme, toggleTheme, addToast } = useUIStore();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [targetHitAlerts, setTargetHitAlerts] = useState(true);
  const [newFollowerAlerts, setNewFollowerAlerts] = useState(false);

  const handleSave = () => {
    addToast({
      type: 'success',
      title: 'Preferences Saved',
      message: 'Your notification and application preferences have been updated.',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure your theme, notifications, and application preferences.</p>
      </div>

      <div className="space-y-5">
        {/* Appearance Card */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--brand-primary)]" /> Appearance & Theme
          </h3>
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Active Color Theme</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Toggle between Neo Dark and Neo Light mode.</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium text-[var(--text-secondary)]">{theme}</span>
              <ThemeToggle />
            </div>
          </div>
        </GlassCard>

        {/* Notifications Settings Card */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-4 h-4 text-[var(--brand-primary)]" /> Alert Preferences
          </h3>

          <div className="space-y-3">
            {[
              {
                id: 'email',
                title: 'Email Forecast Alerts',
                desc: 'Receive immediate emails when followed analysts publish high-conviction ideas.',
                checked: emailAlerts,
                setter: setEmailAlerts,
              },
              {
                id: 'target',
                title: 'Selling Zone Reached Alerts',
                desc: 'Get instant notifications when predictions in your watchlist reach selling zone levels.',
                checked: targetHitAlerts,
                setter: setTargetHitAlerts,
              },
              {
                id: 'followers',
                title: 'Social & Follower Alerts',
                desc: 'Alerts when other traders follow your profile or comment.',
                checked: newFollowerAlerts,
                setter: setNewFollowerAlerts,
              },
            ].map((item) => (
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
                  onClick={() => item.setter(!item.checked)}
                  className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    item.checked ? 'bg-[var(--brand-primary)]' : 'bg-gray-600/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      item.checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
