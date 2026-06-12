import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vite + Vitest configuration for the web app.
 *
 * - In development, `/api/*` is proxied to the Fastify server (port 3001),
 *   so the frontend code can use same-origin relative URLs everywhere.
 * - Tailwind v4 runs as a Vite plugin; all design tokens come from
 *   `@sitetwo/design-system` (see `src/index.css`).
 * - Vitest runs component tests in jsdom with Testing Library matchers
 *   registered in `src/test/setup.ts`.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
