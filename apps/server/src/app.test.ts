import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

/**
 * Integration tests driven through `app.inject()` — full request validation,
 * routing, auth, and serialization without binding a network port or a
 * database. Routes that need persistence are built with no `db`, so they
 * exercise the `503` guard; validation and auth run before the handler, so
 * those paths are fully testable here. CRUD-against-Postgres belongs in a
 * separate suite with a test database.
 */

let app: FastifyInstance;

async function build(opts: Parameters<typeof buildApp>[0] = {}): Promise<FastifyInstance> {
  app = await buildApp({ jwtSecret: 'test-secret', ...opts });
  return app;
}

afterEach(async () => {
  await app?.close();
});

describe('health', () => {
  it('GET /api/health returns 200 without a database', async () => {
    await build();
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
  });
});

describe('request validation', () => {
  beforeEach(async () => {
    await build();
  });

  it('rejects unknown properties (additionalProperties: false)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'a@b.com', password: 'password123', firstName: 'A', lastName: 'B', role: 'admin' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Bad Request');
  });

  it('rejects a missing required field', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'a@b.com' } });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-http(s) website on lead create (XSS/SSRF scheme guard)', async () => {
    const token = app.jwt.sign({ sub: 'u1', email: 'a@b.com' });
    const res = await app.inject({
      method: 'POST',
      url: '/api/leads',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Acme', website: 'javascript:alert(1)' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('authentication', () => {
  beforeEach(async () => {
    await build();
  });

  it('returns 401 for a protected route with no token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/leads',
      headers: { authorization: 'Bearer not-a-real-token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('does NOT accept ?token= on a non-SSE protected route', async () => {
    const token = app.jwt.sign({ sub: 'u1', email: 'a@b.com' });
    // /auth/me has no querystring schema, so the param isn't rejected at
    // validation — this isolates the auth guard. The header-only `authenticate`
    // decorator must ignore the query token, leaving the request unauthorized.
    const res = await app.inject({ method: 'GET', url: `/api/auth/me?token=${token}` });
    expect(res.statusCode).toBe(401);
  });
});

describe('database-unavailable guard', () => {
  it('returns 503 when a valid token reaches a db-backed route with no database', async () => {
    await build(); // no db
    const token = app.jwt.sign({ sub: 'u1', email: 'a@b.com' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/leads',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('Service Unavailable');
  });
});
