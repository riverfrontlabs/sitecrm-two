/**
 * Authentication route group — register, login, and current-user.
 *
 * Passwords are hashed with bcrypt (cost factor 12) before storage.
 * On success, both register and login return a signed JWT plus the public
 * {@link User} record.  The JWT payload contains `{ sub: userId, email }`.
 *
 * These JSON schemas are the source for the generated OpenAPI `auth`
 * operations (dynamic `@fastify/swagger`) — there is no separate spec file.
 */
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import type { Database } from '../app.js';
import { users } from '../db/schema.js';
import { errorRef } from './shared-schemas.js';

const BCRYPT_ROUNDS = 12;

// ── JSON Schemas — the source for the generated OpenAPI `auth` operations ────

const registerBodySchema = {
  type: 'object',
  required: ['email', 'password', 'firstName', 'lastName'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email', maxLength: 255 },
    password: { type: 'string', minLength: 8, maxLength: 72 },
    firstName: { type: 'string', minLength: 1, maxLength: 100 },
    lastName: { type: 'string', minLength: 1, maxLength: 100 },
  },
} as const;

const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  additionalProperties: false,
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 1 },
  },
} as const;

const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const authResponseSchema = {
  type: 'object',
  properties: {
    token: { type: 'string' },
    user: userSchema,
  },
} as const;

// ── Plugin ────────────────────────────────────────────────────────────────────

export interface AuthRoutesOptions {
  /** Drizzle database instance. When omitted, auth routes return 503. */
  db?: Database;
}

/**
 * `/api/auth` route group — register, login, current-user.
 *
 * Generates the `auth`-tagged operations in the OpenAPI spec served at `/docs`.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, opts) => {
  const { db } = opts;

  app.post<{ Body: { email: string; password: string; firstName: string; lastName: string } }>(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create a new account',
        description: 'Creates a user with a bcrypt-hashed password (cost 12) and returns a signed JWT plus the public user object.',
        operationId: 'registerUser',
        security: [], // public
        body: registerBodySchema,
        response: { 201: authResponseSchema, 400: errorRef, 409: errorRef, 503: errorRef },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });

      const { email, password, firstName, lastName } = request.body;

      const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existing.length > 0) {
        return reply.status(409).send({ statusCode: 409, error: 'Conflict', message: 'An account with that email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash, firstName, lastName })
        .returning();

      if (!user) throw new Error('INSERT … RETURNING produced no row.');

      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.status(201).send({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    },
  );

  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in to an existing account',
        description: 'Verifies credentials and returns a signed JWT. Returns 401 for any mismatch — does not reveal whether the email exists.',
        operationId: 'loginUser',
        security: [], // public
        body: loginBodySchema,
        response: { 200: authResponseSchema, 400: errorRef, 401: errorRef, 503: errorRef },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });

      const { email, password } = request.body;

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      // Use a constant-time compare even on missing users to prevent timing attacks.
      const hash = user?.passwordHash ?? '$2b$12$invalidhashpadding000000000000000000000000000000000000';
      const valid = await bcrypt.compare(password, hash);

      if (!user || !valid) {
        return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid email or password' });
      }

      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return reply.status(200).send({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      });
    },
  );

  app.get(
    '/auth/me',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get the current user',
        description: 'Returns the authenticated user resolved from the Bearer token.',
        operationId: 'getCurrentUser',
        response: { 200: userSchema, 401: errorRef, 503: errorRef },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });

      const [user] = await db.select().from(users).where(eq(users.id, request.user.sub)).limit(1);
      if (!user) return reply.status(401).send({ statusCode: 401, error: 'Unauthorized', message: 'User not found' });

      return reply.send({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    },
  );
};
