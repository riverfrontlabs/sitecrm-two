import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

/**
 * Smoke tests for the Intelligence service: health, the SSRF guard on
 * /v1/scrape, and that the OpenAPI spec is generated from the route schemas.
 */

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({ openaiApiKey: 'test-key' });
});

afterEach(async () => {
  await app?.close();
});

describe('health', () => {
  it('GET /health returns 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});

describe('SSRF guard', () => {
  it('rejects a private/metadata scrape target with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/scrape',
      payload: { url: 'http://169.254.169.254/latest/meta-data/' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a non-http(s) scheme with 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/scrape',
      payload: { url: 'file:///etc/passwd' },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('generated OpenAPI spec', () => {
  it('serves a generated spec at /docs/json with the route operations', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    expect(res.statusCode).toBe(200);
    const spec = res.json();
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.paths['/v1/scrape'].post.operationId).toBe('scrapeWebsite');
    expect(spec.paths['/v1/scrape'].post.responses['400']).toBeDefined();
  });
});
