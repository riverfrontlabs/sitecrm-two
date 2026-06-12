# @sitetwo/web

The React frontend for sitetwo-oh: Vite + React 19 + TypeScript + Tailwind
CSS v4, themed end-to-end by `@sitetwo/design-system`.

## Pages

| Route     | What it is                                                                  |
| --------- | --------------------------------------------------------------------------- |
| `/`       | Projects backed by the REST API — list, create, delete.                     |
| `/design` | **Design-system preview**: every token, component variant, and theme, live. |

## How it connects to the rest of the repo

```
┌─────────────────────────┐     /api/* (vite proxy)    ┌──────────────────┐
│ @sitetwo/web (5173)     │ ─────────────────────────► │ @sitetwo/server  │
│  pages/ components/     │                            │ (3001)           │
│  api/client.ts ←────────┼── mirrors openapi.yaml ──► │ openapi/         │
└────────────┬────────────┘                            └──────────────────┘
             │ imports components + tokens
             ▼
┌─────────────────────────┐
│ @sitetwo/design-system  │
└─────────────────────────┘
```

- **API access** goes through [`src/api/client.ts`](src/api/client.ts) — a
  typed client whose functions map 1:1 to the operations in
  [`apps/server/openapi/openapi.yaml`](../server/openapi/openapi.yaml).
  In development Vite proxies `/api/*` to port 3001 (see `vite.config.ts`),
  so app code only ever uses relative URLs.
- **Styling** is Tailwind v4 with zero hard-coded colors:
  [`src/index.css`](src/index.css) imports the design system's token contract
  and maps it into Tailwind namespaces (`bg-surface`, `text-ink`,
  `ring-ring`, …). Theming is handled by `ThemeProvider` from the design
  system; the header's `ThemeSwitcher` is built on its `THEMES` registry.

## Structure

```
src/
├── main.tsx               entry — mounts router + theme provider
├── App.tsx                shell: header, nav, routes
├── index.css              Tailwind + design-token mapping
├── api/client.ts          typed REST client (mirrors the OpenAPI spec)
├── components/            app-specific components (ThemeSwitcher)
├── pages/
│   ├── HomePage.tsx       projects CRUD against the API
│   └── DesignSystemPage.tsx  the /design preview
└── test/setup.ts          Vitest + jest-dom wiring
```

## Scripts

| Command (from repo root)          | What it does                                 |
| --------------------------------- | -------------------------------------------- |
| `npm run dev:web`                 | Vite dev server on <http://localhost:5173>.  |
| `npm test -w @sitetwo/web`        | Vitest + Testing Library suite (jsdom).      |
| `npm run build -w @sitetwo/web`   | Type-check then production build to `dist/`. |
| `npm run preview -w @sitetwo/web` | Serve the production build locally.          |

## Testing approach

- **Component tests** (Testing Library) assert user-visible behavior —
  roles, labels, text — not implementation details.
- The API boundary is mocked at one of two levels: `fetch` itself
  (`client.test.ts`, `App.test.tsx`) or the `api` module (`HomePage.test.tsx`).
- The design system has its own suite; tests here focus on app behavior.
