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
  // Node's built-in env-file loader (requires Node >= 20.12; see package.json
  // engines). Optional — a missing .env just means "use the actual environment".
  process.loadEnvFile();
} catch {
  // No .env file present (or unsupported Node); fall back to the real environment.
}

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

// Scoring/enrichment can't work without an OpenAI key — fail fast in production
// with a clear message rather than surfacing per-request 401s from OpenAI later.
if (!process.env.OPENAI_API_KEY && process.env.NODE_ENV === 'production') {
  console.error('[intelligence] OPENAI_API_KEY is not set. Refusing to start in production.');
  process.exit(1);
}

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
