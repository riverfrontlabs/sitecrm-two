import { ThemeProvider } from '@sitecrm/design-system';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

/**
 * Shell-level smoke tests: routing between pages and the global theme
 * switcher. API calls made by HomePage are satisfied with an empty list.
 */

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response),
  );
});

/** Renders the app shell at a given route with its required providers. */
function renderApp(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ThemeProvider storageKey="sitetwo.theme.apptest">
        <App />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('renders the home page at /', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('navigates to the design-system preview', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.click(screen.getByRole('link', { name: 'Design System' }));
    expect(await screen.findByRole('heading', { name: 'Design system' })).toBeInTheDocument();
    expect(screen.getByText('Color tokens')).toBeInTheDocument();
  });

  it('switches themes via the header picker', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.selectOptions(screen.getByRole('combobox', { name: /theme/i }), 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
