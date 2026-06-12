/**
 * Production/development entry point.
 *
 * Builds the app via {@link buildApp} and binds it to a port. All wiring
 * lives in `app.ts` so tests can construct the identical application
 * without opening a socket.
 *
 * Storage backend selection:
 * - `DATABASE_URL` set   → {@link PostgresProjectStore} (persistent).
 *   This is how the API runs under `docker compose up`, and how local dev
 *   connects to the compose-managed Postgres container.
 * - `DATABASE_URL` unset → {@link MemoryProjectStore} (reseeded each start).
 *
 * Environment variables (see `.env.example`; a local `.env` file in this
 * package is loaded automatically when present):
 * - `DATABASE_URL` — Postgres connection string (optional, see above)
 * - `PORT` — listen port (default `3001`)
 * - `HOST` — bind address (default `127.0.0.1`; containers set `0.0.0.0`)
 */
import { buildApp } from './app.js';
import { MemoryProjectStore } from './store/memory-project-store.js';
import { PostgresProjectStore } from './store/postgres-project-store.js';
import type { ProjectStore } from './store/project-store.js';

try {
  // Node's built-in dotenv (21.7+): loads ./.env relative to the working
  // directory. Optional by design — absence simply means "use defaults".
  process.loadEnvFile();
} catch {
  // No .env file present; environment comes from the actual environment.
}

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';
const DATABASE_URL = process.env.DATABASE_URL;

/** Builds the storage backend dictated by the environment (see module JSDoc). */
async function createStore(): Promise<ProjectStore> {
  if (DATABASE_URL) {
    const store = new PostgresProjectStore(DATABASE_URL);
    await store.init();
    return store;
  }
  return new MemoryProjectStore();
}

const store = await createStore();
const app = await buildApp({ logger: true, store });

// Dispose the store (close the pg pool) whenever Fastify shuts down.
app.addHook('onClose', async () => {
  await store.dispose?.();
});

// Docker (and most process managers) stop containers with SIGTERM; close
// gracefully so in-flight requests finish and the pool drains.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`storage: ${DATABASE_URL ? 'postgres' : 'in-memory'}`);
  app.log.info(`API docs available at http://${HOST}:${PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
