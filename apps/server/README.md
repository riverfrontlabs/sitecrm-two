# @sitecrm/server

The REST API for sitecrm-two: Node.js + TypeScript + [Fastify](https://fastify.dev).

## API documentation

The contract is **spec-first**: [`openapi/openapi.yaml`](openapi/openapi.yaml)
is the source of truth for every endpoint, schema, and error shape.

With the server running (`npm run dev:api` at the repo root):

| URL                               | What you get                                 |
| --------------------------------- | -------------------------------------------- |
| <http://localhost:3000/docs>      | Interactive Swagger UI ("try it out" works). |
| <http://localhost:3000/docs/yaml> | The raw YAML spec (for codegen/clients).     |
| <http://localhost:3000/docs/json> | The spec as JSON.                            |

The Fastify route schemas in `src/routes/` and the web client types in
`apps/web/src/api/client.ts` mirror the spec. **When changing an endpoint,
update all three in the same commit.**

## Endpoints (summary)

| Method & path                     | Purpose                                        |
| --------------------------------- | ---------------------------------------------- |
| `GET /api/health`                 | Liveness probe (status + uptime).              |
| `GET /api/projects`               | List projects, newest first.                   |
| `POST /api/projects`              | Create a project (validated against the spec). |
| `GET /api/projects/:projectId`    | Fetch one project.                             |
| `DELETE /api/projects/:projectId` | Delete a project.                              |

## Storage

Routes talk to the `ProjectStore` interface (`src/store/project-store.ts`);
the backend is chosen at startup by `server.ts`:

| `DATABASE_URL` | Backend                                      | Used by                                                    |
| -------------- | -------------------------------------------- | ---------------------------------------------------------- |
| set            | **PostgreSQL** (`postgres-project-store.ts`) | `docker compose up`, or local dev pointed at the container |
| unset          | **In-memory** (`memory-project-store.ts`)    | Tests, and zero-setup local dev (reseeds each restart)     |

The Postgres store applies its schema idempotently on startup
(`CREATE TABLE IF NOT EXISTS`) and seeds example data into an empty
database — there is no separate migration step to run. When the schema
outgrows this, swap in a real migration tool; the SQL lives in one constant
in `postgres-project-store.ts`.

### Running against Postgres locally

```bash
docker compose up -d db                      # start only the database
cp apps/server/.env.example apps/server/.env # enables DATABASE_URL
npm run dev:api                              # auto-loads the .env file
```

Postgres-backed integration tests are opt-in (they need a real database):

```bash
TEST_DATABASE_URL=postgres://sitecrm:sitecrm@localhost:5432/sitecrm npm test -w @sitecrm/server
```

## Docker

`apps/server/Dockerfile` builds a production image (multi-stage: compile
with dev deps, ship only production deps + `dist/` + the OpenAPI spec). It
must be built **from the repo root** because dependency install is driven by
the monorepo's root lockfile — the compose file already does this:

```bash
docker compose up --build    # API on :3000 + Postgres on :5432
docker compose down          # stop; add -v to also wipe the database volume
```

## Architecture

```
src/
├── server.ts            entry point — builds the app and listens
├── app.ts               app factory (buildApp) — all wiring, no socket
├── routes/
│   ├── health.ts        GET /api/health
│   └── projects.ts      /api/projects CRUD + JSON schemas
├── plugins/
│   └── openapi.ts       serves openapi.yaml at /docs (static mode)
├── store/
│   ├── project-store.ts           ProjectStore interface + seed data
│   ├── memory-project-store.ts    zero-setup backend (tests, default dev)
│   └── postgres-project-store.ts  persistent backend (DATABASE_URL)
└── types.ts             domain types mirroring the OpenAPI schemas
```

The **app-factory pattern** (`buildApp()`) is the key testability decision:
`server.ts` builds the app and calls `listen()`; tests build the _same_ app
and drive it with Fastify's `inject()` — real validation, routing, and
serialization with no network port.

Request/response validation uses Fastify's built-in JSON Schema support:
invalid bodies are rejected with a `400` before handlers run, and response
schemas strip any property not declared in the spec.

## Scripts

| Command (from repo root)               | What it does                                    |
| -------------------------------------- | ----------------------------------------------- |
| `npm run dev:api`                      | Start with hot reload (tsx watch) on port 3000. |
| `npm test -w @sitecrm/server`          | Run the Vitest integration suite.               |
| `npm run build -w @sitecrm/server`     | Compile to `dist/` with tsc.                    |
| `npm run start -w @sitecrm/server`     | Run the compiled build.                         |
| `npm run typecheck -w @sitecrm/server` | Strict type check, no emit.                     |

## Configuration

A `.env` file in this package is loaded automatically when present — copy
[`.env.example`](.env.example) to get started.

| Variable       | Default     | Purpose                                                |
| -------------- | ----------- | ------------------------------------------------------ |
| `DATABASE_URL` | _(unset)_   | Postgres connection string; unset = in-memory storage. |
| `PORT`         | `3000`      | Listen port.                                           |
| `HOST`         | `127.0.0.1` | Bind address (the Docker image sets `0.0.0.0`).        |

## Conventions

- **ESM + NodeNext** — relative imports carry explicit `.js` extensions so
  the emitted JavaScript runs directly on Node.
- **Errors** use Fastify's standard envelope:
  `{ statusCode, error, message }` (documented as `Error` in the spec).
- Every module, route group, and public function carries JSDoc explaining
  what it does and why it exists.
