import { NavLink, Route, Routes } from 'react-router-dom';
import { cx } from '@sitecrm/design-system';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { HomePage } from './pages/HomePage';

/**
 * Application shell: sticky header (brand, navigation, theme switcher)
 * above the routed page content.
 *
 * Routes:
 * - `/` — {@link HomePage}: projects backed by the REST API.
 * - `/design` — {@link DesignSystemPage}: live design-system preview.
 */
export function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4">
          <span className="font-semibold text-ink">sitetwo-oh</span>
          <nav className="flex gap-1" aria-label="Main">
            <HeaderLink to="/">Home</HeaderLink>
            <HeaderLink to="/design">Design System</HeaderLink>
          </nav>
          <div className="ml-auto">
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/design" element={<DesignSystemPage />} />
        </Routes>
      </main>
    </div>
  );
}

/** Navigation link that highlights itself when its route is active. */
function HeaderLink({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      end
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
