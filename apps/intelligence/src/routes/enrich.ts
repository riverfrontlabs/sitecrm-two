import type { FastifyPluginAsync } from 'fastify';
import { UnsafeUrlError, assertSafeScrapeUrl } from '../lib/url-guard.js';

/**
 * Enrich request body — minimal lead identity to kick off the pipeline.
 */
interface EnrichBody {
  leadId: string;
  website?: string;
  name: string;
  businessType?: string;
}

const enrichBodySchema = {
  type: 'object',
  required: ['leadId', 'name'],
  additionalProperties: false,
  properties: {
    leadId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    website: { type: 'string', format: 'uri' },
    businessType: { type: 'string' },
  },
} as const;

/**
 * `/v1/enrich` — combined scrape → score enrichment pipeline.
 *
 * Runs {@link scrapeRoutes `/v1/scrape`} then {@link scoreRoutes `/v1/score`}
 * in sequence and returns a unified enrichment payload that the main server
 * can persist directly to the `leads` table.
 *
 * This endpoint is idempotent: re-enriching a lead overwrites the previous
 * results; the main server records each enrichment as a background job.
 *
 * Phase 5 implementation: full pipeline with Playwright + GPT-4o.
 */
export const enrichRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: EnrichBody }>(
    '/enrich',
    {
      schema: {
        tags: ['intelligence'],
        summary: 'Enrich a lead',
        description: 'Combined scrape → score pipeline. Returns a unified enrichment payload the main server persists to the lead.',
        operationId: 'enrichLead',
        body: enrichBodySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              leadId: { type: 'string' },
              websiteScore: { type: 'number' },
              websiteGrade: { type: 'string' },
              websiteNotes: { type: 'string' },
              score: { type: 'number' },
            },
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'integer' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      // The pipeline scrapes `website`, so apply the same SSRF guard when present.
      preHandler: async (request, reply) => {
        if (!request.body.website) return;
        try {
          await assertSafeScrapeUrl(request.body.website);
        } catch (err) {
          const message = err instanceof UnsafeUrlError ? err.message : 'Invalid URL.';
          return reply.status(400).send({ statusCode: 400, error: 'Bad Request', message });
        }
      },
    },
    async (request) => {
      const { leadId } = request.body;
      // Phase 5: replace stub with full enrichment pipeline.
      return { leadId, websiteScore: 0, websiteGrade: 'N/A', websiteNotes: '', score: 0 };
    },
  );
};
