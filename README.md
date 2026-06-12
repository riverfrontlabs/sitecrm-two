# sitetwo-oh

A full-stack TypeScript application built as a documented, themeable
foundation:

- **Frontend** — React 19 + Vite + Tailwind CSS v4 + Vitest
- **Backend** — Node.js + Fastify 5, with a spec-first OpenAPI contract
- **Design system** — CSS-variable design tokens, multiple themes, and a
  live preview page

Documentation is a first-class feature: every module carries JSDoc, every
workspace has a README, and the REST API is defined by a hand-written
OpenAPI YAML spec served through Swagger UI.

## Repository layout

```
sitetwo-oh/
├── apps/
│   ├── web/                 React app (port 5173) — see apps/web/README.md
│   │   └── src/pages/DesignSystemPage.tsx   ← live preview at /design
│   └── server/              Fastify REST API (port 3001) — see apps/server/README.md
│       └── openapi/openapi.yaml             ← API source of truth, served at /docs
├── packages/
│   └── design-system/       tokens, themes, components — see packages/design-system/README.md
├── package.json             npm workspaces root + orchestration scripts
└── tsconfig.base.json       strict TS settings shared by all workspaces
```

## Getting started

Requires Node.js ≥ 20.

```bash
npm install        # installs all workspaces
npm run dev        # starts web (5173) + api (3001) together
```

Then open:

| URL                               | What you get                                               |
| --------------------------------- | ---------------------------------------------------------- |
| <http://localhost:5173>           | The app — projects backed by the API.                      |
| <http://localhost:5173/design>    | **Design-system preview**: all tokens, components, themes. |
| <http://localhost:3001/docs>      | Interactive API documentation (Swagger UI).                |
| <http://localhost:3001/docs/yaml> | Raw OpenAPI YAML.                                          |

## Scripts (run from the repo root)

| Command                               | What it does                                      |
| ------------------------------------- | ------------------------------------------------- |
| `npm run dev`                         | Run web + API concurrently with hot reload.       |
| `npm run dev:web` / `npm run dev:api` | Run one side only.                                |
| `npm test`                            | Run every workspace's Vitest suite.               |
| `npm run typecheck`                   | Strict TypeScript check across all workspaces.    |
| `npm run build`                       | Production builds (web bundle + compiled server). |
| `npm run lint` / `npm run lint:fix`   | ESLint across the repo (optionally auto-fixing).  |
| `npm run format` / `format:check`     | Prettier write / verify formatting.               |

## Architecture at a glance

```
 Browser ──► @sitetwo/web (Vite, 5173)
                │  ▲
        /api/* proxy  │ components & tokens
                ▼  │
   @sitetwo/server (Fastify, 3001)      @sitetwo/design-system
        │                                    │
   openapi/openapi.yaml ◄── contract ──► themeable via data-theme +
   (served at /docs)                     CSS custom properties
```

Three contracts hold the system together:

1. **The API contract** — `apps/server/openapi/openapi.yaml`. The Fastify
   route schemas and the web client (`apps/web/src/api/client.ts`) both
   mirror it; change all three together.
2. **The token contract** — `packages/design-system/src/styles/tokens.css`.
   Components only use semantic tokens (`--ds-color-ink`, not `#16181d`),
   which is what makes whole-app theming a one-attribute switch.
3. **Strict TypeScript everywhere** — one shared `tsconfig.base.json`.

## Documentation map

| Topic                                             | Where                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| API endpoints, spec-first workflow                | [`apps/server/README.md`](apps/server/README.md)                       |
| Frontend structure, testing approach              | [`apps/web/README.md`](apps/web/README.md)                             |
| Theming, token contract, adding themes/components | [`packages/design-system/README.md`](packages/design-system/README.md) |
| Per-function/component reference                  | JSDoc in the source (hover in your editor)                             |

## Current scope & deliberate simplifications

- Project storage is **in-memory** and reseeds on restart; the store class
  (`apps/server/src/store/project-store.ts`) is the single seam where a real
  database would slot in.
- No authentication; CORS is open for development.
- No CI pipeline yet; `npm run lint && npm run typecheck && npm test` is the
  full local quality gate.
