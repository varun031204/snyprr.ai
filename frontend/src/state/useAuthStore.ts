import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ROLE_PERMISSIONS } from '../constants';
import { profilesUserService } from '../services/api/profilesService';
import type { User, UserRole } from '../types';

interface AuthState {
  currentUser: User | null;
  session: Session | null;
  activeRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;

  // Internal
  _hydrateUser: (session: Session) => Promise<void>;

  // DEV ONLY — kept for dev quick-switch
  switchRoleDemo: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  session: null,
  activeRole: 'USER',
  isAuthenticated: false,
  isLoading: true,
  authError: null,

  /**
   * Called once on app startup. Restores session from storage,
   * then subscribes to auth state changes for the lifetime of the app.
   */
  initialize: async () => {
    set({ isLoading: true });

    // Restore existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await get()._hydrateUser(session);
    } else {
      set({ isLoading: false });
    }

    // Subscribe to future changes (login/logout/token refresh)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await get()._hydrateUser(session);
      } else {
        set({
          currentUser: null,
          session: null,
          activeRole: 'USER',
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });
  },

  /**
   * Internal: fetch full user profile from API and update store.
   */
  _hydrateUser: async (session: Session) => {
    set({ session, isAuthenticated: true });
    try {
      const { data: user } = await profilesUserService.getCurrentUser();
      set({
        currentUser: user,
        activeRole: user.role,
        isAuthenticated: true,
        isLoading: false,
        authError: null,
      });
    } catch {
      // Profile fetch failed — still mark as authenticated with minimal info
      const minimalUser: User = {
        id: session.user.id,
        email: session.user.email ?? '',
        name: session.user.user_metadata?.full_name ?? session.user.email ?? 'User',
        role: 'USER',
        isVerified: !!session.user.email_confirmed_at,
        twoFactorEnabled: false,
        createdAt: session.user.created_at,
        permissions: ROLE_PERMISSIONS['USER'],
      };
      set({ currentUser: minimalUser, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, authError: error.message });
      throw error;
    }
    // onAuthStateChange will fire and call _hydrateUser automatically
  },

  signUp: async (email: string, password: string, fullName?: string) => {
    set({ isLoading: true, authError: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        // Do NOT pass emailRedirectTo — we use OTP code flow instead
      },
    });
    if (error) {
      // Log the raw Supabase error in dev so you can diagnose SMTP issues
      if (import.meta.env.DEV) {
        console.error('[signUp] Supabase raw error:', error.status, error.message, error);
      }
      // Map Supabase's technical errors to human-readable messages
      let message = error.message;
      const lower = error.message.toLowerCase();
      if (lower.includes('rate limit') || lower.includes('email rate') || lower.includes('over_email_send_rate_limit')) {
        message = 'Too many signup attempts. Please wait a few minutes and try again.';
      } else if (lower.includes('already registered') || lower.includes('user already exists')) {
        message = 'An account with this email already exists. Please sign in instead.';
      } else if (lower.includes('unable to validate') || lower.includes('email provider') || lower.includes('sending') || lower.includes('smtp') || lower.includes('email')) {
        message = 'Unable to send confirmation email. Please check your email address or try again shortly.';
      }
      set({ isLoading: false, authError: message });
      throw error;
    }
    set({ isLoading: false });
  },


  verifyOtp: async (email: string, token: string) => {
    set({ isLoading: true, authError: null });
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) {
      set({ isLoading: false, authError: error.message });
      throw error;
    }
    // verifyOtp resolves session — hydrate the user profile
    if (data.session) {
      await get()._hydrateUser(data.session);
    } else {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({
      currentUser: null,
      session: null,
      activeRole: 'USER',
      isAuthenticated: false,
      isLoading: false,
      authError: null,
    });
  },

  clearError: () => set({ authError: null }),

  switchRoleDemo: (newRole: UserRole) => {
    // DEV ONLY — visual role preview without real auth change
    if (import.meta.env.DEV) {
      set((state) => ({
        activeRole: newRole,
        currentUser: state.currentUser
          ? {
              ...state.currentUser,
              role: newRole,
              permissions: ROLE_PERMISSIONS[newRole],
            }
          : null,
      }));
    }
  },
}));
