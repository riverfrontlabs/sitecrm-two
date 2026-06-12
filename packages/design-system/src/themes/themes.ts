/**
 * Theme registry.
 *
 * A "theme" is a named set of values for the design-token contract declared
 * in `src/styles/tokens.css`. Activating a theme is nothing more than setting
 * `data-theme="<name>"` on the document element — the CSS cascade does the
 * rest, so theme switches are instant and require no re-render of styles.
 *
 * To add a theme:
 * 1. Add a `[data-theme='<name>']` block in `tokens.css` defining every token.
 * 2. Add the name and metadata to {@link THEMES} below.
 */

/** Union of all registered theme names. */
export type ThemeName = 'light' | 'dark' | 'ocean';

/** Display metadata for a registered theme. */
export interface ThemeDefinition {
  /** Machine name written to the `data-theme` attribute. */
  name: ThemeName;
  /** Human-friendly label for theme pickers. */
  label: string;
  /** One-line description shown in the design-system preview. */
  description: string;
}

/**
 * All themes shipped with the design system, in display order.
 * The first entry is the default theme.
 */
export const THEMES: readonly ThemeDefinition[] = [
  { name: 'light', label: 'Light', description: 'Neutral light theme — the default.' },
  { name: 'dark', label: 'Dark', description: 'Neutral dark theme with a brighter primary.' },
  { name: 'ocean', label: 'Ocean', description: 'Deep blue canvas with teal interactive colors.' },
] as const;

/** The theme applied when no stored preference exists. */
export const DEFAULT_THEME: ThemeName = 'light';

/**
 * Type guard: is `value` the name of a registered theme?
 *
 * Used to validate values read back from `localStorage`, which may contain
 * stale names from themes that have since been removed.
 *
 * @param value - Any string, e.g. from storage or a URL parameter.
 * @returns `true` if `value` is a registered {@link ThemeName}.
 */
export function isThemeName(value: string | null | undefined): value is ThemeName {
  return THEMES.some((theme) => theme.name === value);
}
