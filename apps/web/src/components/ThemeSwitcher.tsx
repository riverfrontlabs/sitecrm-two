import { isThemeName, THEMES, useTheme } from '@sitetwo/design-system';

/**
 * Global theme picker shown in the app header.
 *
 * Built entirely on the design system's theme registry: every theme in
 * `THEMES` appears automatically, so adding a theme to the design system
 * requires no change here.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-muted">
      Theme
      <select
        value={theme}
        onChange={(event) => {
          const next = event.target.value;
          if (isThemeName(next)) setTheme(next);
        }}
        className="h-8 rounded-md border border-border bg-surface px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {THEMES.map((themeDef) => (
          <option key={themeDef.name} value={themeDef.name}>
            {themeDef.label}
          </option>
        ))}
      </select>
    </label>
  );
}
