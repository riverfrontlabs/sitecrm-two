import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { openapiPlugin } from './plugins/openapi.js';
import { healthRoutes } from './routes/health.js';
import { projectRoutes } from './routes/projects.js';
import { MemoryProjectStore } from './store/memory-project-store.js';
import type { ProjectStore } from './store/project-store.js';

/** Options for {@link buildApp}. */
export interface BuildAppOptions {
  /** Enable request logging. Off by default so tests stay quiet. */
  logger?: boolean;
  /**
   * Storage backend. Defaults to a seeded in-memory store; `server.ts`
   * passes a {@link PostgresProjectStore} when `DATABASE_URL` is set, and
   * tests inject empty or purpose-built stores.
   */
  store?: ProjectStore;
}

/**
 * Builds a fully configured Fastify instance without binding a port.
 *
 * This app-factory pattern is what makes the API testable: production code
 * (`server.ts`) builds an app and calls `listen()`, while tests build the
 * same app and drive it with `inject()` — identical wiring, no sockets.
 *
 * Registered here:
 * - CORS (open in development; the web app calls from another origin/port)
 * - `/api`-prefixed routes: health probe and the projects resource
 * - `/docs`: Swagger UI serving `openapi/openapi.yaml`
 *
 * @param options - See {@link BuildAppOptions}.
 * @returns The configured (not yet listening) Fastify instance.
 *
 * @example
 * const app = await buildApp();
 * const res = await app.inject({ method: 'GET', url: '/api/health' });
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = false, store = new MemoryProjectStore() } = options;

  const app = Fastify({
    logger,
    ajv: {
      customOptions: {
        // Fastify's default is to silently strip properties that violate
        // `additionalProperties: false`. The OpenAPI spec promises a 400
        // instead, so make validation reject them.
        removeAdditional: false,
      },
    },
  });

  // The web dev server (vite, port 5173) proxies /api in development, but an
  // open CORS policy also allows direct calls from tools and previews.
  await app.register(cors, { origin: true });

  await app.register(healthRoutes, { prefix: '/api' });
  await app.register(projectRoutes, { prefix: '/api', store });
  await app.register(openapiPlugin);

  return app;
}
