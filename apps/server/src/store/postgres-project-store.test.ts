import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgresProjectStore } from './postgres-project-store.js';

/**
 * Integration tests for the Postgres store — they need a real database, so
 * the whole suite is skipped unless `TEST_DATABASE_URL` is set. To run them
 * against the compose-managed container:
 *
 *   docker compose up -d db
 *   TEST_DATABASE_URL=postgres://sitetwo:sitetwo@localhost:5432/sitetwo npm test -w @sitetwo/server
 *
 * The suite only ever touches rows it created itself, so it is safe to run
 * against a development database.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DATABASE_URL)('PostgresProjectStore (integration)', () => {
  let store: PostgresProjectStore;

  beforeAll(async () => {
    store = new PostgresProjectStore(TEST_DATABASE_URL as string);
    await store.init();
  });

  afterAll(async () => {
    await store?.dispose();
  });

  it('persists a created project and returns it from list() and get()', async () => {
    const created = await store.create({
      title: 'pg integration test',
      description: 'Round-trips through a real database.',
      url: 'https://example.com',
      tags: ['integration'],
    });

    try {
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(Date.parse(created.createdAt)).not.toBeNaN();

      const fetched = await store.get(created.id);
      expect(fetched).toEqual(created);

      const listed = await store.list();
      expect(listed.map((p) => p.id)).toContain(created.id);
    } finally {
      await store.remove(created.id);
    }
  });

  it('omits url for rows where it is NULL, matching the OpenAPI contract', async () => {
    const created = await store.create({ title: 'no url', description: 'url left unset.' });
    try {
      expect('url' in created).toBe(false);
      expect(created.tags).toEqual([]);
    } finally {
      await store.remove(created.id);
    }
  });

  it('remove() reports whether a row was actually deleted', async () => {
    const created = await store.create({ title: 'to delete', description: 'temporary.' });
    await expect(store.remove(created.id)).resolves.toBe(true);
    await expect(store.remove(created.id)).resolves.toBe(false);
    await expect(store.get(created.id)).resolves.toBeUndefined();
  });

  it('tolerates malformed ids instead of throwing on the uuid cast', async () => {
    await expect(store.get('not-a-uuid')).resolves.toBeUndefined();
    await expect(store.remove('not-a-uuid')).resolves.toBe(false);
  });
});
