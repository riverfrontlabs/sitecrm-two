import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the design system package.
 *
 * Components are exercised in a `jsdom` environment with Testing Library;
 * the setup file wires in the `jest-dom` matchers (e.g. `toBeInTheDocument`).
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
