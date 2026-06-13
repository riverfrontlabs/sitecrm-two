/**
 * Shared Vitest setup for the builder app test suite.
 *
 * - Registers Testing Library's `jest-dom` matchers (`toBeInTheDocument`, …)
 *   on Vitest's `expect`, including their TypeScript types.
 * - Unmounts rendered trees after each test (explicit cleanup, since this
 *   package keeps Vitest `globals` mode off in favour of explicit imports).
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
