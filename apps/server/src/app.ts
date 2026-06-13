/**
 * Application factory for the SiteCRM API.
 *
 * `buildApp` constructs a fully configured Fastify instance without binding a
 * port.  This app-factory pattern keeps the server testable: production code
 * (`server.ts`) builds the app and calls `listen()`; tests build the same app
 * and drive it with `inject()` — identical wiring, no sockets.
 *
 * Registered plugins (in order):
 * - `@fastify/cors`        — open in development; tighten `origin` in prod
 * - `@fastify/jwt`         — JWT signing/verification; decorates `app.jwt`
 * - `@fastify/swagger`     — serves `openapi/openapi.yaml` statically at `/docs`
 * - `@fastify/swagger-ui`  — interactive Swagger UI at `/docs`
 * - `authPlugin`           — decorates `app.authenticate` for protected routes
 *
 * Route groups (all prefixed `/api`):
 * - `/api/health`         — liveness probe (no auth)
 * - `/api/auth`           — register, login, current-user
 * - `/api/leads`          — lead CRUD, notes, contact events
 * - `/api/notifications`  — notification inbox + SSE stream
 */
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { leadRoutes } from './routes/leads.js';
import { notificationRoutes } from './routes/notifications.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './db/schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Drizzle database instance type used throughout the server.
 *
 * Typed with the full schema so that all query results and insert shapes are
 * inferred correctly without explicit type annotations at the call site.
 */
export type Database = NodePgDatabase<typeof schema>;

/** Options for {@link buildApp}. */
export interface BuildAppOptions {
  /**
   * Enable Fastify's built-in pino request logger.  Off by default so tests
   * stay quiet.
   */
  logger?: boolean;
  /**
   * Drizzle database instance.  Routes that touch the database return `503`
   * when this is omitted — useful for lightweight tests that only exercise the
   * health endpoint.
   *
   * `server.ts` passes the instance created from `DATABASE_URL`; inject a
   * test database in specs.
   */
  db?: Database;
  /**
   * JWT signing secret.  Defaults to `process.env.JWT_SECRET`.
   *
   * Override in tests to use a deterministic value without touching the
   * environment.  The server warns at startup if the env var is missing.
   */
  jwtSecret?: string;
}

/**
 * Builds a fully configured Fastify instance without binding a port.
 *
 * @param options - See {@link BuildAppOptions}.
 * @returns The configured (not yet listening) Fastify instance.
 *
 * @example
 * // Production — server.ts passes the real db + secret
 * const app = await buildApp({ logger: true, db, jwtSecret: process.env.JWT_SECRET });
 *
 * @example
 * // Test — inject an isolated db + fixed secret
 * const app = await buildApp({ db: testDb, jwtSecret: 'test-secret' });
 * const res = await app.inject({ method: 'GET', url: '/api/health' });
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const {
    logger = false,
    db,
    jwtSecret = process.env.JWT_SECRET,
  } = options;

  const app = Fastify({
    logger,
    ajv: {
      customOptions: {
        // Reject unknown properties rather than silently stripping them —
        // the OpenAPI spec promises a 400 for `additionalProperties: false`.
        removeAdditional: false,
      },
    },
  });

  // The web dev server (Vite, port 5173) and builder (port 5174) proxy /api in
  // development; an open CORS policy also allows direct tool calls.
  await app.register(cors, { origin: true });

  await app.register(jwt, {
    secret: jwtSecret ?? 'dev-fallback-change-in-production',
  });

  await app.register(swagger, {
    mode: 'static',
    specification: {
      path: resolve(__dirname, '../openapi/openapi.yaml'),
      baseDir: resolve(__dirname, '../openapi'),
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  // Decorates app.authenticate — used as preHandler on protected routes.
  await app.register(authPlugin);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api', db });
  await app.register(leadRoutes, { prefix: '/api', db });
  await app.register(notificationRoutes, { prefix: '/api', db });

  return app;
}
