import type { FastifyPluginAsync } from 'fastify';
import type { ProjectStore } from '../store/project-store.js';
import type { NewProject } from '../types.js';

/**
 * JSON schemas for request/response validation.
 *
 * These mirror `components/schemas` in `openapi/openapi.yaml` (the
 * human-facing source of truth). Fastify compiles them once at startup and
 * uses them to reject bad input with a 400 before any handler runs, and to
 * serialize responses (unknown properties are stripped).
 */
const newProjectSchema = {
  type: 'object',
  required: ['title', 'description'],
  additionalProperties: false,
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', minLength: 1, maxLength: 2000 },
    url: { type: 'string', format: 'uri' },
    tags: {
      type: 'array',
      maxItems: 10,
      items: { type: 'string', minLength: 1, maxLength: 30 },
    },
  },
} as const;

const projectSchema = {
  type: 'object',
  required: ['id', 'title', 'description', 'createdAt'],
  properties: {
    id: { type: 'string', format: 'uuid' },
    ...newProjectSchema.properties,
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const errorSchema = {
  type: 'object',
  required: ['statusCode', 'error', 'message'],
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { type: 'string' },
  },
} as const;

/** Options for {@link projectRoutes}. */
export interface ProjectRoutesOptions {
  /** The store backing this route group; injected so tests stay isolated. */
  store: ProjectStore;
}

/**
 * `/projects` route group — list, fetch, create, and delete projects.
 *
 * Maps 1:1 to the `projects`-tagged operations in `openapi/openapi.yaml`
 * (`listProjects`, `getProject`, `createProject`, `deleteProject`).
 */
export const projectRoutes: FastifyPluginAsync<ProjectRoutesOptions> = async (app, opts) => {
  const { store } = opts;

  /** operationId: listProjects */
  app.get(
    '/projects',
    {
      schema: {
        response: { 200: { type: 'array', items: projectSchema } },
      },
    },
    async () => store.list(),
  );

  /** operationId: getProject */
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: { projectId: { type: 'string' } },
        },
        response: { 200: projectSchema, 404: errorSchema },
      },
    },
    async (request, reply) => {
      const project = store.get(request.params.projectId);
      if (!project) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
      }
      return project;
    },
  );

  /** operationId: createProject */
  app.post<{ Body: NewProject }>(
    '/projects',
    {
      schema: {
        body: newProjectSchema,
        response: { 201: projectSchema, 400: errorSchema },
      },
    },
    async (request, reply) => {
      const project = store.create(request.body);
      return reply.status(201).send(project);
    },
  );

  /** operationId: deleteProject */
  app.delete<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['projectId'],
          properties: { projectId: { type: 'string' } },
        },
        response: { 404: errorSchema },
      },
    },
    async (request, reply) => {
      const deleted = store.remove(request.params.projectId);
      if (!deleted) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Project not found' });
      }
      return reply.status(204).send();
    },
  );
};
