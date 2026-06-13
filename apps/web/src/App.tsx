/**
 * Application shell — authentication gate, layout, and routing.
 *
 * Unauthenticated users are redirected to `/login`. Authenticated users see
 * the sticky header (brand, nav links, notification badge, user menu) above
 * the routed page content.
 *
 * Routes:
 * - `/login`               — {@link LoginPage}        (public)
 * - `/`                    — {@link DashboardPage}    (protected)
 * - `/leads`               — {@link LeadsPage}        (protected)
 * - `/leads/pipeline`      — {@link PipelinePage}     (protected)
 * - `/leads/:id`           — {@link LeadDetailPage}   (protected)
 * - `/notifications`       — {@link NotificationsPage}(protected)
 * - `/design`              — {@link DesignSystemPage} (protected)
 */
import { cx } from '@sitecrm/design-system';
import { useQuery } from '@tanstack/react-query';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useAuth } from './contexts/AuthContext';
import { notificationsApi } from './api/client';
import { DashboardPage } from './pages/DashboardPage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { LeadDetailPage } from './pages/LeadDetailPage';
import { LeadsPage } from './pages/LeadsPage';
import { LoginPage } from './pages/LoginPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PipelinePage } from './pages/PipelinePage';

export function App() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<ProtectedLayout />} />
    </Routes>
  );
}

function ProtectedLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <span className="font-semibold text-ink">SiteCRM</span>

          <nav className="flex gap-1" aria-label="Main">
            <NavItem to="/">Dashboard</NavItem>
            <NavItem to="/leads">Leads</NavItem>
            <NavItem to="/leads/pipeline">Pipeline</NavItem>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <ThemeSwitcher />
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-ink-muted sm:block">
                {user?.firstName}
              </span>
              <button
                onClick={logout}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/pipeline" element={<PipelinePage />} />
          <Route path="/leads/:id" element={<LeadDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/design" element={<DesignSystemPage />} />
        </Routes>
      </main>
    </div>
  );
}

function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          isActive ? 'bg-overlay text-ink' : 'text-ink-muted hover:text-ink',
        )
      }
    >
      {children}
    </NavLink>
  );
}

function NotificationBell() {
  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.list({ pageSize: 1, unread: true }),
    refetchInterval: 60_000, // poll every minute until SSE is wired up
  });
  const count = data?.unreadCount ?? 0;

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        cx(
          'relative rounded-md px-2 py-1.5 text-sm transition-colors',
          isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
        )
      }
    >
      🔔
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-interactive text-xs font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </NavLink>
  );
}
