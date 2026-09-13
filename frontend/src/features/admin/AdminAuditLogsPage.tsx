import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminAuditLogs } from '../../hooks/useAdminQuery';

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const { data, isLoading } = useAdminAuditLogs();
  const logs = data?.data || [];

  const filtered = logs.filter((l) => {
    const matchesAction = actionFilter === 'ALL' || l.action === actionFilter;
    const matchesSearch =
      l.actorName.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security & Activity Audit Logs</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Immutable event log of administrative actions, role assignments, and platform moderation.</p>
      </div>

      {/* Filters */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by actor, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="ALL">All Actions</option>
            <option value="VERIFY_TRADER_PROFILE">Verify Trader</option>
            <option value="ROLE_CHANGE">Role Change</option>
            <option value="MODERATE_PREDICTION">Moderate Prediction</option>
          </select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Target</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors align-middle">
                    <td className="py-3 px-4 text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">{log.actorName}</p>
                      <p className="text-[10px] text-[var(--brand-primary)]">[{log.actorRole}]</p>
                    </td>
                    <td className="py-3 px-4 font-bold text-[var(--brand-primary)] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">
                      {log.targetType}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-[240px] truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
