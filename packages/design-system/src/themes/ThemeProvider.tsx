import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DEFAULT_THEME, isThemeName, type ThemeName } from './themes';

/** Value exposed by {@link ThemeContext} / {@link useTheme}. */
export interface ThemeContextValue {
  /** The currently active theme name. */
  theme: ThemeName;
  /** Activates a theme and persists the choice to `localStorage`. */
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Props accepted by {@link ThemeProvider}. */
export interface ThemeProviderProps {
  /** Theme to use when no persisted preference exists. Defaults to `'light'`. */
  defaultTheme?: ThemeName;
  /**
   * `localStorage` key under which the user's choice is persisted.
   * Override it if multiple themed apps share an origin.
   */
  storageKey?: string;
  children: ReactNode;
}

/**
 * Reads the persisted theme preference, falling back to `fallback` when
 * storage is unavailable (SSR, sandboxed iframes) or holds an unknown name.
 */
function readStoredTheme(storageKey: string, fallback: ThemeName): ThemeName {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isThemeName(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Provides theme state to the component tree and applies the active theme by
 * setting `data-theme` on `<html>`, which activates the matching token block
 * in `tokens.css`.
 *
 * The chosen theme is persisted to `localStorage` and restored on the next
 * visit. Must wrap any component that calls {@link useTheme}.
 *
 * @example
 * createRoot(rootEl).render(
 *   <ThemeProvider defaultTheme="dark">
 *     <App />
 *   </ThemeProvider>,
 * );
 */
export function ThemeProvider({
  defaultTheme = DEFAULT_THEME,
  storageKey = 'sitetwo.theme',
  children,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(() =>
    readStoredTheme(storageKey, defaultTheme),
  );

  // Reflect the active theme onto <html> so the CSS cascade picks the
  // matching [data-theme='…'] token block.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemeName) => {
      setThemeState(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // Storage may be unavailable (private browsing, quota); the theme
        // still applies for the current session.
      }
    },
    [storageKey],
  );

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Returns the active theme and a setter to change it.
 *
 * @throws If called outside a {@link ThemeProvider}.
 *
 * @example
 * const { theme, setTheme } = useTheme();
 * <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>Toggle</button>
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a <ThemeProvider>.');
  }
  return context;
}
