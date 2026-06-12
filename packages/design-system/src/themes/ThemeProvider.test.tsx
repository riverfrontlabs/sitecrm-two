import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider';

/** Minimal consumer exposing the hook's state for assertions. */
function ThemeProbe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <button onClick={() => setTheme('ocean')}>go ocean</button>
    </div>
  );
}

const STORAGE_KEY = 'sitetwo.theme.test';

describe('ThemeProvider', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  it('applies the default theme to <html> on mount', () => {
    render(
      <ThemeProvider defaultTheme="dark" storageKey={STORAGE_KEY}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('switches the theme and persists the choice', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider storageKey={STORAGE_KEY}>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'go ocean' }));
    expect(document.documentElement.dataset.theme).toBe('ocean');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('ocean');
  });

  it('restores a persisted theme and ignores unknown stored values', () => {
    window.localStorage.setItem(STORAGE_KEY, 'ocean');
    const { unmount } = render(
      <ThemeProvider storageKey={STORAGE_KEY}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current-theme')).toHaveTextContent('ocean');
    unmount();

    window.localStorage.setItem(STORAGE_KEY, 'no-such-theme');
    render(
      <ThemeProvider defaultTheme="light" storageKey={STORAGE_KEY}>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });

  it('useTheme throws outside a provider', () => {
    expect(() => render(<ThemeProbe />)).toThrow(/within a <ThemeProvider>/);
  });
});
