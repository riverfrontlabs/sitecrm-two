/**
 * Application factory for the SiteCRM API.
 *
 * `buildApp` constructs a fully configured Fastify instance without binding a
 * port.  This app-factory pattern keeps the server testable: production code
 * (`server.ts`) builds the app and calls `listen()`; tests build the same app
 * and drive it with `inject()` — identical wiring, no sockets.
 *
 * Registered plugins (in order):
 * - `@fastify/cors`        — reflects origin in dev; ALLOWED_ORIGINS in prod
 * - `@fastify/jwt`         — JWT signing/verification; decorates `app.jwt`
 * - `@fastify/swagger`     — GENERATES the OpenAPI spec from route schemas
 * - `@fastify/swagger-ui`  — interactive Swagger UI at `/docs` (+ /docs/json,/yaml)
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
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { leadRoutes } from './routes/leads.js';
import { notificationRoutes } from './routes/notifications.js';
import { errorSchema } from './routes/shared-schemas.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type * as schema from './db/schema.js';

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
        // Keep AJV's default (do not strip unknown props). Rejection of unknown
        // properties comes from each schema's own `additionalProperties: false`,
        // which is what produces the 400 the OpenAPI spec promises. Setting this
        // to `true` would silently strip unknowns and defeat that — leave it off.
        removeAdditional: false,
      },
    },
  });

  // Fail closed: never sign tokens with a guessable secret in production. In
  // dev/test a fallback keeps the app bootable without env setup, but a missing
  // secret in production is a full auth-bypass risk (anyone could forge a JWT).
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production — refusing to start with an insecure fallback.');
  }

  // The web dev server (Vite, port 5173) and builder (port 5174) proxy /api in
  // development. CORS is reflected by default for local tooling; set
  // ALLOWED_ORIGINS (comma-separated) to lock it down in production.
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  await app.register(cors, { origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true });

  await app.register(jwt, {
    secret: jwtSecret ?? 'dev-only-insecure-fallback-not-for-production',
  });

  // OpenAPI spec is GENERATED from the route schemas (dynamic mode) — there is
  // no hand-maintained YAML to drift. Each route's `schema` (tags, summary,
  // operationId, security, request/response shapes) becomes one operation.
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SiteCRM API',
        version: '0.2.0',
        description: [
          'Primary REST API for SiteCRM. Handles authentication, lead management,',
          'outreach, notifications, site generation, and deployments.',
          '',
          '**Authentication:** Most endpoints require a Bearer JWT. Obtain a token via',
          '`POST /api/auth/login` or `POST /api/auth/register` and pass it as',
          '`Authorization: Bearer <token>`.',
          '',
          '**Common error responses:** `400` (validation — unknown/invalid fields),',
          '`401` (missing/invalid/expired token), `503` (database unavailable). All',
          'errors use the shared `ErrorResponse` schema.',
        ].join('\n'),
        contact: { name: 'Riverfront Labs' },
      },
      servers: [
        { url: 'http://api.localhost', description: 'Local development (Traefik)' },
        { url: 'http://localhost:3000', description: 'Direct local development' },
      ],
      tags: [
        { name: 'system', description: 'Health and operational endpoints' },
        { name: 'auth', description: 'Registration, login, and current-user' },
        { name: 'leads', description: 'Lead pipeline — CRUD, notes, contact events' },
        { name: 'notifications', description: 'In-app notification inbox and real-time SSE stream' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      // Protected by default; public routes (health, login, register) opt out
      // with `security: []` in their own schema.
      security: [{ bearerAuth: [] }],
    },
    // Name shared (addSchema) components by their `$id` instead of `def-N`,
    // so the generated spec reads `#/components/schemas/ErrorResponse`.
    refResolver: {
      buildLocalReference: (json, _baseUri, fragment, i) =>
        (typeof json.$id === 'string' && json.$id) || `${fragment}-${i}`,
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  // Shared error envelope — registered once so it appears as a single reusable
  // component and every route can `$ref` it (see routes/shared-schemas.ts).
  app.addSchema(errorSchema);

  // Decorates app.authenticate — used as preHandler on protected routes.
  await app.register(authPlugin);

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api', db });
  await app.register(leadRoutes, { prefix: '/api', db });
  await app.register(notificationRoutes, { prefix: '/api', db });

  return app;
}
