/**
 * Production/development entry point.
 *
 * Builds the app via {@link buildApp} and binds it to a port. All wiring
 * lives in `app.ts` so tests can construct the identical application
 * without opening a socket.
 *
 * Environment variables:
 * - `PORT` — listen port (default `3001`)
 * - `HOST` — bind address (default `127.0.0.1`; use `0.0.0.0` in containers)
 */
import { buildApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '127.0.0.1';

const app = await buildApp({ logger: true });

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`API docs available at http://${HOST}:${PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
