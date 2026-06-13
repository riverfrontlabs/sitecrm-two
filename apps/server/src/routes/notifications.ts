/**
 * Notification route group — list, mark-read, and SSE stream.
 *
 * Route map (all prefixed `/api` by the parent register call):
 *   GET  /notifications               — paginated list, optional `unread` filter
 *   PATCH /notifications/:id/read     — mark one notification read
 *   POST  /notifications/read-all     — mark all unread notifications read
 *   GET   /notifications/stream       — SSE stream (stub; full impl in Phase 2.5)
 *
 * The SSE endpoint accepts `?token=<jwt>` as a fallback because the browser's
 * native `EventSource` API cannot set custom request headers — the `authPlugin`
 * already handles this query-param pattern.
 */
import { and, count, desc, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import { NOTIFICATION_TYPES } from '@sitecrm/types';
import type { Database } from '../app.js';
import { notifications } from '../db/schema.js';

export interface NotificationRoutesOptions {
  db?: Database;
}

// ── JSON schemas ──────────────────────────────────────────────────────────────

const notificationSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    userId: { type: 'string', format: 'uuid' },
    type: { type: 'string', enum: NOTIFICATION_TYPES },
    title: { type: 'string' },
    body: { type: 'string' },
    data: { type: 'object', nullable: true },
    read: { type: 'boolean' },
    readAt: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
} as const;

const paginatedNotificationsResponse = {
  type: 'object',
  properties: {
    data: { type: 'array', items: notificationSchema },
    total: { type: 'integer' },
    page: { type: 'integer' },
    pageSize: { type: 'integer' },
    unreadCount: { type: 'integer', description: 'Total unread across all pages — useful for badge counts.' },
  },
} as const;

const listNotificationsQuery = {
  type: 'object',
  additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, maximum: 100000, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    unread: { type: 'boolean' },
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

// ── Serializer ────────────────────────────────────────────────────────────────

function serializeNotification(row: typeof notifications.$inferSelect) {
  return {
    ...row,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// ── Plugin ────────────────────────────────────────────────────────────────────

export const notificationRoutes: FastifyPluginAsync<NotificationRoutesOptions> = async (app, opts) => {
  const { db } = opts;

  // ── GET /notifications ─────────────────────────────────────────────────────

  app.get<{ Querystring: { page?: number; pageSize?: number; unread?: boolean } }>(
    '/notifications',
    {
      preHandler: [app.authenticate],
      schema: {
        querystring: listNotificationsQuery,
        response: { 200: paginatedNotificationsResponse, 503: errorSchema },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user;
      const { page = 1, pageSize = 20, unread } = request.query;

      const conditions = [eq(notifications.userId, userId)];
      if (unread !== undefined) conditions.push(eq(notifications.read, !unread));
      const where = and(...conditions);
      const offset = (page - 1) * pageSize;

      const [rows, countRows, unreadRows] = await Promise.all([
        db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(pageSize).offset(offset),
        db.select({ total: count() }).from(notifications).where(where),
        db.select({ unreadCount: count() }).from(notifications).where(
          and(eq(notifications.userId, userId), eq(notifications.read, false)),
        ),
      ]);
      const total = Number(countRows[0]?.total ?? 0);
      const unreadCount = Number(unreadRows[0]?.unreadCount ?? 0);

      return reply.send({
        data: rows.map(serializeNotification),
        total,
        page,
        pageSize,
        unreadCount,
      });
    },
  );

  // ── PATCH /notifications/:id/read ─────────────────────────────────────────

  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    {
      preHandler: [app.authenticate],
      schema: { response: { 200: notificationSchema, 404: errorSchema, 503: errorSchema } },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user;

      const [updated] = await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.id, request.params.id), eq(notifications.userId, userId)))
        .returning();

      if (!updated) return reply.status(404).send({ statusCode: 404, error: 'Not Found', message: 'Notification not found' });
      return reply.send(serializeNotification(updated));
    },
  );

  // ── POST /notifications/read-all ──────────────────────────────────────────

  app.post(
    '/notifications/read-all',
    {
      preHandler: [app.authenticate],
      schema: {
        response: {
          200: { type: 'object', properties: { count: { type: 'integer' } } },
          503: errorSchema,
        },
      },
    },
    async (request, reply) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!db) return (reply as any).status(503).send({ statusCode: 503, error: 'Service Unavailable', message: 'Database not configured' });
      const { sub: userId } = request.user;

      const updated = await db
        .update(notifications)
        .set({ read: true, readAt: new Date() })
        .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
        .returning({ id: notifications.id });

      return reply.send({ count: updated.length });
    },
  );

  // ── GET /notifications/stream ─────────────────────────────────────────────
  // Full SSE implementation added when Meta/Resend webhooks land (Phase 2.5).
  // Registers the URL now so clients can connect; responds with a `connected`
  // event and closes — no hang, no 404.

  app.get(
    '/notifications/stream',
    {
      preHandler: [app.authenticateSSE],
      schema: { querystring: { type: 'object', properties: { token: { type: 'string' } } } },
    },
    async (_request, reply) => {
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      reply.raw.write('event: connected\ndata: {}\n\n');
      reply.raw.end();
    },
  );
};
