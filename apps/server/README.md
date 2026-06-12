# @sitetwo/server

The REST API for sitetwo-oh: Node.js + TypeScript + [Fastify](https://fastify.dev).

## API documentation

The contract is **spec-first**: [`openapi/openapi.yaml`](openapi/openapi.yaml)
is the source of truth for every endpoint, schema, and error shape.

With the server running (`npm run dev:api` at the repo root):

| URL                               | What you get                                 |
| --------------------------------- | -------------------------------------------- |
| <http://localhost:3001/docs>      | Interactive Swagger UI ("try it out" works). |
| <http://localhost:3001/docs/yaml> | The raw YAML spec (for codegen/clients).     |
| <http://localhost:3001/docs/json> | The spec as JSON.                            |

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

Storage is **in-memory** (`src/store/project-store.ts`) and reseeded on every
restart — persistence is intentionally out of scope for now. The store sits
behind a four-method class, so a database can replace it without touching
routes.

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
│   └── project-store.ts in-memory storage
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
| `npm run dev:api`                      | Start with hot reload (tsx watch) on port 3001. |
| `npm test -w @sitetwo/server`          | Run the Vitest integration suite.               |
| `npm run build -w @sitetwo/server`     | Compile to `dist/` with tsc.                    |
| `npm run start -w @sitetwo/server`     | Run the compiled build.                         |
| `npm run typecheck -w @sitetwo/server` | Strict type check, no emit.                     |

## Configuration

| Variable | Default     | Purpose                                  |
| -------- | ----------- | ---------------------------------------- |
| `PORT`   | `3001`      | Listen port.                             |
| `HOST`   | `127.0.0.1` | Bind address (`0.0.0.0` for containers). |

## Conventions

- **ESM + NodeNext** — relative imports carry explicit `.js` extensions so
  the emitted JavaScript runs directly on Node.
- **Errors** use Fastify's standard envelope:
  `{ statusCode, error, message }` (documented as `Error` in the spec).
- Every module, route group, and public function carries JSDoc explaining
  what it does and why it exists.
