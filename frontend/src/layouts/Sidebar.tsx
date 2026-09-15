import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Users,
  BarChart2, BookOpen, Settings, LogOut, ShieldCheck,
  Menu, PenSquare, UserCircle,
  CreditCard, Briefcase, Code2, Newspaper, FlaskConical
} from 'lucide-react';
import { useAuthStore } from '../state/useAuthStore';
import { useUIStore } from '../state/useUIStore';
import { Logo } from '../components/ui/Logo';
import { useNotifications, useMarkAllNotificationsAsRead } from '../hooks/useNotificationsQuery';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const userNav: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Predictions', path: '/predictions', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'News', path: '/news', icon: <Newspaper className="w-5 h-5" /> },
  { label: 'My Trades', path: '/my-trades', icon: <Briefcase className="w-5 h-5" /> },
  { label: 'Paper Trading', path: '/paper-trading', icon: <FlaskConical className="w-5 h-5" /> },
  { label: 'Subscriptions', path: '/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
];

const traderNav: NavItem[] = [
  { label: 'Dashboard', path: '/trader/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'My Predictions', path: '/trader/predictions', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'News', path: '/news', icon: <Newspaper className="w-5 h-5" /> },
  { label: 'Contact Developer Team', path: '/contact?dept=dev', icon: <Code2 className="w-5 h-5" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { label: 'Users', path: '/admin/users', icon: <Users className="w-5 h-5" /> },
  { label: 'Traders', path: '/admin/traders', icon: <ShieldCheck className="w-5 h-5" /> },
  { label: 'Predictions', path: '/admin/predictions', icon: <TrendingUp className="w-5 h-5" /> },
  { label: 'Subscriptions', path: '/admin/subscriptions', icon: <CreditCard className="w-5 h-5" /> },
  { label: 'Analytics', path: '/admin/analytics', icon: <BarChart2 className="w-5 h-5" /> },
  { label: 'Audit Logs', path: '/admin/audit-logs', icon: <BookOpen className="w-5 h-5" /> },
];

export const Sidebar: React.FC = () => {
  const { activeRole, currentUser, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen, toggleSidebar } = useUIStore();
  const { data: notificationsData } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const unreadCount = notificationsData?.data?.filter((n) => !n.read).length || 0;
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = activeRole === 'ADMIN' ? adminNav : activeRole === 'TRADER' ? traderNav : userNav;

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/dashboard' && path !== '/admin' && location.pathname.startsWith(path));

  // Auto-close sidebar on small screens when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname, setSidebarOpen]);

  // Handle window resize to avoid stuck overlay in half-screen mode
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && sidebarOpen) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, setSidebarOpen]);

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Aside */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] transition-all duration-300 ease-in-out select-none
          ${sidebarOpen
            ? 'w-64 translate-x-0 shadow-2xl md:shadow-none'
            : '-translate-x-full w-64 md:translate-x-0 md:w-16'
          } overflow-hidden md:overflow-visible`}
      >
        {/* Brand Header */}
        {sidebarOpen ? (
          /* ── EXPANDED: hamburger | wordmark in one row ── */
          <div className="flex items-center gap-2 px-3 border-b border-[var(--border-subtle)] h-16 flex-shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center flex-shrink-0 focus:outline-none"
              title="Collapse Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link
              to="/dashboard"
              onClick={() => { if (window.innerWidth < 768) setSidebarOpen(false); }}
              className="flex items-center gap-2 overflow-hidden group focus:outline-none min-w-0 flex-1"
            >
              <div className="overflow-hidden min-w-0 flex flex-col">
                <Logo className="h-8 w-auto object-contain object-left" />
                <p className="text-[9px] font-bold text-[var(--brand-primary)] tracking-wider uppercase whitespace-nowrap">
                  {activeRole} PORTAL
                </p>
              </div>
            </Link>
          </div>

        ) : (
          /* ── COLLAPSED: only hamburger ── */
          <div className="flex flex-col items-center border-b border-[var(--border-subtle)] h-16 justify-center flex-shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all flex items-center justify-center focus:outline-none"
              title="Expand Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

        )}


        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1.5 scrollbar-thin">
          {/* Quick Create CTA for Traders */}
          {activeRole === 'TRADER' && (
            <button
              onClick={() => {
                navigate('/trader/predictions/create');
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              title="Create Prediction"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-vivid)] hover:opacity-95 shadow-md shadow-[var(--brand-glow)] transition-all mb-3 ${!sidebarOpen ? 'md:justify-center md:px-0' : ''
                }`}
            >
              <PenSquare className="w-4 h-4 flex-shrink-0" />
              {sidebarOpen && <span className="truncate whitespace-nowrap">Create Prediction</span>}
            </button>
          )}

          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 768) setSidebarOpen(false);
                  if (item.path === '/notifications' && unreadCount > 0) {
                    markAllAsRead.mutate();
                  }
                }}
                title={!sidebarOpen ? item.label : undefined}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative ${!sidebarOpen ? 'md:justify-center md:px-0' : ''
                  } ${active
                    ? 'bg-[var(--brand-glow)] text-[var(--brand-primary)] border border-[var(--brand-primary)]/30 font-bold shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                  }`}
              >
                <span className="flex-shrink-0 transition-transform group-hover:scale-110 relative">
                  {item.icon}
                  {!sidebarOpen && item.path === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--brand-primary)] ring-2 ring-[var(--bg-secondary)]" />
                  )}
                </span>

                {sidebarOpen && (
                  <span className="truncate whitespace-nowrap flex-1">{item.label}</span>
                )}

                {sidebarOpen && item.path === '/notifications' && unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[var(--brand-primary)] text-white font-mono-num">
                    {unreadCount}
                  </span>
                )}

                {/* Collapsed Tooltip on Desktop */}
                {!sidebarOpen && (
                  <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-glass)] backdrop-blur-xl border border-[var(--border-glass)] text-xs font-semibold text-[var(--text-primary)] shadow-xl whitespace-nowrap z-50 pointer-events-none animate-fade-in">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Actions Footer */}
        <div className="border-t border-[var(--border-subtle)] px-2 py-3 space-y-1 bg-[var(--bg-secondary)]/50">
          <Link
            to="/profile"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            title={!sidebarOpen ? `${currentUser?.name} (Profile)` : undefined}
            className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all relative ${!sidebarOpen ? 'md:justify-center md:px-0' : ''
              }`}
          >
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-[var(--border-glass)] flex-shrink-0">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-7 h-7 text-[var(--text-muted)]" />
              )}
            </div>

            {sidebarOpen && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] truncate leading-tight">
                  {currentUser?.name}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] truncate">{currentUser?.email}</p>
              </div>
            )}

            {!sidebarOpen && (
              <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-glass)] backdrop-blur-xl border border-[var(--border-glass)] text-xs font-semibold text-[var(--text-primary)] shadow-xl whitespace-nowrap z-50 pointer-events-none">
                {currentUser?.name}
              </div>
            )}
          </Link>

          <Link
            to="/settings"
            onClick={() => {
              if (window.innerWidth < 768) setSidebarOpen(false);
            }}
            title={!sidebarOpen ? 'Settings' : undefined}
            className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all relative ${!sidebarOpen ? 'md:justify-center md:px-0' : ''
              }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0 group-hover:rotate-45 transition-transform" />
            {sidebarOpen && <span className="truncate">Settings</span>}

            {!sidebarOpen && (
              <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-glass)] backdrop-blur-xl border border-[var(--border-glass)] text-xs font-semibold text-[var(--text-primary)] shadow-xl whitespace-nowrap z-50 pointer-events-none">
                Settings
              </div>
            )}
          </Link>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            title={!sidebarOpen ? 'Sign Out' : undefined}
            className={`group w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-all relative ${!sidebarOpen ? 'md:justify-center md:px-0' : ''
              }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            {sidebarOpen && <span className="truncate">Sign Out</span>}

            {!sidebarOpen && (
              <div className="hidden md:group-hover:flex absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-[var(--bg-surface-glass)] backdrop-blur-xl border border-[var(--border-glass)] text-xs font-semibold text-[var(--color-danger)] shadow-xl whitespace-nowrap z-50 pointer-events-none">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};
