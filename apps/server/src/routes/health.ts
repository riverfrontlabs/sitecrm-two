import type { FastifyPluginAsync } from 'fastify';

/**
 * `GET /health` — liveness probe.
 *
 * The response schema below both validates and *serializes* the reply (Fastify
 * strips any property not listed here) and is the source for the `getHealth`
 * operation in the generated OpenAPI spec.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['system'],
        summary: 'Liveness probe',
        description: 'Returns `200 { status: "ok" }` whenever the process is responsive. Does not touch the database.',
        operationId: 'getHealth',
        security: [], // public
        response: {
          200: {
            type: 'object',
            required: ['status', 'uptimeSeconds'],
            properties: {
              status: { type: 'string', enum: ['ok'] },
              uptimeSeconds: { type: 'number' },
            },
          },
        },
      },
    },
    async () => ({ status: 'ok' as const, uptimeSeconds: process.uptime() }),
  );
};
