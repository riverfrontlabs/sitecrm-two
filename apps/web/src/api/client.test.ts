import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './client';

/** Builds a minimal `fetch` Response stand-in. */
function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('returns parsed JSON for successful requests', async () => {
    const projects = [{ id: '1', title: 'A', description: 'B', createdAt: '2026-01-01T00:00:00Z' }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, projects));
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.listProjects()).resolves.toEqual(projects);
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', expect.anything());
  });

  it('POSTs a JSON body when creating a project', async () => {
    const input = { title: 'New', description: 'Created in a test.' };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(201, { ...input, id: 'x', createdAt: 'now' }));
    vi.stubGlobal('fetch', fetchMock);

    await api.createProject(input);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/projects');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual(input);
  });

  it("throws an ApiError carrying the server's message on non-2xx responses", async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(404, { statusCode: 404, error: 'Not Found', message: 'Project not found' }),
        ),
    );

    const failure = api.getProject('nope');
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(api.getProject('nope')).rejects.toMatchObject({
      status: 404,
      message: 'Project not found',
    });
  });

  it('resolves to undefined for 204 No Content', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 204,
          json: () => Promise.reject(new Error('no body')),
        } as unknown as Response),
    );

    await expect(api.deleteProject('some-id')).resolves.toBeUndefined();
  });
});
