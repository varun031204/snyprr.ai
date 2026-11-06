/**
 * GuestGuard — redirects already-authenticated users away from auth pages.
 * Prevents a logged-in user from seeing /login, /signup, /forgot-password.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../state/useAuthStore';
import { isSupabasePlaceholder } from '../../lib/supabase';

export const GuestGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  // While session is being restored, render nothing (avoids flash redirect)
  if (isLoading && !isSupabasePlaceholder) return null;

  // Already signed in → send to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
