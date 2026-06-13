/**
 * Production/development entry point for the SiteCRM API.
 *
 * Loads environment variables, selects a database driver, builds the app via
 * {@link buildApp}, and binds it to a port.  All wiring lives in `app.ts` so
 * tests can construct the identical application without opening a socket.
 *
 * Database driver selection (via {@link createDb}):
 * - `DATABASE_URL` contains `neon.tech` → Neon serverless driver (WebSockets)
 * - Otherwise                           → standard pg connection pool
 *
 * Environment variables (see `.env.example`):
 * - `DATABASE_URL` — Postgres connection string (required for database routes)
 * - `JWT_SECRET`   — JWT signing secret (required; warns if missing)
 * - `PORT`         — listen port (default `3000`)
 * - `HOST`         — bind address (default `127.0.0.1`; containers set `0.0.0.0`)
 */
import { buildApp } from './app.js';
import { createDb } from './db/index.js';

try {
  // Node's built-in dotenv (21.7+): loads ./.env relative to the working
  // directory. Optional by design — absence simply means "use actual env".
  process.loadEnvFile();
} catch {
  // No .env file present; environment comes from the actual environment.
}

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[server] JWT_SECRET is not set. Refusing to start in production with an insecure fallback.');
    process.exit(1);
  }
  console.warn('[server] JWT_SECRET is not set — using an insecure dev fallback. Set it in .env.');
}

const db = DATABASE_URL ? await createDb(DATABASE_URL) : undefined;
const app = await buildApp({ logger: true, db, jwtSecret: JWT_SECRET });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`storage: ${DATABASE_URL ? 'postgres' : 'none (DATABASE_URL not set)'}`);
  app.log.info(`API docs at http://${HOST}:${PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
