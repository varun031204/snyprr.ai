import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../state/useAuthStore';
import { useUIStore } from '../state/useUIStore';
import { useUserStore } from '../state/useUserStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      currentUser: null,
      isAuthenticated: true,
      activeRole: 'USER',
    });
  });

  it('should switch roles smoothly', () => {
    useAuthStore.getState().switchRoleDemo('TRADER');
    expect(useAuthStore.getState().activeRole).toBe('TRADER');

    useAuthStore.getState().switchRoleDemo('ADMIN');
    expect(useAuthStore.getState().activeRole).toBe('ADMIN');
  });

  it('should reflect role switch via switchRoleDemo', () => {
    useAuthStore.getState().switchRoleDemo('TRADER');
    expect(useAuthStore.getState().activeRole).toBe('TRADER');
  });
});

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ toasts: [], theme: 'neo-dark' });
  });

  it('should add and remove toasts', () => {
    useUIStore.getState().addToast({ type: 'success', title: 'Test Toast', message: 'Hello' });
    expect(useUIStore.getState().toasts.length).toBe(1);

    const toastId = useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(toastId);
    expect(useUIStore.getState().toasts.length).toBe(0);
  });

  it('should toggle theme', () => {
    useUIStore.getState().setTheme('neo-dark');
    expect(useUIStore.getState().theme).toBe('neo-dark');

    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('neo-light');
  });
});

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({ watchlistIds: [] });
  });

  it('should toggle prediction ids in watchlist', () => {
    useUserStore.getState().toggleWatchlist('pred_101');
    expect(useUserStore.getState().watchlistIds).toContain('pred_101');

    useUserStore.getState().toggleWatchlist('pred_101');
    expect(useUserStore.getState().watchlistIds).not.toContain('pred_101');
  });
});
