/**
 * Production/development entry point for the Intelligence API.
 *
 * Loads environment variables, builds the app via {@link buildApp}, and binds
 * it to a port.  All wiring lives in `app.ts` so tests can construct the
 * identical application without opening a socket.
 *
 * Environment variables (see `.env.example`):
 * - `OPENAI_API_KEY` — required for scoring and enrichment routes
 * - `PORT`           — listen port (default `3001`)
 * - `HOST`           — bind address (default `127.0.0.1`; containers set `0.0.0.0`)
 * - `CORS_ORIGIN`    — allowed CORS origin (default `*` in dev)
 */
import { buildApp } from './app.js';

try {
  // Node's built-in dotenv (21.7+). Optional — absence means use actual env.
  process.loadEnvFile();
} catch {
  // No .env file present; environment comes from the actual environment.
}

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

const app = await buildApp({ logger: true });

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info({ signal }, 'shutting down');
    void app.close().then(() => process.exit(0));
  });
}

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Intelligence API docs at http://${HOST}:${PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
