/**
 * Typed REST client for the SiteCRM API.
 *
 * Wire shapes come from `@sitecrm/types`; the operationIds here map 1:1 to the
 * server's routes (whose schemas generate the OpenAPI spec served at `/docs`).
 * In development, Vite proxies `/api/*` to the Fastify server so all URLs are
 * same-origin relative paths.
 *
 * Auth: the module stores a JWT in both module scope and `localStorage`.
 * Call `setAuthToken(token)` after login; the `request()` helper
 * automatically injects `Authorization: Bearer <token>` on every call.
 * A 401 response clears the stored token so the UI can redirect to login.
 */
import type {
  AuthResponse,
  ContactEvent,
  Lead,
  LeadStatus,
  NewLead,
  Note,
  Notification,
  PaginatedResponse,
  User,
} from '@sitecrm/types';

// ── Auth token management ─────────────────────────────────────────────────────

const TOKEN_KEY = 'crm_token';

// Module-scope copy avoids a localStorage read on every request.
let _token: string | null = null;

/** Persist a new JWT (or clear it on logout). Called by {@link AuthContext}. */
export function setAuthToken(token: string | null) {
  _token = token;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Read the stored token — checks module scope first, then localStorage.
 * Used during `AuthContext` initialisation to rehydrate from a previous session.
 */
export function getAuthToken(): string | null {
  if (!_token) _token = localStorage.getItem(TOKEN_KEY);
  return _token;
}

// ── Error types ───────────────────────────────────────────────────────────────

interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
}

/**
 * Thrown by every client function when the API returns a non-2xx status.
 * Carries the HTTP status code and the server's `message` so UI code can
 * surface meaningful feedback without parsing the raw body.
 */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ── Core request helper ───────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['authorization'] = `Bearer ${token}`;

  const response = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });

  if (response.status === 401) {
    setAuthToken(null);
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    const fallback = `Request failed with status ${response.status}`;
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(response.status, body?.message ?? fallback);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// ── Query string helper ───────────────────────────────────────────────────────

function qs(params?: Record<string, unknown>): string {
  if (!params) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach(item => p.append(k, String(item)));
    else p.set(k, String(v));
  }
  const str = p.toString();
  return str ? `?${str}` : '';
}

// ── API surface ───────────────────────────────────────────────────────────────

/** Notification list response — extends PaginatedResponse with unread badge count. */
export interface PaginatedNotifications extends PaginatedResponse<Notification> {
  unreadCount: number;
}

/** Params for `leadsApi.list`. */
export interface ListLeadsParams {
  page?: number;
  pageSize?: number;
  status?: LeadStatus | LeadStatus[];
  shortlisted?: boolean;
  search?: string;
}

/** `POST /api/auth/register` and `POST /api/auth/login`. */
export const authApi = {
  /** operationId: loginUser */
  login(email: string, password: string): Promise<AuthResponse> {
    return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  /** operationId: registerUser */
  register(email: string, password: string, firstName: string, lastName: string): Promise<AuthResponse> {
    return request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, firstName, lastName }) });
  },
  /** operationId: getCurrentUser */
  me(): Promise<User> {
    return request('/api/auth/me');
  },
};

/** Lead CRUD, notes, and contact events. */
export const leadsApi = {
  /** operationId: listLeads */
  list(params?: ListLeadsParams): Promise<PaginatedResponse<Lead>> {
    return request(`/api/leads${qs(params as Record<string, unknown>)}`);
  },
  /** operationId: getLead */
  get(id: string): Promise<Lead> {
    return request(`/api/leads/${encodeURIComponent(id)}`);
  },
  /** operationId: createLead */
  create(input: NewLead & { status?: LeadStatus; shortlisted?: boolean }): Promise<Lead> {
    return request('/api/leads', { method: 'POST', body: JSON.stringify(input) });
  },
  /** operationId: updateLead */
  update(id: string, input: Partial<Lead>): Promise<Lead> {
    return request(`/api/leads/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });
  },
  /** operationId: deleteLead */
  delete(id: string): Promise<void> {
    return request(`/api/leads/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
  /** operationId: listNotes */
  listNotes(leadId: string): Promise<Note[]> {
    return request(`/api/leads/${encodeURIComponent(leadId)}/notes`);
  },
  /** operationId: createNote */
  createNote(leadId: string, content: string): Promise<Note> {
    return request(`/api/leads/${encodeURIComponent(leadId)}/notes`, { method: 'POST', body: JSON.stringify({ content }) });
  },
  /** operationId: deleteNote */
  deleteNote(leadId: string, noteId: string): Promise<void> {
    return request(`/api/leads/${encodeURIComponent(leadId)}/notes/${encodeURIComponent(noteId)}`, { method: 'DELETE' });
  },
  /** operationId: listContactEvents */
  listEvents(leadId: string): Promise<ContactEvent[]> {
    return request(`/api/leads/${encodeURIComponent(leadId)}/events`);
  },
};

/** Notification inbox. */
export const notificationsApi = {
  /** operationId: listNotifications */
  list(params?: { page?: number; pageSize?: number; unread?: boolean }): Promise<PaginatedNotifications> {
    return request(`/api/notifications${qs(params as Record<string, unknown>)}`);
  },
  /** operationId: markNotificationRead */
  markRead(id: string): Promise<Notification> {
    return request(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  },
  /** operationId: markAllNotificationsRead */
  markAllRead(): Promise<{ count: number }> {
    return request('/api/notifications/read-all', { method: 'POST' });
  },
};
