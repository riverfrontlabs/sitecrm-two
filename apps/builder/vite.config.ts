import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vite + Vitest configuration for the builder app.
 *
 * - In development, `/api/*` is proxied to the Fastify server on port 3000,
 *   so builder components can use same-origin relative URLs for AI generation
 *   and site-spec persistence calls.
 * - Tailwind v4 runs as a Vite plugin; design tokens come from
 *   `@sitecrm/design-system`.
 * - The preview iframe sandbox runs on a separate origin (port 5175) to
 *   isolate generated-site scripts from the builder shell.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
