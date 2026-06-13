/**
 * Drizzle database connection factory.
 *
 * Selects the correct driver based on the `DATABASE_URL` connection string:
 * - Neon (`*.neon.tech`) → `@neondatabase/serverless` via WebSockets — required
 *   for Neon's serverless edge runtime.
 * - Everything else (local Docker Postgres, RDS, etc.) → `drizzle-orm/node-postgres`
 *   via a standard pg connection pool.
 *
 * Both paths export a Drizzle instance typed with the full schema so that all
 * query results are inferred correctly throughout the server.
 *
 * @example
 * import { createDb } from './db/index.js';
 * const db = await createDb(process.env.DATABASE_URL);
 */
import * as schema from './schema.js';

export type { Database } from '../app.js';

/**
 * Creates and returns a Drizzle database instance.
 *
 * The function is async because dynamic `import()` is used to load the correct
 * driver at runtime without bundling both drivers into every deployment.
 *
 * @param connectionString - Standard PostgreSQL URL.
 * @throws {Error} If `connectionString` is empty or undefined.
 */
export async function createDb(connectionString: string) {
  if (!connectionString) {
    throw new Error('DATABASE_URL is required but was not set.');
  }

  const isNeon = connectionString.includes('neon.tech');

  if (isNeon) {
    const { Pool } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-serverless');
    const pool = new Pool({ connectionString });
    return drizzle({ client: pool, schema });
  }

  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const pool = new pg.default.Pool({ connectionString });
  return drizzle(pool, { schema });
}
