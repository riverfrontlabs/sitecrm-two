/**
 * Fastify plugin that decorates the instance with `app.authenticate`.
 *
 * `app.authenticate` is used as a `preHandler` on any route that requires a
 * signed-in user.  It verifies the Bearer token from the `Authorization` header
 * or the `?token=` query parameter.
 *
 * The query-parameter fallback exists because EventSource (SSE) connections
 * cannot set custom headers — the token is passed as `?token=<jwt>` instead.
 *
 * Requires `@fastify/jwt` to be registered on the Fastify instance before this
 * plugin is registered.
 *
 * @example
 * // In a protected route:
 * app.get('/api/leads', { preHandler: [app.authenticate] }, async (request) => {
 *   const { sub } = request.user; // userId
 * });
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

async function authPlugin(app: FastifyInstance) {
  app.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      try {
        // SSE streams pass the token as ?token= since EventSource can't set headers.
        const query = request.query as Record<string, string>;
        if (query?.token && !request.headers.authorization) {
          request.headers.authorization = `Bearer ${query.token}`;
        }
        await request.jwtVerify();
      } catch {
        await reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
      }
    },
  );
}

/**
 * Wrapping with `fastify-plugin` skips Fastify's plugin encapsulation so the
 * `authenticate` decorator is visible to all routes, not just the ones
 * registered after this plugin in the same scope.
 */
export default fp(authPlugin, { name: 'auth' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
