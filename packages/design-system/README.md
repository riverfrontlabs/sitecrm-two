# @sitetwo/design-system

A themeable React design system: CSS-variable design tokens, theme
definitions, and accessible UI primitives. Components never hard-code
colors — they consume **semantic tokens**, so switching one HTML attribute
restyles the entire application.

> **Live preview:** run the web app (`npm run dev` at the repo root) and open
> <http://localhost:5173/design> to browse every token, component variant,
> and theme interactively.

## How theming works

```
tokens.css                ThemeProvider              Components
┌────────────────────┐    ┌────────────────────┐    ┌──────────────────────┐
│ [data-theme='dark']│◄───│ sets data-theme on │    │ <Button> uses        │
│   --ds-color-ink…  │    │ <html>, persists   │    │ bg-primary, text-ink │
│ [data-theme='ocean']    │ choice to storage  │    │ (semantic classes)   │
└────────────────────┘    └────────────────────┘    └──────────────────────┘
```

1. [`src/styles/tokens.css`](src/styles/tokens.css) declares the **token
   contract** — `--ds-color-canvas`, `--ds-color-ink`, `--ds-color-primary`,
   etc. — and provides one value-set per theme, keyed by the `data-theme`
   attribute on `<html>`.
2. [`ThemeProvider`](src/themes/ThemeProvider.tsx) owns the active theme:
   it writes `data-theme`, persists the user's choice to `localStorage`, and
   exposes `useTheme()` for switchers.
3. The consuming app maps the tokens into Tailwind utility names (see
   [`apps/web/src/index.css`](../../apps/web/src/index.css)), so components
   can use classes like `bg-surface` and `text-ink-muted`.

Because themes are pure CSS, switching is instant and works for any number
of themes — `light`, `dark`, and `ocean` ship by default.

### Adding a theme

1. In `src/styles/tokens.css`, copy an existing `[data-theme='…']` block,
   rename it, and define **every** token in the contract.
2. Register the name in [`src/themes/themes.ts`](src/themes/themes.ts)
   (`ThemeName` union + `THEMES` array).
3. That's it — theme pickers built on `THEMES` (like the one in the web
   app's header) pick it up automatically.

## Installation in an app

```css
/* app entry CSS */
@import 'tailwindcss';
@import '@sitetwo/design-system/tokens.css';
```

```tsx
import { ThemeProvider } from '@sitetwo/design-system';

createRoot(rootEl).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>,
);
```

## Components

| Export                                   | Purpose                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Button`                                 | Action button — variants `primary` / `secondary` / `ghost` / `danger`, sizes `sm` / `md` / `lg`. |
| `Input`                                  | Labelled text field with hint/error display and ARIA wiring.                                     |
| `Card`                                   | Elevated surface with optional title, description, and footer.                                   |
| `Badge`                                  | Inline status/tag label — tones `neutral` / `primary` / `success` / `warning` / `danger`.        |
| `ThemeProvider` / `useTheme`             | Theme state, persistence, and switching.                                                         |
| `THEMES`, `DEFAULT_THEME`, `isThemeName` | Theme registry and helpers.                                                                      |
| `cx`                                     | Tiny class-name joiner.                                                                          |

Every export carries full JSDoc — hover it in your editor for usage examples.

## Scripts

| Command                                        | What it does                                 |
| ---------------------------------------------- | -------------------------------------------- |
| `npm test -w @sitetwo/design-system`           | Run the Vitest + Testing Library suite once. |
| `npm run test:watch -w @sitetwo/design-system` | Watch mode.                                  |
| `npm run typecheck -w @sitetwo/design-system`  | Strict TypeScript check, no emit.            |

## Design decisions

- **CSS variables over JS theming** — zero-runtime theme switches, no styled
  component re-renders, themes work even in plain CSS.
- **Semantic over literal token names** — `--ds-color-ink`, not
  `--ds-color-gray-900`; values can change per theme without renaming.
- **Source-shipped package** — apps consume the TypeScript source directly
  via the workspace; Vite compiles it, so there is no build step to keep in
  sync.
