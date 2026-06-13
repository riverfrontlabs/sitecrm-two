/**
 * Application factory for the SiteCRM Intelligence API.
 *
 * `buildApp` constructs a fully configured Fastify instance without binding a
 * port — the same app-factory pattern used in `apps/server` for testability.
 *
 * This service is responsible for:
 * - Scraping prospect websites with Playwright
 * - Scoring and enriching leads via OpenAI
 * - Accepting job requests from the main server and streaming progress
 *
 * Registered plugins:
 * - `@fastify/cors`        — restricted to the internal Docker network in prod
 * - `@fastify/swagger`     — GENERATES the OpenAPI spec from route schemas
 * - `@fastify/swagger-ui`  — interactive Swagger UI at `/docs` (+ /docs/json,/yaml)
 *
 * Route groups:
 * - `/health`       — liveness probe
 * - `/v1/scrape`    — Playwright-based website scraper
 * - `/v1/score`     — OpenAI lead scoring
 * - `/v1/enrich`    — combined scrape + score enrichment pipeline
 */
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance } from 'fastify';
import { healthRoutes } from './routes/health.js';
import { scrapeRoutes } from './routes/scrape.js';
import { scoreRoutes } from './routes/score.js';
import { enrichRoutes } from './routes/enrich.js';

/** Options for {@link buildApp}. */
export interface BuildAppOptions {
  /** Enable Fastify's built-in pino request logger. Off by default so tests stay quiet. */
  logger?: boolean;
  /**
   * OpenAI API key. Defaults to the `OPENAI_API_KEY` environment variable.
   * Override in tests to use a stub key without touching the environment.
   */
  openaiApiKey?: string;
}

/**
 * Builds a fully configured Fastify instance without binding a port.
 *
 * @param options - See {@link BuildAppOptions}.
 * @returns The configured (not yet listening) Fastify instance.
 *
 * @example
 * // Production
 * const app = await buildApp({ logger: true });
 *
 * @example
 * // Test
 * const app = await buildApp({ openaiApiKey: 'test-key' });
 * const res = await app.inject({ method: 'GET', url: '/health' });
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { logger = false, openaiApiKey = process.env.OPENAI_API_KEY ?? '' } = options;

  const app = Fastify({ logger });

  // Intelligence API is called only from the main server container. Lock CORS
  // down via CORS_ORIGIN; fail CLOSED in production if it's unset (an open
  // default on an internal service is a footgun), but stay open in dev.
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'production'
      ? false
      : true;
  await app.register(cors, { origin: corsOrigin });

  // OpenAPI spec is GENERATED from the route schemas (dynamic mode) — no
  // hand-maintained YAML to drift.
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'SiteCRM Intelligence API',
        version: '0.1.0',
        description: [
          'Internal service for lead intelligence: Playwright-based website scraping,',
          'OpenAI-powered scoring, and a combined enrichment pipeline.',
          '',
          'Called by the main SiteCRM server, not the browser. Access is restricted to',
          'the internal network in production via the `CORS_ORIGIN` env var.',
        ].join('\n'),
      },
      servers: [
        { url: 'http://intelligence.localhost', description: 'Local development (Traefik)' },
        { url: 'http://localhost:3001', description: 'Direct local development' },
      ],
      tags: [
        { name: 'system', description: 'Health and operational endpoints' },
        { name: 'intelligence', description: 'Lead scraping, scoring, and enrichment' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  // Decorate the instance so route handlers can access the OpenAI key without
  // importing process.env directly (makes testing cleaner).
  app.decorate('openaiApiKey', openaiApiKey);

  await app.register(healthRoutes);
  await app.register(scrapeRoutes, { prefix: '/v1' });
  await app.register(scoreRoutes, { prefix: '/v1' });
  await app.register(enrichRoutes, { prefix: '/v1' });

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    openaiApiKey: string;
  }
}
