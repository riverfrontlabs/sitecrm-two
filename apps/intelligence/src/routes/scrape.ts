import type { FastifyPluginAsync } from 'fastify';

/**
 * Scrape request body — the URL to analyse.
 *
 * Phase 5 will expand this with options for screenshot capture, tech-stack
 * detection, and structured data extraction (Open Graph, JSON-LD, etc.).
 */
interface ScrapeBody {
  url: string;
}

const scrapeBodySchema = {
  type: 'object',
  required: ['url'],
  additionalProperties: false,
  properties: {
    url: { type: 'string', format: 'uri' },
  },
} as const;

/**
 * `/v1/scrape` — Playwright-based website scraper.
 *
 * Navigates to the target URL using a headless Chromium browser and returns
 * structured metadata: page title, description, detected tech stack, and a
 * base-64 screenshot thumbnail.
 *
 * Phase 5 implementation: full Playwright integration, tech-stack fingerprinting,
 * and structured JSON-LD / Open Graph extraction.
 */
export const scrapeRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ScrapeBody }>(
    '/scrape',
    {
      schema: {
        body: scrapeBodySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              screenshot: { type: 'string', description: 'Base-64 encoded PNG thumbnail' },
            },
          },
        },
      },
    },
    async (request) => {
      const { url } = request.body;
      // Phase 5: replace stub with Playwright scrape pipeline.
      return { url, title: '', description: '', screenshot: '' };
    },
  );
};
