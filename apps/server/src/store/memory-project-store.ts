import { randomUUID } from 'node:crypto';
import type { NewProject, Project } from '../types.js';
import { DEFAULT_SEED, type ProjectStore } from './project-store.js';

/**
 * In-memory {@link ProjectStore}.
 *
 * Deliberately the simplest thing that works: a `Map` seeded with example
 * data, reset on every process restart. Used by the test suite (each Fastify
 * app instance gets its own store, keeping tests isolated) and by local
 * development when no `DATABASE_URL` is configured.
 */
export class MemoryProjectStore implements ProjectStore {
  private readonly projects = new Map<string, Project>();

  /**
   * @param seed - Initial projects, mainly for demos and tests.
   *               Defaults to a small example data set.
   */
  constructor(seed: readonly NewProject[] = DEFAULT_SEED) {
    for (const item of seed) {
      this.insert(item);
    }
  }

  async list(): Promise<Project[]> {
    return [...this.projects.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async get(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async create(input: NewProject): Promise<Project> {
    return this.insert(input);
  }

  async remove(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  /** Synchronous insert shared by the constructor (which cannot await) and `create`. */
  private insert(input: NewProject): Project {
    const project: Project = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.projects.set(project.id, project);
    return project;
  }
}
