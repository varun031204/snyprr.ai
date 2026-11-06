import { create } from 'zustand';

export type ThemeMode = 'neo-dark' | 'neo-light';

export interface ToastItem {
  id: string;
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
  title?: string;
}

// ── Notification preferences ──────────────────────────────────────────────────

export interface NotificationPrefs {
  emailAlerts: boolean;
  targetHitAlerts: boolean;
  newFollowerAlerts: boolean;
}

const NOTIF_KEY = 'snyprr_notif_prefs';

function getInitialNotifPrefs(): NotificationPrefs {
  const defaults: NotificationPrefs = {
    emailAlerts: true,
    targetHitAlerts: true,
    newFollowerAlerts: false,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = window.localStorage.getItem(NOTIF_KEY);
    if (stored) return { ...defaults, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return defaults;
}

function saveNotifPrefs(prefs: NotificationPrefs) {
  try { window.localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

// ── Store interface ───────────────────────────────────────────────────────────

interface UIState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  aiDrawerOpen: boolean;
  globalSearchOpen: boolean;
  activeModal: string | null;
  toasts: ToastItem[];
  notifPrefs: NotificationPrefs;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleAIDrawer: () => void;
  setAIDrawerOpen: (open: boolean) => void;
  toggleGlobalSearch: () => void;
  setGlobalSearchOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
  /** Persist notification preferences to localStorage */
  saveNotifPrefs: (prefs: Partial<NotificationPrefs>) => void;
}

const getInitialTheme = (): ThemeMode => {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const stored = window.localStorage.getItem('snyprr_theme');
      if (stored === 'neo-dark' || stored === 'neo-light') return stored;
    } catch {
      // Ignore
    }
  }
  return 'neo-light';
};

export const useUIStore = create<UIState>((set, get) => ({
  theme: getInitialTheme(),
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  aiDrawerOpen: false,
  globalSearchOpen: false,
  activeModal: null,
  toasts: [],
  notifPrefs: getInitialNotifPrefs(),

  setTheme: (theme: ThemeMode) => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem('snyprr_theme', theme);
        document.documentElement?.setAttribute('data-theme', theme);
      } catch {
        // Ignore
      }
    }
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'neo-dark' ? 'neo-light' : 'neo-dark';
    get().setTheme(nextTheme);
  },

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  toggleAIDrawer: () => set((state) => ({ aiDrawerOpen: !state.aiDrawerOpen })),
  setAIDrawerOpen: (open: boolean) => set({ aiDrawerOpen: open }),

  toggleGlobalSearch: () => set((state) => ({ globalSearchOpen: !state.globalSearchOpen })),
  setGlobalSearchOpen: (open: boolean) => set({ globalSearchOpen: open }),

  openModal: (modalId: string) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),

  addToast: (toast) => {
    const id = `toast_${Date.now()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  saveNotifPrefs: (prefs: Partial<NotificationPrefs>) => {
    const updated = { ...get().notifPrefs, ...prefs };
    saveNotifPrefs(updated);
    set({ notifPrefs: updated });
  },
}));
