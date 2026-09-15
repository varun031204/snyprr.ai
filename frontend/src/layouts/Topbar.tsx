import { Bell, Menu, Search, UserCircle, ChevronDown, Home, Mail, Coins } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { SubscriptionTierBadge } from '../components/ui/SubscriptionTierBadge';
import { InlineSearch } from '../components/search/InlineSearch';
import { useAuthStore } from '../state/useAuthStore';
import { useUIStore } from '../state/useUIStore';
import { useNotifications, useMarkAllNotificationsAsRead } from '../hooks/useNotificationsQuery';
import { usePaperTradingStore } from '../state/usePaperTradingStore';
import { UserRole } from '../types';

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'User',
  TRADER: 'Trader',
  ADMIN: 'Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  USER: 'text-[var(--color-info)]',
  TRADER: 'text-[var(--brand-primary)]',
  ADMIN: 'text-[var(--color-warning)]',
};

export const Topbar: React.FC = () => {
  const { currentUser, activeRole, switchRoleDemo, logout } = useAuthStore();
  const { toggleSidebar, toggleGlobalSearch } = useUIStore();
  const { data: notificationsData } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const unreadCount = notificationsData?.data?.filter((n) => !n.read).length || 0;
  const { balance } = usePaperTradingStore();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setRoleMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleGlobalSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleGlobalSearch]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-3 sm:px-4 h-16 bg-[var(--bg-secondary)]/90 backdrop-blur-xl border-b border-[var(--border-subtle)] w-full">

      {/* Left: hamburger — only show on mobile/tablet where sidebar is hidden (< lg = 1024px) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleSidebar}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Centre: Search bar */}
      <div className="flex-1 flex justify-center px-2 sm:px-4 min-w-0">
        <InlineSearch />
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* DEV-only Role Switcher */}
        {import.meta.env.DEV && (
          <div className="hidden xl:flex items-center gap-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl px-2 py-1">
            <span className="text-[10px] text-[var(--text-muted)] font-medium mr-1">DEV:</span>
            {(['USER', 'TRADER', 'ADMIN'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  switchRoleDemo(r);
                  if (r === 'ADMIN') navigate('/admin');
                  else if (r === 'TRADER') navigate('/trader/dashboard');
                  else navigate('/dashboard');
                }}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all ${activeRole === r
                  ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}

        {/* Mobile Search */}
        <button
          onClick={toggleGlobalSearch}
          className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all"
          aria-label="Search"
          title="Search"
        >
          <Search className="w-4.5 h-4.5" />
        </button>

        {/* Paper Trading Balance — USER only */}
        {activeRole === 'USER' && (
        <button
          type="button"
          onClick={() => navigate('/dashboard?paper=1')}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all cursor-pointer"
          title="Paper Trading"
        >
          <Coins className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0" />
          <span className="text-xs font-bold font-mono-num text-[var(--color-warning)]">${balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </button>
        )}

        {/* Home */}
        <Link
          to={activeRole === 'ADMIN' ? '/admin' : activeRole === 'TRADER' ? '/trader/dashboard' : '/dashboard'}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all"
          aria-label="Home Dashboard"
          title="Home Dashboard"
        >
          <Home className="w-4.5 h-4.5" />
        </Link>

        {/* Notifications */}
        <Link
          to="/notifications"
          onClick={() => {
            if (unreadCount > 0) markAllAsRead.mutate();
          }}
          className="w-9 h-9 rounded-xl relative flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--bg-secondary)]" />
          )}
        </Link>

        <ThemeToggle />

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setRoleMenuOpen(false); }}
            className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all"
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-[var(--brand-primary)]/40">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-[var(--text-muted)]" />
              )}
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-[var(--text-primary)] leading-none">{currentUser?.name?.split(' ')[0]}</p>
              <p className={`text-[10px] font-medium mt-px ${ROLE_COLORS[activeRole]}`}>{ROLE_LABELS[activeRole]}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>

          {profileOpen && (
            <div
              role="menu"
              aria-label="Profile menu"
              className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl py-2 z-50"
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  // Trap focus inside the dropdown
                  const focusable = Array.from(
                    e.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
                  );
                  if (focusable.length === 0) return;
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (e.shiftKey) {
                    if (document.activeElement === first) {
                      e.preventDefault();
                      last.focus();
                    }
                  } else {
                    if (document.activeElement === last) {
                      e.preventDefault();
                      first.focus();
                    }
                  }
                }
              }}
            >
              <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] mb-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{currentUser?.name}</p>
                  <SubscriptionTierBadge tier={currentUser?.subscriptionTier || 'PRO'} size="sm" />
                </div>
                <p className="text-xs text-[var(--text-muted)] truncate">{currentUser?.email}</p>
              </div>
              <Link
                to="/profile"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors focus:outline-none focus:bg-[var(--bg-secondary)]"
              >
                <UserCircle className="w-4 h-4" /> Profile
              </Link>

              <Link
                to="/contact"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors focus:outline-none focus:bg-[var(--bg-secondary)]"
              >
                <Mail className="w-4 h-4" /> Contact Us
              </Link>

              <button
                role="menuitem"
                onClick={() => { logout(); navigate('/login'); setProfileOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors rounded-b-2xl focus:outline-none focus:bg-[var(--color-danger-bg)]"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
