import React, { useState } from 'react';
import { Settings, Shield, Cpu, Save } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useUIStore } from '../../state/useUIStore';

interface ToggleProps {
  enabled: boolean;
  onChange: () => void;
  danger?: boolean;
}

function Toggle({ enabled, onChange, danger }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        enabled
          ? danger
            ? 'bg-[var(--color-danger)]'
            : 'bg-[var(--brand-primary)]'
          : 'bg-[var(--border-subtle)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const { addToast } = useUIStore();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowPublicRegistrations, setAllowPublicRegistrations] = useState(true);
  const [autoVerifyThreshold, setAutoVerifyThreshold] = useState('75.0');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Platform configuration has been updated.',
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Configuration</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Configure security policies, verification thresholds, and platform-wide states.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* System State */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[var(--brand-primary)]" />
            System Availability
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Maintenance Mode</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Temporarily disable prediction submission for non-admin users.</p>
              </div>
              <Toggle enabled={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} danger />
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">Public Registrations</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Allow new users to sign up via the public registration page.</p>
              </div>
              <Toggle enabled={allowPublicRegistrations} onChange={() => setAllowPublicRegistrations(!allowPublicRegistrations)} />
            </div>
          </div>
        </GlassCard>

        {/* Verification Thresholds */}
        <GlassCard hoverEffect={false} className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
            Automated Quality Thresholds
          </h3>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
              Minimum Win Rate for Auto-Verification Badge (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={autoVerifyThreshold}
              onChange={(e) => setAutoVerifyThreshold(e.target.value)}
              className="w-full max-w-xs bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] tabular-nums"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
              Analysts maintaining win rates above this threshold over 20+ forecasts are flagged for priority verification.
            </p>
          </div>
        </GlassCard>

        <div className="flex justify-end">
          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
