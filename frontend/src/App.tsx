import React, { useEffect } from 'react';
import { QueryProvider } from './app/providers/QueryProvider';
import { ThemeProvider } from './app/providers/ThemeProvider';
import { Router } from './app/router/Router';
import { useAuthStore } from './state/useAuthStore';

/**
 * AuthInitializer
 * Calls initialize() once on mount to restore session from Supabase localStorage
 * and subscribe to auth state changes for the life of the app.
 */
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthInitializer>
          <Router />
        </AuthInitializer>
      </ThemeProvider>
    </QueryProvider>
  );
};

export default App;
