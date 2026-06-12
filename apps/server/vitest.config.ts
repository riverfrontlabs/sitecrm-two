import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the API.
 *
 * Tests run in a plain Node environment and exercise the app through
 * Fastify's `inject()` — real request/response cycles without binding a
 * network port, so the suite is fast and parallel-safe.
 */
export default defineConfig({
  test: {
    environment: 'node',
  },
});
