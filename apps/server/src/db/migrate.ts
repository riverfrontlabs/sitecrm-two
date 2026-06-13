/**
 * Database migration runner.
 *
 * Applies all pending Drizzle migrations from `src/db/migrations/` against the
 * database specified by `DATABASE_URL`.  Run this before starting the server in
 * any environment (the `docker-compose.yml` does this automatically via the
 * server container's `command`).
 *
 * Usage:
 *   npm run db:migrate -w @sitecrm/server
 *
 * The script exits with code 0 on success and code 1 on failure so that CI
 * pipelines and container health checks can distinguish migration errors from
 * application errors.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  process.loadEnvFile();
} catch {
  // No .env — use actual environment.
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const migrationsFolder = resolve(__dirname, 'migrations');
const isNeon = connectionString.includes('neon.tech');

if (isNeon) {
  const { Pool } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const { migrate } = await import('drizzle-orm/neon-serverless/migrator');
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool });
  await migrate(db, { migrationsFolder });
  await pool.end();
} else {
  const pg = await import('pg');
  const { drizzle } = await import('drizzle-orm/node-postgres');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const pool = new pg.default.Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  await pool.end();
}

console.log('Migrations applied successfully.');
