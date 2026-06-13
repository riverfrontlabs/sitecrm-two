/**
 * Drizzle Kit configuration — used by `drizzle-kit generate` and `drizzle-kit push`.
 *
 * Migration SQL files are written to `src/db/migrations/`.  Commit them to git
 * so the migration runner in `src/db/migrate.ts` can apply them in every
 * environment (local, CI, production).
 *
 * Usage:
 *   npm run db:generate -w @sitecrm/server   # generate a new migration
 *   npm run db:migrate  -w @sitecrm/server   # apply pending migrations
 *   npm run db:studio   -w @sitecrm/server   # open Drizzle Studio
 */
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to run Drizzle Kit commands.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
