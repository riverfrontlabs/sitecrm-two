import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../api/client';
import { HomePage } from './HomePage';

/** The api module is mocked wholesale; these tests exercise the page's states. */
vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      listProjects: vi.fn(),
      createProject: vi.fn(),
      deleteProject: vi.fn(),
    },
  };
});

const { api } = await import('../api/client');
const listProjects = vi.mocked(api.listProjects);

const sampleProjects: Project[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Sample project',
    description: 'Rendered from a mocked API response.',
    tags: ['react'],
    createdAt: '2026-06-01T12:00:00.000Z',
  },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomePage', () => {
  it('renders projects returned by the API', async () => {
    listProjects.mockResolvedValue(sampleProjects);
    render(<HomePage />);

    expect(await screen.findByText('Sample project')).toBeInTheDocument();
    expect(screen.getByText('Rendered from a mocked API response.')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
  });

  it('shows an empty state when the API returns no projects', async () => {
    listProjects.mockResolvedValue([]);
    render(<HomePage />);

    expect(await screen.findByText(/no projects yet/i)).toBeInTheDocument();
  });

  it('shows an error card with a retry button when the API is unreachable', async () => {
    listProjects.mockRejectedValue(new TypeError('fetch failed'));
    render(<HomePage />);

    expect(await screen.findByText('Could not load projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
