/**
 * Typed client for the sitetwo-oh REST API.
 *
 * The wire format is defined by `apps/server/openapi/openapi.yaml` — the
 * types and functions here mirror that spec (operationIds match 1:1).
 * In development, Vite proxies `/api/*` to the Fastify server, so all URLs
 * are same-origin relative paths.
 */

/** Client-supplied fields for creating a project. Mirrors `NewProject` in the spec. */
export interface NewProject {
  /** Short display name. 1–120 characters. */
  title: string;
  /** What the project is and why it exists. 1–2000 characters. */
  description: string;
  /** Optional link to the live project or repository. */
  url?: string;
  /** Optional free-form labels (e.g. tech stack). At most 10. */
  tags?: string[];
}

/** A stored project. Mirrors `Project` in the spec. */
export interface Project extends NewProject {
  /** Server-assigned UUID. */
  id: string;
  /** Creation timestamp, ISO 8601 in UTC. */
  createdAt: string;
}

/** Standard error envelope returned by the API. Mirrors `Error` in the spec. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
}

/**
 * Thrown by every client function when the API answers with a non-2xx
 * status. Carries the HTTP status and the server's `message` so UI code can
 * show meaningful feedback.
 */
export class ApiError extends Error {
  /** HTTP status code of the failed response. */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Performs a JSON request against the API and unwraps the response.
 *
 * @param path - Relative API path, e.g. `/api/projects`.
 * @param init - Standard `fetch` options (method, body, …).
 * @returns The parsed JSON body, or `undefined` for `204 No Content`.
 * @throws {ApiError} When the response status is not 2xx.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.message ?? fallback);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/**
 * The API surface, one function per OpenAPI operation.
 *
 * @example
 * const projects = await api.listProjects();
 * const created = await api.createProject({ title: 'New', description: '…' });
 * await api.deleteProject(created.id);
 */
export const api = {
  /** `GET /api/health` — operationId `getHealth`. */
  getHealth(): Promise<{ status: 'ok'; uptimeSeconds: number }> {
    return request('/api/health');
  },

  /** `GET /api/projects` — operationId `listProjects`. Newest first. */
  listProjects(): Promise<Project[]> {
    return request('/api/projects');
  },

  /** `POST /api/projects` — operationId `createProject`. */
  createProject(input: NewProject): Promise<Project> {
    return request('/api/projects', { method: 'POST', body: JSON.stringify(input) });
  },

  /** `GET /api/projects/{projectId}` — operationId `getProject`. */
  getProject(projectId: string): Promise<Project> {
    return request(`/api/projects/${encodeURIComponent(projectId)}`);
  },

  /** `DELETE /api/projects/{projectId}` — operationId `deleteProject`. */
  deleteProject(projectId: string): Promise<void> {
    return request(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
  },
};
