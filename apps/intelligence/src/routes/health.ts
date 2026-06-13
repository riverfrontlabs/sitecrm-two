import type { FastifyPluginAsync } from 'fastify';

/**
 * Liveness probe — returns `200 { status: "ok" }`.
 *
 * Used by Docker health checks and load balancers to verify the process is
 * responsive without exercising any external dependencies (database, OpenAI).
 */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', { schema: { response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } } }, async () => ({
    status: 'ok',
  }));
};
