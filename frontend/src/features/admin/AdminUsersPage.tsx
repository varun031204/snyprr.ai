import React, { useState } from 'react';
import { Search, Edit2, UserCircle } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAdminUsers, useUpdateUserRole } from '../../hooks/useAdminQuery';
import { useUIStore } from '../../state/useUIStore';
import { type User, type UserRole } from '../../types';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('USER');

  const { data, isLoading } = useAdminUsers();
  const updateRoleMutation = useUpdateUserRole();
  const { addToast } = useUIStore();

  const users = data?.data || [];

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const handleOpenRoleModal = (user: User) => {
    setSelectedUser(user);
    setNewRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    try {
      await updateRoleMutation.mutateAsync({ userId: selectedUser.id, role: newRole });
      addToast({ type: 'success', title: 'Role Updated', message: `${selectedUser.name}'s role changed to ${newRole}.` });
      setSelectedUser(null);
    } catch {
      addToast({ type: 'danger', title: 'Update Failed', message: 'Could not change user role.' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">User Management</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Review platform accounts, permissions, and assign RBAC roles.</p>
      </div>

      {/* Filter Bar */}
      <GlassCard className="p-4" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          >
            <option value="ALL">All Roles</option>
            <option value="USER">User</option>
            <option value="TRADER">Trader</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
      </GlassCard>

      {/* Users Table */}
      <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--bg-secondary)]/50 border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <tr>
                  <th className="py-3 px-4 font-semibold">User</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Security</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--bg-secondary)]/40 transition-colors align-middle">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center flex-shrink-0">
                            <UserCircle className="w-5 h-5 text-[var(--text-muted)]" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{user.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        user.role === 'ADMIN'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : user.role === 'TRADER'
                          ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border-[var(--brand-primary)]/30'
                          : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-[10px] text-[var(--text-muted)]">
                      {user.twoFactorEnabled ? '2FA Enabled ✓' : 'Standard'}
                    </td>

                    <td className="py-3 px-4 text-[var(--text-muted)] tabular-nums">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenRoleModal(user)}
                      >
                        Edit Role
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Role Change Modal */}
      <Modal isOpen={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="Change User Role" maxWidth="sm">
        {selectedUser && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Target User</p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-0.5">{selectedUser.name} <span className="font-normal text-[var(--text-muted)]">({selectedUser.email})</span></p>
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-2">Assign New Role</label>
              <div className="space-y-2">
                {(['USER', 'TRADER', 'ADMIN'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setNewRole(r)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all text-xs ${
                      newRole === r
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-glow)] text-[var(--brand-primary)] font-bold'
                        : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]/50'
                    }`}
                  >
                    <span>{r}</span>
                    {newRole === r && <span className="text-[10px]">Selected ✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveRole} isLoading={updateRoleMutation.isPending}>Save Role</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
