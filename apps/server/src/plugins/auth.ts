/**
 * Fastify plugin that decorates the instance with JWT auth guards.
 *
 * Two `preHandler` decorators are provided:
 *
 * - `app.authenticate` — the default. Verifies the Bearer token from the
 *   `Authorization` header only. Use on every protected route.
 *
 * - `app.authenticateSSE` — for Server-Sent Events endpoints only. Accepts the
 *   token from a `?token=<jwt>` query parameter as a fallback, because the
 *   browser's `EventSource` API cannot set custom request headers. This is kept
 *   separate from `authenticate` on purpose: tokens in URLs leak into access
 *   logs, proxy logs, and `Referer` headers, so the query-string path must be
 *   opt-in per route rather than applied globally.
 *
 * Requires `@fastify/jwt` to be registered on the Fastify instance before this
 * plugin is registered.
 *
 * @example
 * // In a protected route:
 * app.get('/api/leads', { preHandler: [app.authenticate] }, async (request) => {
 *   const { sub } = request.user; // userId — typed via the FastifyJWT augmentation below
 * });
 */
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { JwtPayload } from '@sitecrm/types';
import fp from 'fastify-plugin';

async function authPlugin(app: FastifyInstance) {
  async function verify(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      await request.jwtVerify();
    } catch {
      await reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  }

  // Header-only: the safe default for all protected routes.
  app.decorate('authenticate', verify);

  // SSE-only: promotes a `?token=` query param into the Authorization header
  // before verifying. Restricted to streaming routes for the reasons above.
  app.decorate(
    'authenticateSSE',
    async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const token = (request.query as { token?: unknown } | undefined)?.token;
      if (typeof token === 'string' && token.length > 0 && !request.headers.authorization) {
        request.headers.authorization = `Bearer ${token}`;
      }
      await verify(request, reply);
    },
  );
}

/**
 * Wrapping with `fastify-plugin` skips Fastify's plugin encapsulation so the
 * decorators are visible to all routes, not just the ones registered after this
 * plugin in the same scope.
 */
export default fp(authPlugin, { name: 'auth' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateSSE: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Type the JWT payload so `request.user` and `app.jwt.sign(...)` are checked
// against the real shape instead of `any`. This removes the need for
// `request.user as { sub: string }` casts throughout the routes.
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
