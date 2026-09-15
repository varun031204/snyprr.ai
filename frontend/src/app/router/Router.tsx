import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, Outlet, ScrollRestoration, useNavigation } from 'react-router-dom';
import { AppShell } from '../../layouts/AppShell';
import { AuthLayout } from '../../layouts/AuthLayout';
import { AuthGuard } from '../guards/AuthGuard';
import { RoleGuard } from '../guards/RoleGuard';
import { useAuthStore } from '../../state/useAuthStore';

// Lazy-loaded pages
const LandingPage = lazy(() => import('../../features/landing/LandingPage'));
const PricingPage = lazy(() => import('../../features/pricing/PricingPage'));
const LoginPage = lazy(() => import('../../features/auth/LoginPage'));
const SignupPage = lazy(() => import('../../features/auth/SignupPage'));
const OTPVerificationPage = lazy(() => import('../../features/auth/OTPVerificationPage'));
const UserDashboardPage = lazy(() => import('../../features/dashboard/UserDashboardPage'));
const TraderDashboardPage = lazy(() => import('../../features/dashboard/TraderDashboardPage'));
const AdminDashboardPage = lazy(() => import('../../features/admin/AdminDashboardPage'));
const PredictionsPage = lazy(() => import('../../features/predictions/PredictionsPage'));
const PredictionDetailPage = lazy(() => import('../../features/predictions/PredictionDetailPage'));
const CreatePredictionPage = lazy(() => import('../../features/predictions/create/CreatePredictionPage'));
const EditPredictionPage = lazy(() => import('../../features/predictions/edit/EditPredictionPage'));
const TradersDirectoryPage = lazy(() => import('../../features/traders/TradersDirectoryPage'));
const TraderProfilePage = lazy(() => import('../../features/traders/TraderProfilePage'));
const WatchlistPage = lazy(() => import('../../features/watchlist/WatchlistPage'));
const NotificationsPage = lazy(() => import('../../features/notifications/NotificationsPage'));
const MyTradesPage = lazy(() => import('../../features/trades/MyTradesPage'));
const SubscriptionsPage = lazy(() => import('../../features/subscriptions/SubscriptionsPage'));
const CalendarPage = lazy(() => import('../../features/calendar/CalendarPage'));
const ProfilePage = lazy(() => import('../../features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('../../features/settings/SettingsPage'));
const AnalyticsPage = lazy(() => import('../../features/analytics/AnalyticsPage'));
const PerformancePage = lazy(() => import('../../features/performance/PerformancePage'));
const TraderJournalPage = lazy(() => import('../../features/journal/TraderJournalPage'));
const TraderSettingsPage = lazy(() => import('../../features/traders/TraderSettingsPage'));
const AdminUsersPage = lazy(() => import('../../features/admin/AdminUsersPage'));
const AdminTradersPage = lazy(() => import('../../features/admin/AdminTradersPage'));
const AdminPredictionsPage = lazy(() => import('../../features/admin/AdminPredictionsPage'));
const AdminSubscriptionsPage = lazy(() => import('../../features/admin/AdminSubscriptionsPage'));
const AdminAuditLogsPage = lazy(() => import('../../features/admin/AdminAuditLogsPage'));
const AdminSettingsPage = lazy(() => import('../../features/admin/AdminSettingsPage'));
const ContactPage = lazy(() => import('../../features/contact/ContactPage'));
const ForgotPasswordPage = lazy(() => import('../../features/auth/ForgotPasswordPage'));
const AboutPage = lazy(() => import('../../features/landing/AboutPage'));
const TestimonialsPage = lazy(() => import('../../features/landing/TestimonialsPage'));
const PublicContactPage = lazy(() => import('../../features/landing/PublicContactPage'));
const TermsPage = lazy(() => import('../../features/landing/TermsPage'));
const NewsPage = lazy(() => import('../../features/news/NewsPage'));
const PaperTradingPage = lazy(() => import('../../features/paper-trading/PaperTradingPage'));

const PageLoader = () => (
  <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[var(--bg-base)]/60 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-[3px] border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] animate-spin shadow-[0_0_20px_var(--brand-primary)]" />
      <p className="text-xs font-semibold text-[var(--text-muted)] tracking-widest uppercase animate-pulse">Loading...</p>
    </div>
  </div>
);

// Top progress bar + spinner shown during every route transition
const NavigationProgress = () => {
  const navigation = useNavigation();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (navigation.state !== 'idle') {
      // Show immediately
      setVisible(true);
    } else {
      // Keep visible briefly so it doesn't flash away too fast
      timer = setTimeout(() => setVisible(false), 300);
    }
    return () => clearTimeout(timer);
  }, [navigation.state]);

  if (!visible) return null;

  return (
    <>
      {/* Slim top bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px] bg-[var(--brand-primary)]/20">
        <div
          className="h-full bg-[var(--brand-primary)] rounded-full shadow-[0_0_8px_var(--brand-primary)]"
          style={{ animation: 'nav-progress 1s ease-in-out infinite' }}
        />
      </div>
      {/* Spinner in top-right corner */}
      <div className="fixed top-4 right-4 z-[9999] w-8 h-8 rounded-full border-2 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)] animate-spin shadow-[0_0_12px_var(--brand-primary)]" />
    </>
  );
};

// Root Layout with scroll restoration on route change
const RootLayout = () => (
  <>
    <NavigationProgress />
    <ScrollRestoration />
    <Outlet />
  </>
);

// Protected App Shell wrapper
const ProtectedShell = () => (
  <AuthGuard>
    <AppShell>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </AppShell>
  </AuthGuard>
);

// Smart Dashboard (routes to role-appropriate dashboard)
const SmartDashboard = () => {
  const { activeRole } = useAuthStore();
  if (activeRole === 'ADMIN') return <Navigate to="/admin" replace />;
  if (activeRole === 'TRADER') return <Navigate to="/trader/dashboard" replace />;
  return <UserDashboardPage />;
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // Public Routes
      {
        path: '/',
        element: <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>,
      },
      {
        path: '/pricing',
        element: <Suspense fallback={<PageLoader />}><PricingPage /></Suspense>,
      },
      {
        path: '/login',
        element: <AuthLayout><Suspense fallback={<PageLoader />}><LoginPage /></Suspense></AuthLayout>,
      },
      {
        path: '/signup',
        element: <AuthLayout><Suspense fallback={<PageLoader />}><SignupPage /></Suspense></AuthLayout>,
      },
      {
        path: '/forgot-password',
        element: (
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <ForgotPasswordPage />
            </Suspense>
          </AuthLayout>
        ),
      },
      {
        path: '/verify-otp',
        element: (
          <AuthLayout>
            <Suspense fallback={<PageLoader />}>
              <OTPVerificationPage />
            </Suspense>
          </AuthLayout>
        ),
      },
      {
        path: '/about',
        element: <Suspense fallback={<PageLoader />}><AboutPage /></Suspense>,
      },
      {
        path: '/testimonials',
        element: <Suspense fallback={<PageLoader />}><TestimonialsPage /></Suspense>,
      },
      {
        path: '/contact-us',
        element: <Suspense fallback={<PageLoader />}><PublicContactPage /></Suspense>,
      },
      {
        path: '/terms',
        element: <Suspense fallback={<PageLoader />}><TermsPage /></Suspense>,
      },

      // Protected Routes
      {
        element: <ProtectedShell />,
        children: [
          { path: '/dashboard', element: <SmartDashboard /> },

          // User routes
          { path: '/predictions', element: <PredictionsPage /> },
          { path: '/predictions/:id', element: <PredictionDetailPage /> },
          { path: '/traders', element: <TradersDirectoryPage /> },
          { path: '/traders/:id', element: <TraderProfilePage /> },
          { path: '/watchlist', element: <WatchlistPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/my-trades', element: <MyTradesPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/performance', element: <PerformancePage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/subscriptions', element: <SubscriptionsPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/contact', element: <ContactPage /> },
          { path: '/news', element: <NewsPage /> },
          { path: '/paper-trading', element: <PaperTradingPage /> },

          // Trader routes
          {
            element: <RoleGuard allowedRoles={['TRADER', 'ADMIN']}><Outlet /></RoleGuard>,
            children: [
              { path: '/trader/dashboard', element: <TraderDashboardPage /> },
              { path: '/trader/predictions', element: <PredictionsPage /> },
              {
                path: '/trader/predictions/create',
                element: <CreatePredictionPage />,
              },
              { path: '/trader/predictions/:id/edit', element: <EditPredictionPage /> },
              { path: '/trader/performance', element: <PerformancePage /> },
              { path: '/trader/analytics', element: <AnalyticsPage /> },
              { path: '/trader/journal', element: <TraderJournalPage /> },
              { path: '/trader/settings', element: <TraderSettingsPage /> },
            ],
          },

          // Admin routes
          {
            element: <RoleGuard allowedRoles={['ADMIN']}><Outlet /></RoleGuard>,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/users', element: <AdminUsersPage /> },
              { path: '/admin/traders', element: <AdminTradersPage /> },
              { path: '/admin/predictions', element: <AdminPredictionsPage /> },
              { path: '/admin/subscriptions', element: <AdminSubscriptionsPage /> },
              { path: '/admin/analytics', element: <AnalyticsPage /> },
              { path: '/admin/audit-logs', element: <AdminAuditLogsPage /> },
              { path: '/admin/settings', element: <AdminSettingsPage /> },
            ],
          },

          // Catch-all 404
          {
            path: '*',
            element: (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-8">
                <p className="text-7xl font-extrabold text-[var(--brand-primary)] font-mono-num">404</p>
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">Page Not Found</h2>
                <p className="text-sm text-[var(--text-muted)] max-w-sm">
                  The page you're looking for doesn't exist or has been moved.
                </p>
                <a
                  href="/dashboard"
                  className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-vivid)] transition-all"
                >
                  Back to Dashboard
                </a>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);

export const Router: React.FC = () => <RouterProvider router={router} />;
