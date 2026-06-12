import { randomUUID } from 'node:crypto';
import type { NewProject, Project } from '../types.js';

/**
 * In-memory project storage.
 *
 * Deliberately the simplest thing that works: a `Map` seeded with example
 * data, reset on every process restart. The store is the only stateful part
 * of the API, so swapping in a real database later means re-implementing
 * just this class behind the same four methods.
 *
 * Each Fastify app instance gets its own store (see `buildApp`), which keeps
 * tests isolated from one another.
 */
export class ProjectStore {
  private readonly projects = new Map<string, Project>();

  /**
   * @param seed - Initial projects, mainly for demos and tests.
   *               Defaults to a small example data set.
   */
  constructor(seed: readonly NewProject[] = DEFAULT_SEED) {
    for (const item of seed) {
      this.create(item);
    }
  }

  /**
   * Lists all projects, newest first.
   *
   * @returns A new array; mutating it does not affect the store.
   */
  list(): Project[] {
    return [...this.projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Looks up a single project.
   *
   * @param id - The server-assigned project id.
   * @returns The project, or `undefined` if no project has that id.
   */
  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  /**
   * Creates and stores a project, assigning `id` and `createdAt`.
   *
   * @param input - Validated client-supplied fields.
   * @returns The newly stored project.
   */
  create(input: NewProject): Project {
    const project: Project = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.projects.set(project.id, project);
    return project;
  }

  /**
   * Deletes a project.
   *
   * @param id - The server-assigned project id.
   * @returns `true` if a project was deleted, `false` if the id was unknown.
   */
  remove(id: string): boolean {
    return this.projects.delete(id);
  }
}

/** Example data so a fresh checkout has something to render. */
const DEFAULT_SEED: readonly NewProject[] = [
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
