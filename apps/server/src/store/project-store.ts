import type { NewProject, Project } from '../types.js';

/**
 * Storage contract for projects.
 *
 * Two implementations exist:
 * - {@link MemoryProjectStore} (`memory-project-store.ts`) — zero-setup,
 *   reseeded on restart; used by the test suite and by `npm run dev` when no
 *   `DATABASE_URL` is configured.
 * - {@link PostgresProjectStore} (`postgres-project-store.ts`) — persistent;
 *   selected automatically when `DATABASE_URL` is set (e.g. under
 *   `docker compose up`).
 *
 * Every method is async so implementations are free to do I/O; routes only
 * ever talk to this interface, so swapping backends never touches handlers.
 */
export interface ProjectStore {
  /** Lists all projects, newest first. */
  list(): Promise<Project[]>;

  /** Looks up a single project; resolves `undefined` for unknown ids. */
  get(id: string): Promise<Project | undefined>;

  /** Creates and stores a project, assigning `id` and `createdAt`. */
  create(input: NewProject): Promise<Project>;

  /** Deletes a project; resolves `true` if one was deleted, `false` if unknown. */
  remove(id: string): Promise<boolean>;

  /** Optional cleanup (close connection pools, …) for graceful shutdown. */
  dispose?(): Promise<void>;
}

/**
 * Example data so a fresh checkout (or empty database) has something to
 * render. Both store implementations seed from this list.
 */
export const DEFAULT_SEED: readonly NewProject[] = [
  {
    title: 'sitetwo-oh',
    description:
      'This very application: a React frontend, Fastify API, and themeable design system, all heavily documented.',
    tags: ['react', 'fastify', 'typescript'],
  },
  {
    title: 'Design system preview',
    description: 'Interactive gallery of every design token, component variant, and theme.',
    url: 'http://localhost:5173/design',
    tags: ['design-system', 'tailwind'],
  },
];
