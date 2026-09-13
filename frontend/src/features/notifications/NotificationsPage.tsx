import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, TrendingUp, Sparkles, AlertCircle, Users } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '../../hooks/useNotificationsQuery';
import { type NotificationItem } from '../../types';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filterType, setFilterType] = useState<string>('ALL');

  const { data, isLoading } = useNotifications();
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllMutation = useMarkAllNotificationsAsRead();

  const notifications = data?.data || [];

  const filtered = notifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.read;
    if (filterType === 'PREDICTIONS') return n.type.includes('PREDICTION');
    return true;
  });

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'PREDICTION_PUBLISHED':
        return <TrendingUp className="w-5 h-5 text-[var(--color-info)]" />;
      case 'PREDICTION_STATUS_CHANGE':
        return <Sparkles className="w-5 h-5 text-[var(--color-success)]" />;
      case 'NEW_FOLLOWER':
        return <Users className="w-5 h-5 text-[var(--brand-primary)]" />;
      default:
        return <AlertCircle className="w-5 h-5 text-[var(--color-warning)]" />;
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsReadMutation.mutate(item.id);
    }
    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Notifications</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Stay updated with newly published predictions and target hit alerts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<CheckCheck className="w-4 h-4" />}
          onClick={() => markAllMutation.mutate()}
          isLoading={markAllMutation.isPending}
        >
          Mark all as read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'ALL', label: 'All Alerts' },
          { key: 'UNREAD', label: 'Unread Only' },
          { key: 'PREDICTIONS', label: 'Predictions' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterType === tab.key
                ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="You're all caught up! New alerts from followed traders will appear here."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <GlassCard
              key={item.id}
              className={`flex items-start gap-4 p-4 cursor-pointer transition-all ${
                !item.read ? 'border-[var(--brand-primary)]/50 bg-[var(--brand-glow)]/10' : ''
              }`}
              onClick={() => handleItemClick(item)}
            >
              <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] flex-shrink-0 mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h4>
                  <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.message}</p>
              </div>

              {!item.read && (
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--brand-primary)] flex-shrink-0 mt-2" />
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
