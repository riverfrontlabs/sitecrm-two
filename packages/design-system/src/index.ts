/**
 * @sitecrm/design-system — public API.
 *
 * A themeable React design system. Visuals are driven entirely by CSS
 * custom properties ("design tokens") defined in `tokens.css`; components
 * reference only semantic tokens, so switching the `data-theme` attribute
 * restyles the entire app instantly.
 *
 * Consumers must:
 * 1. Import the tokens once: `@import '@sitecrm/design-system/tokens.css';`
 * 2. Import the Tailwind theme bridge: `@import '@sitecrm/design-system/theme.css';`
 * 3. Wrap the app in {@link ThemeProvider}.
 *
 * A live, browsable preview of every component and token lives in the web
 * app at `/design`.
 */

export { Badge, type BadgeProps, type BadgeTone } from './components/Badge';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './components/Button';
export { Card, type CardProps } from './components/Card';
export { Input, type InputProps } from './components/Input';
export {
  ThemeProvider,
  useTheme,
  type ThemeContextValue,
  type ThemeProviderProps,
} from './themes/ThemeProvider';
export {
  DEFAULT_THEME,
  THEMES,
  isThemeName,
  type ThemeDefinition,
  type ThemeName,
} from './themes/themes';
export { cx } from './utils/cx';
