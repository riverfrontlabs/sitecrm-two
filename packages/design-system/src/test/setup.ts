/**
 * Shared Vitest setup for the design system test suite.
 *
 * - Registers Testing Library's `jest-dom` matchers (`toBeInTheDocument`,
 *   `toBeDisabled`, …) on Vitest's `expect`, including their TypeScript
 *   types for every test file in this package.
 * - Unmounts rendered trees after each test. (Testing Library's automatic
 *   cleanup only engages when Vitest's `globals` mode is on, which this
 *   repo keeps off in favor of explicit imports.)
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
