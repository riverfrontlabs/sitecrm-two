import type { FastifyPluginAsync } from 'fastify';

/**
 * Score request body — scraped lead data to evaluate.
 *
 * All fields are optional; the scorer uses whichever signals are present.
 * A richer payload produces a more accurate score.
 */
interface ScoreBody {
  leadId: string;
  name: string;
  website?: string;
  pageTitle?: string;
  pageDescription?: string;
  rating?: number;
  reviews?: number;
  businessType?: string;
}

const scoreBodySchema = {
  type: 'object',
  required: ['leadId', 'name'],
  additionalProperties: false,
  properties: {
    leadId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    website: { type: 'string', format: 'uri' },
    pageTitle: { type: 'string' },
    pageDescription: { type: 'string' },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    reviews: { type: 'integer', minimum: 0 },
    businessType: { type: 'string' },
  },
} as const;

/**
 * `/v1/score` — OpenAI-powered lead scoring.
 *
 * Evaluates the provided lead data and returns a 0–100 score, a letter grade,
 * and a short human-readable summary explaining the score.
 *
 * Phase 5 implementation: GPT-4o structured-output scoring with few-shot
 * calibration examples.
 */
export const scoreRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: ScoreBody }>(
    '/score',
    {
      schema: {
        tags: ['intelligence'],
        summary: 'Score a lead',
        description: 'Evaluates the supplied lead signals and returns a 0–100 score, letter grade, and rationale.',
        operationId: 'scoreLead',
        body: scoreBodySchema,
        response: {
          200: {
            type: 'object',
            properties: {
              leadId: { type: 'string' },
              score: { type: 'number', description: '0–100 composite score' },
              grade: { type: 'string', description: 'A / B / C / D / F' },
              notes: { type: 'string', description: 'Short scoring rationale' },
            },
          },
        },
      },
    },
    async (request) => {
      const { leadId } = request.body;
      // Phase 5: replace stub with OpenAI scoring pipeline.
      return { leadId, score: 0, grade: 'N/A', notes: 'Scoring not yet implemented.' };
    },
  );
};
