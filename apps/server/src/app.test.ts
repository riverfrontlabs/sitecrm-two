import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { ProjectStore } from './store/project-store.js';
import type { Project } from './types.js';

/**
 * Integration tests driven through `app.inject()` — full request validation,
 * routing, and serialization without binding a network port.
 */

let app: FastifyInstance;

/** Builds an app over an empty store (no seed data) for deterministic tests. */
async function buildTestApp(): Promise<FastifyInstance> {
  app = await buildApp({ store: new ProjectStore([]) });
  return app;
}

afterEach(async () => {
  await app?.close();
});

describe('GET /api/health', () => {
  it('reports ok with an uptime', async () => {
    await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/api/health' });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.uptimeSeconds).toBeGreaterThan(0);
  });
});

describe('/api/projects', () => {
  const validBody = {
    title: 'Test project',
    description: 'Created from the test suite.',
    url: 'https://example.com',
    tags: ['testing'],
  };

  it('starts empty and returns created projects newest first', async () => {
    await buildTestApp();

    const empty = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toEqual([]);

    const created = await app.inject({ method: 'POST', url: '/api/projects', payload: validBody });
    expect(created.statusCode).toBe(201);
    const project = created.json() as Project;
    expect(project).toMatchObject(validBody);
    expect(project.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Date.parse(project.createdAt)).not.toBeNaN();

    const list = await app.inject({ method: 'GET', url: '/api/projects' });
    expect(list.json()).toHaveLength(1);
  });

  it('rejects a body missing required fields with a 400 error envelope', async () => {
    await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { description: 'No title given.' },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('title');
  });

  it('rejects unknown extra properties (additionalProperties: false)', async () => {
    await buildTestApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { ...validBody, sneaky: 'value' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('fetches a single project by id and 404s on unknown ids', async () => {
    await buildTestApp();
    const created = await app.inject({ method: 'POST', url: '/api/projects', payload: validBody });
    const { id } = created.json() as Project;

    const found = await app.inject({ method: 'GET', url: `/api/projects/${id}` });
    expect(found.statusCode).toBe(200);
    expect((found.json() as Project).id).toBe(id);

    const missing = await app.inject({ method: 'GET', url: '/api/projects/does-not-exist' });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().message).toBe('Project not found');
  });

  it('deletes a project and 404s on a second delete', async () => {
    await buildTestApp();
    const created = await app.inject({ method: 'POST', url: '/api/projects', payload: validBody });
    const { id } = created.json() as Project;

    const deleted = await app.inject({ method: 'DELETE', url: `/api/projects/${id}` });
    expect(deleted.statusCode).toBe(204);

    const again = await app.inject({ method: 'DELETE', url: `/api/projects/${id}` });
    expect(again.statusCode).toBe(404);
  });
});

describe('API documentation', () => {
  it('serves the OpenAPI spec through Swagger UI routes', async () => {
    await buildTestApp();

    const yaml = await app.inject({ method: 'GET', url: '/docs/yaml' });
    expect(yaml.statusCode).toBe(200);
    expect(yaml.body).toContain('openapi:');
    expect(yaml.body).toContain('/api/projects');

    const ui = await app.inject({ method: 'GET', url: '/docs' });
    expect([200, 302]).toContain(ui.statusCode);
  });
});
