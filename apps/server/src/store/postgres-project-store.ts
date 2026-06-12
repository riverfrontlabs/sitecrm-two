import pg from 'pg';
import type { NewProject, Project } from '../types.js';
import { DEFAULT_SEED, type ProjectStore } from './project-store.js';

/**
 * Database schema, applied idempotently on startup by {@link PostgresProjectStore.init}.
 *
 * Kept as a single `CREATE TABLE IF NOT EXISTS` because the schema is still
 * tiny; if it grows, replace this with a real migration tool (node-pg-migrate,
 * drizzle-kit, …) and delete this constant.
 *
 * `gen_random_uuid()` is built into PostgreSQL 13+.
 */
const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS projects (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title      text NOT NULL,
    description text NOT NULL,
    url        text,
    tags       text[] NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
  );
`;

/** Shape of a row in the `projects` table, as returned by node-postgres. */
interface ProjectRow {
  id: string;
  title: string;
  description: string;
  url: string | null;
  tags: string[];
  created_at: Date;
}

/** Maps a database row to the wire-format {@link Project} defined by the OpenAPI spec. */
function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    // SQL NULL becomes "absent" on the wire (the spec marks url/tags optional).
    ...(row.url === null ? {} : { url: row.url }),
    tags: row.tags,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * PostgreSQL-backed {@link ProjectStore} using a node-postgres connection pool.
 *
 * Selected by `server.ts` whenever `DATABASE_URL` is set — locally that
 * usually means the Postgres container from the repo's `docker-compose.yml`:
 *
 * ```
 * docker compose up -d db
 * DATABASE_URL=postgres://sitetwo:sitetwo@localhost:5432/sitetwo npm run dev:api
 * ```
 *
 * Call {@link init} once before serving traffic; it applies the schema and
 * seeds example data into an empty table.
 */
export class PostgresProjectStore implements ProjectStore {
  private readonly pool: pg.Pool;

  /**
   * @param connectionString - Standard Postgres URL,
   *   e.g. `postgres://user:password@host:5432/database`.
   */
  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  /**
   * Prepares the database: applies the schema (idempotent) and, if the table
   * is empty, inserts {@link DEFAULT_SEED} so a fresh database has something
   * to render. Must complete before the server starts accepting requests.
   */
  async init(): Promise<void> {
    await this.pool.query(SCHEMA_SQL);

    const { rows } = await this.pool.query<{ count: string }>('SELECT count(*) FROM projects');
    if (rows[0]?.count === '0') {
      for (const item of DEFAULT_SEED) {
        await this.create(item);
      }
    }
  }

  async list(): Promise<Project[]> {
    const { rows } = await this.pool.query<ProjectRow>(
      'SELECT * FROM projects ORDER BY created_at DESC, id DESC',
    );
    return rows.map(rowToProject);
  }

  async get(id: string): Promise<Project | undefined> {
    // The id column is uuid-typed; a malformed id would make the cast throw,
    // so guard with a cheap shape check and report "not found" instead.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return undefined;
    }
    const { rows } = await this.pool.query<ProjectRow>('SELECT * FROM projects WHERE id = $1', [
      id,
    ]);
    return rows[0] ? rowToProject(rows[0]) : undefined;
  }

  async create(input: NewProject): Promise<Project> {
    const { rows } = await this.pool.query<ProjectRow>(
      `INSERT INTO projects (title, description, url, tags)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.title, input.description, input.url ?? null, input.tags ?? []],
    );
    if (!rows[0]) {
      throw new Error('INSERT … RETURNING produced no row.');
    }
    return rowToProject(rows[0]);
  }

  async remove(id: string): Promise<boolean> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return false;
    }
    const result = await this.pool.query('DELETE FROM projects WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /** Closes the connection pool; called on graceful shutdown. */
  async dispose(): Promise<void> {
    await this.pool.end();
  }
}
