import { ThemeProvider } from '@sitecrm/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';

/**
 * Shell-level smoke tests: the auth gate (redirect to login when no session),
 * the authenticated dashboard, and the global theme switcher.
 *
 * `fetch` is stubbed and routed by URL so the AuthProvider's `GET /auth/me`
 * call and the dashboard's count queries resolve deterministically.
 */

const TEST_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function jsonOk(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
}

function stubFetchRoutes() {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/auth/me')) return jsonOk(TEST_USER);
      if (url.includes('/api/notifications')) return jsonOk({ data: [], total: 0, page: 1, pageSize: 1, unreadCount: 0 });
      if (url.includes('/api/leads')) return jsonOk({ data: [], total: 0, page: 1, pageSize: 1 });
      return jsonOk({});
    }),
  );
}

/** Renders the app shell at a given route with the full provider stack. */
function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider storageKey="sitecrm.theme.apptest">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  stubFetchRoutes();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('redirects to the login page when there is no session', async () => {
    renderApp('/');
    expect(await screen.findByText('Sign in to your account')).toBeInTheDocument();
  });

  it('renders the dashboard when a stored token validates', async () => {
    window.localStorage.setItem('crm_token', 'valid.jwt.token');
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('switches themes via the header picker once authenticated', async () => {
    window.localStorage.setItem('crm_token', 'valid.jwt.token');
    const user = userEvent.setup();
    renderApp('/');

    // Wait for the authenticated shell (and its header) to render.
    await screen.findByRole('heading', { name: 'Dashboard' });
    await user.selectOptions(screen.getByRole('combobox', { name: /theme/i }), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
