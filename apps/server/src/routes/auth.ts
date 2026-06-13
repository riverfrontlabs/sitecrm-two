/**
 * Authentication route group — register, login, and current-user.
 *
 * Passwords are hashed with bcrypt (cost factor 12) before storage.
 * On success, both register and login return a signed JWT plus the public
 * {@link User} record.  The JWT payload contains `{ sub: userId, email }`.
 *
 * These schemas mirror `components/schemas` in `openapi/openapi.yaml` — keep
 * them in sync when changing the request/response shapes.
 */
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import type { Database } from '../app.js';
import { users } from '../db/schema.js';

const BCRYPT_ROUNDS = 12;

// ── JSON Schemas (mirror openapi.yaml components/schemas) ────────────────────

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

const errorSchema = {
  type: 'object',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
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
 * Maps to the `auth`-tagged operations in `openapi/openapi.yaml`.
 */
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, opts) => {
  const { db } = opts;

  /** operationId: registerUser */
  app.post<{ Body: { email: string; password: string; firstName: string; lastName: string } }>(
    '/auth/register',
    {
      schema: {
        body: registerBodySchema,
        response: { 201: authResponseSchema, 409: errorSchema },
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

  /** operationId: loginUser */
  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    {
      schema: {
        body: loginBodySchema,
        response: { 200: authResponseSchema, 401: errorSchema },
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

  /** operationId: getCurrentUser */
  app.get(
    '/auth/me',
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: userSchema, 401: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });

      const payload = request.user as { sub: string };
      const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
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
