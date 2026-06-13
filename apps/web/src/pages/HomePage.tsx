import { Badge, Button, Card, Input } from '@sitecrm/design-system';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, type Project } from '../api/client';

/** UI state for the project list fetch. */
type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; projects: Project[] };

/**
 * Home page: lists projects from the REST API and lets the user create and
 * delete them. Demonstrates the full stack working together — design-system
 * components in front, the typed API client in the middle, Fastify behind.
 */
export function HomePage() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const projects = await api.listProjects();
      setState({ phase: 'ready', projects });
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Could not reach the API. Is the server running?';
      setState({ phase: 'error', message });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = useCallback(
    async (id: string) => {
      await api.deleteProject(id).catch(() => {
        // A 404 here means it was already gone; refreshing reconciles either way.
      });
      await refresh();
    },
    [refresh],
  );

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold text-ink">Projects</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Served by the Fastify API — see its interactive docs at{' '}
          <a className="text-primary underline" href="http://localhost:3001/docs">
            localhost:3001/docs
          </a>
          .
        </p>
      </section>

      <NewProjectForm onCreated={refresh} />

      {state.phase === 'loading' && <p className="text-sm text-ink-muted">Loading projects…</p>}

      {state.phase === 'error' && (
        <Card title="Could not load projects" description={state.message}>
          <Button variant="secondary" size="sm" onClick={refresh}>
            Retry
          </Button>
        </Card>
      )}

      {state.phase === 'ready' && state.projects.length === 0 && (
        <p className="text-sm text-ink-muted">No projects yet — add the first one above.</p>
      )}

      {state.phase === 'ready' && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {state.projects.map((project) => (
            <li key={project.id}>
              <ProjectCard project={project} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A single project rendered as a design-system card. */
function ProjectCard({ project, onDelete }: { project: Project; onDelete: (id: string) => void }) {
  return (
    <Card
      title={
        project.url ? (
          <a className="hover:text-primary hover:underline" href={project.url}>
            {project.title}
          </a>
        ) : (
          project.title
        )
      }
      description={new Date(project.createdAt).toLocaleDateString()}
      footer={
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {(project.tags ?? []).map((tag) => (
              <Badge key={tag} tone="primary">
                {tag}
              </Badge>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={() => onDelete(project.id)}>
            Delete
          </Button>
        </div>
      }
      className="h-full"
    >
      <p>{project.description}</p>
    </Card>
  );
}

/**
 * Inline creation form. Validation mirrors the API contract (title and
 * description required); server-side validation errors surface under the
 * form via the thrown {@link ApiError}'s message.
 */
function NewProjectForm({ onCreated }: { onCreated: () => Promise<void> }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.createProject({ title: title.trim(), description: description.trim() });
      setTitle('');
      setDescription('');
      await onCreated();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Add a project">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={120}
          />
          <Input
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            maxLength={2000}
          />
        </div>
        {submitError && (
          <p role="alert" className="text-xs text-danger">
            {submitError}
          </p>
        )}
        <div>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add project'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
