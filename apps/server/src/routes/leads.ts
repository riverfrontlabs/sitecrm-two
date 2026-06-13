/**
 * Lead route group — CRUD, notes, and contact events.
 *
 * All routes require a valid JWT (`preHandler: [app.authenticate]`). The
 * `userId` from the JWT payload scopes every query — a user can never read
 * or modify another user's leads.
 *
 * Route map (all prefixed `/api` by the parent register call):
 *   GET    /leads                     — paginated list with filters
 *   POST   /leads                     — create a lead
 *   GET    /leads/:id                 — single lead
 *   PATCH  /leads/:id                 — update any mutable fields
 *   DELETE /leads/:id                 — hard delete (cascades to notes + events)
 *   GET    /leads/:id/notes           — list notes newest-first
 *   POST   /leads/:id/notes           — append a note
 *   DELETE /leads/:id/notes/:noteId   — remove a specific note
 *   GET    /leads/:id/events          — list contact events newest-first
 *
 * Schemas mirror `components/schemas` in `openapi/openapi.yaml` — update
 * both files together when changing any request/response shape.
 */
import { and, count, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import type { Database } from '../app.js';
import { contactEvents, leads, notes } from '../db/schema.js';

export interface LeadRoutesOptions {
  /** Drizzle database instance. Routes return 503 when omitted. */
  db?: Database;
}

// ── JSON schemas (mirror openapi.yaml components/schemas) ────────────────────

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
const CHANNELS = ['email', 'facebook_dm', 'instagram_dm'] as const;
const EVENT_TYPES = [
  'email_sent', 'email_opened', 'email_clicked',
  'facebook_dm_sent', 'facebook_dm_received',
  'instagram_dm_sent', 'instagram_dm_received',
  'call', 'meeting',
] as const;

const leadSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', nullable: true },
    website: { type: 'string', nullable: true },
    facebookPageId: { type: 'string', nullable: true },
    instagramAccountId: { type: 'string', nullable: true },
    websiteScore: { type: 'number', nullable: true },
    websiteGrade: { type: 'string', nullable: true },
    websiteNotes: { type: 'string', nullable: true },
    score: { type: 'number', nullable: true },
    rating: { type: 'number', nullable: true },
    reviews: { type: 'integer', nullable: true },
    type: { type: 'string', nullable: true },
    location: { type: 'string', nullable: true },
    placeId: { type: 'string', nullable: true },
    linkedSiteId: { type: 'string', nullable: true },
    status: { type: 'string', enum: LEAD_STATUSES },
    shortlisted: { type: 'boolean' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const createLeadBody = {
  type: 'object',
  required: ['name'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    email: { type: 'string', format: 'email', maxLength: 255 },
    website: { type: 'string', maxLength: 512 },
    facebookPageId: { type: 'string', maxLength: 255 },
    instagramAccountId: { type: 'string', maxLength: 255 },
    type: { type: 'string', maxLength: 100 },
    location: { type: 'string', maxLength: 255 },
    placeId: { type: 'string', maxLength: 255 },
    status: { type: 'string', enum: LEAD_STATUSES },
    shortlisted: { type: 'boolean' },
  },
} as const;

const updateLeadBody = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    email: { type: ['string', 'null'], format: 'email', maxLength: 255 },
    website: { type: ['string', 'null'], maxLength: 512 },
    facebookPageId: { type: ['string', 'null'], maxLength: 255 },
    instagramAccountId: { type: ['string', 'null'], maxLength: 255 },
    websiteScore: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    websiteGrade: { type: ['string', 'null'], maxLength: 10 },
    websiteNotes: { type: ['string', 'null'], maxLength: 1000 },
    score: { type: ['number', 'null'], minimum: 0, maximum: 100 },
    rating: { type: ['number', 'null'], minimum: 0, maximum: 5 },
    reviews: { type: ['integer', 'null'], minimum: 0 },
    type: { type: ['string', 'null'], maxLength: 100 },
    location: { type: ['string', 'null'], maxLength: 255 },
    placeId: { type: ['string', 'null'], maxLength: 255 },
    status: { type: 'string', enum: LEAD_STATUSES },
    shortlisted: { type: 'boolean' },
    linkedSiteId: { type: ['string', 'null'], format: 'uuid' },
  },
} as const;

const listLeadsQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
    status: {
      oneOf: [
        { type: 'string', enum: LEAD_STATUSES },
        { type: 'array', items: { type: 'string', enum: LEAD_STATUSES } },
      ],
    },
    shortlisted: { type: 'boolean' },
    search: { type: 'string', maxLength: 200 },
  },
} as const;

const paginatedLeadsResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: leadSchema },
    total: { type: 'integer' },
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
  },
} as const;

const noteSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    leadId: { type: 'string', format: 'uuid' },
    content: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const createNoteBody = {
  type: 'object',
  required: ['content'],
  additionalProperties: false,
  properties: {
    content: { type: 'string', minLength: 1, maxLength: 10000 },
  },
} as const;

const contactEventSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    leadId: { type: 'string', format: 'uuid' },
    type: { type: 'string', enum: EVENT_TYPES },
    channel: { type: 'string', enum: CHANNELS },
    direction: { type: 'string', enum: ['sent', 'received'] },
    detail: { type: 'string', nullable: true },
    externalId: { type: 'string', nullable: true },
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

// ── Serializers ───────────────────────────────────────────────────────────────

function serializeLead(row: typeof leads.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

function serializeNote(row: typeof notes.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

function serializeEvent(row: typeof contactEvents.$inferSelect) {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Lead route group. Registered with `prefix: '/api'` — all paths are relative
 * to that prefix (e.g. `GET /leads` is reachable at `GET /api/leads`).
 */
export const leadRoutes: FastifyPluginAsync<LeadRoutesOptions> = async (app, opts) => {
  const { db } = opts;

  // ── GET /leads ─────────────────────────────────────────────────────────────

  app.get<{
    Querystring: {
      page?: number;
      pageSize?: number;
      status?: string | string[];
      shortlisted?: boolean;
      search?: string;
    };
  }>(
    '/leads',
    {
      preHandler: [app.authenticate],
      schema: { querystring: listLeadsQuery, response: { 200: paginatedLeadsResponse, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };
      const { page = 1, pageSize = 20, status, shortlisted, search } = request.query;

      const conditions = [eq(leads.userId, userId)];
      if (status) {
        const arr = Array.isArray(status) ? status : [status];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(inArray(leads.status, arr as any[]));
      }
      if (shortlisted !== undefined) conditions.push(eq(leads.shortlisted, shortlisted));
      if (search) {
        conditions.push(
          or(ilike(leads.name, `%${search}%`), ilike(leads.email, `%${search}%`), ilike(leads.location, `%${search}%`))!,
        );
      }

      const where = and(...conditions);
      const offset = (page - 1) * pageSize;

      const [rows, countRows] = await Promise.all([
        db.select().from(leads).where(where).orderBy(desc(leads.createdAt)).limit(pageSize).offset(offset),
        db.select({ total: count() }).from(leads).where(where),
      ]);
      const total = Number(countRows[0]?.total ?? 0);

      return reply.send({ data: rows.map(serializeLead), total, page, pageSize });
    },
  );

  // ── POST /leads ────────────────────────────────────────────────────────────

  app.post<{
    Body: {
      name: string;
      email?: string; website?: string; facebookPageId?: string;
      instagramAccountId?: string; type?: string; location?: string;
      placeId?: string; status?: string; shortlisted?: boolean;
    };
  }>(
    '/leads',
    {
      preHandler: [app.authenticate],
      schema: { body: createLeadBody, response: { 201: leadSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };
      const { name, email, website, facebookPageId, instagramAccountId, type, location, placeId, status, shortlisted } = request.body;

      const [lead] = await db
        .insert(leads)
        .values({
          userId, name, email, website, facebookPageId, instagramAccountId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type, location, placeId, status: (status as any) ?? 'new', shortlisted: shortlisted ?? false,
        })
        .returning();

      return reply.status(201).send(serializeLead(lead!));
    },
  );

  // ── GET /leads/:id ─────────────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/leads/:id',
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: leadSchema, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [lead] = await db
        .select().from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });
      return reply.send(serializeLead(lead));
    },
  );

  // ── PATCH /leads/:id ───────────────────────────────────────────────────────

  app.patch<{
    Params: { id: string };
    Body: Partial<{
      name: string; email: string | null; website: string | null;
      facebookPageId: string | null; instagramAccountId: string | null;
      websiteScore: number | null; websiteGrade: string | null; websiteNotes: string | null;
      score: number | null; rating: number | null; reviews: number | null;
      type: string | null; location: string | null; placeId: string | null;
      status: string; shortlisted: boolean; linkedSiteId: string | null;
    }>;
  }>(
    '/leads/:id',
    {
      preHandler: [app.authenticate],
      schema: { body: updateLeadBody, response: { 200: leadSchema, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [existing] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      const [updated] = await db
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(leads).set({ ...request.body, updatedAt: new Date() } as any)
        .where(eq(leads.id, request.params.id))
        .returning();

      return reply.send(serializeLead(updated!));
    },
  );

  // ── DELETE /leads/:id ──────────────────────────────────────────────────────

  app.delete<{ Params: { id: string } }>(
    '/leads/:id',
    {
      preHandler: [app.authenticate],
      schema: { response: { 204: {}, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [existing] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!existing) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      await db.delete(leads).where(eq(leads.id, request.params.id));
      return reply.status(204).send();
    },
  );

  // ── GET /leads/:id/notes ───────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/leads/:id/notes',
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: { type: 'array', items: noteSchema }, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [lead] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      const rows = await db.select().from(notes).where(eq(notes.leadId, request.params.id)).orderBy(desc(notes.createdAt));
      return reply.send(rows.map(serializeNote));
    },
  );

  // ── POST /leads/:id/notes ──────────────────────────────────────────────────

  app.post<{ Params: { id: string }; Body: { content: string } }>(
    '/leads/:id/notes',
    {
      preHandler: [app.authenticate],
      schema: { body: createNoteBody, response: { 201: noteSchema, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [lead] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      const [note] = await db.insert(notes).values({ leadId: request.params.id, content: request.body.content }).returning();
      return reply.status(201).send(serializeNote(note!));
    },
  );

  // ── DELETE /leads/:id/notes/:noteId ───────────────────────────────────────

  app.delete<{ Params: { id: string; noteId: string } }>(
    '/leads/:id/notes/:noteId',
    {
      preHandler: [app.authenticate],
      schema: { response: { 204: {}, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      // Verify the lead belongs to this user before allowing note deletion.
      const [lead] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      const deleted = await db
        .delete(notes)
        .where(and(eq(notes.id, request.params.noteId), eq(notes.leadId, request.params.id)))
        .returning({ id: notes.id });

      if (deleted.length === 0) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Note not found' });
      return reply.status(204).send();
    },
  );

  // ── GET /leads/:id/events ──────────────────────────────────────────────────

  app.get<{ Params: { id: string } }>(
    '/leads/:id/events',
    {
      preHandler: [app.authenticate],
      schema: {
        response: { 200: { type: 'array', items: contactEventSchema }, 404: errorSchema, 503: errorSchema },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user as { sub: string };

      const [lead] = await db
        .select({ id: leads.id }).from(leads)
        .where(and(eq(leads.id, request.params.id), eq(leads.userId, userId)))
        .limit(1);

      if (!lead) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Lead not found' });

      const rows = await db.select().from(contactEvents).where(eq(contactEvents.leadId, request.params.id)).orderBy(desc(contactEvents.createdAt));
      return reply.send(rows.map(serializeEvent));
    },
  );
};
