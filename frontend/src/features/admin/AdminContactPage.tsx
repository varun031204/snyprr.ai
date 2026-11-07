import React, { useState } from 'react';
import {
  MessageSquare, Search, ChevronDown, ChevronUp,
  Clock, CheckCircle2, AlertCircle, Ban, RefreshCw, Mail,
} from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminContacts, useUpdateContactStatus } from '../../hooks/useContactQuery';
import { useUIStore } from '../../state/useUIStore';
import type { ContactMessage } from '../../services/api/contactService';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ContactMessage['status'], { label: string; icon: React.ReactNode; cls: string }> = {
  NEW:         { label: 'New',         icon: <Clock className="w-3 h-3" />,        cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  IN_PROGRESS: { label: 'In Progress', icon: <RefreshCw className="w-3 h-3" />,    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  RESOLVED:    { label: 'Resolved',    icon: <CheckCircle2 className="w-3 h-3" />, cls: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success)]/30' },
  SPAM:        { label: 'Spam',        icon: <Ban className="w-3 h-3" />,           cls: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger)]/30' },
};

const CATEGORY_LABELS: Record<string, string> = {
  GENERAL:      'General',
  TECHNICAL:    'Technical',
  SUBSCRIPTION: 'Subscription',
  PARTNERSHIP:  'Partnership',
  VERIFICATION: 'Verification',
  FEEDBACK:     'Feedback',
  DEV_TEAM:     'Dev Team',
};

function StatusBadge({ status }: { status: ContactMessage['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminContactPage() {
  const { addToast } = useUIStore();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalMsg, setModalMsg] = useState<ContactMessage | null>(null);
  const [newStatus, setNewStatus] = useState<ContactMessage['status']>('NEW');
  const [adminNotes, setAdminNotes] = useState('');

  const { data, isLoading, refetch } = useAdminContacts({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    category: categoryFilter === 'ALL' ? undefined : categoryFilter,
    limit: 100,
  });
  const updateMutation = useUpdateContactStatus();

  const messages = data?.data ?? [];

  // Client-side search on top of server-side filters
  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.subject.toLowerCase().includes(q) ||
      m.message.toLowerCase().includes(q)
    );
  });

  const newCount = messages.filter((m) => m.status === 'NEW').length;

  const openModal = (msg: ContactMessage) => {
    setModalMsg(msg);
    setNewStatus(msg.status);
    setAdminNotes(msg.admin_notes ?? '');
  };

  const handleUpdate = async () => {
    if (!modalMsg) return;
    try {
      await updateMutation.mutateAsync({ id: modalMsg.id, status: newStatus, adminNotes });
      addToast({ type: 'success', title: 'Updated', message: `Status changed to ${STATUS_CONFIG[newStatus].label}.` });
      setModalMsg(null);
    } catch {
      addToast({ type: 'danger', title: 'Failed', message: 'Could not update message status.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[var(--brand-primary)]" />
            Contact Messages
            {newCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--brand-primary)] text-white">
                {newCount} new
              </span>
            )}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            All support and contact form submissions from users and the public.
          </p>
        </div>
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name, email, subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="SPAM">Spam</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* Message list */}
      <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <MessageSquare className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No messages found</p>
            <p className="text-xs text-[var(--text-muted)]">Adjust the filters or check back later.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((msg) => {
              const isExpanded = expandedId === msg.id;
              return (
                <div key={msg.id} className="hover:bg-[var(--bg-secondary)]/30 transition-colors">
                  {/* Row summary */}
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                  >
                    {/* Unread dot */}
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${msg.status === 'NEW' ? 'bg-[var(--brand-primary)]' : 'bg-transparent'}`} />

                    {/* Sender */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{msg.name}</p>
                        <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                          {CATEGORY_LABELS[msg.category] ?? msg.category}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">{msg.source}</span>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        <span className="font-medium text-[var(--text-secondary)]">{msg.subject}</span>
                        {' — '}{msg.message.slice(0, 80)}{msg.message.length > 80 ? '…' : ''}
                      </p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={msg.status} />
                      <p className="text-[10px] text-[var(--text-muted)] tabular-nums hidden sm:block">
                        {new Date(msg.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                        : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                      }
                    </div>
                  </div>

                  {/* Expanded body */}
                  {isExpanded && (
                    <div className="px-10 pb-4 space-y-4 bg-[var(--bg-secondary)]/20">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[var(--text-muted)] mb-0.5">From</p>
                          <a href={`mailto:${msg.email}`} className="text-[var(--brand-primary)] hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {msg.email}
                          </a>
                        </div>
                        <div>
                          <p className="text-[var(--text-muted)] mb-0.5">Received</p>
                          <p className="text-[var(--text-secondary)]">
                            {new Date(msg.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </div>

                      {msg.admin_notes && (
                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
                          <span className="font-semibold">Admin notes: </span>{msg.admin_notes}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 flex-wrap">
                        <Button size="sm" variant="primary" onClick={() => openModal(msg)}>
                          Update Status
                        </Button>
                        <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" leftIcon={<Mail className="w-3.5 h-3.5" />}>
                            Reply via Email
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]">
            Showing {filtered.length} of {data?.total ?? 0} messages
          </div>
        )}
      </GlassCard>

      {/* Update Status Modal */}
      <Modal
        isOpen={Boolean(modalMsg)}
        onClose={() => setModalMsg(null)}
        title="Update Message Status"
        maxWidth="sm"
      >
        {modalMsg && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] text-xs space-y-1">
              <p className="font-semibold text-[var(--text-primary)]">{modalMsg.subject}</p>
              <p className="text-[var(--text-muted)]">{modalMsg.name} · {modalMsg.email}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STATUS_CONFIG) as ContactMessage['status'][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      newStatus === s
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-glow)] text-[var(--brand-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]/40'
                    }`}
                  >
                    {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Admin Notes <span className="text-[var(--text-muted)] font-normal">(optional — internal only)</span>
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Replied via email, refund processed, escalated to dev team…"
                className="w-full bg-[var(--bg-surface)] text-xs text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" onClick={() => setModalMsg(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdate} isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
