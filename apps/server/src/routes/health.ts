import type { FastifyPluginAsync } from 'fastify';

/**
 * `GET /health` — liveness probe.
 *
 * Documented as `getHealth` in `openapi/openapi.yaml`. The response schema
 * below both validates and *serializes* the reply (Fastify strips any
 * property not listed here), keeping the wire format locked to the spec.
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
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
