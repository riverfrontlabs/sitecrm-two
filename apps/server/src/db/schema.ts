/**
 * Drizzle ORM schema — the single source of truth for the SiteCRM database.
 *
 * Tables are grouped by domain and defined with explicit column names so that
 * the generated SQL is readable without knowledge of Drizzle's naming
 * conventions.
 *
 * Foreign-key constraints use `onDelete: 'cascade'` for child records (notes,
 * events, deployments) so deleting a parent (lead, site, user) automatically
 * cleans up all associated rows.
 *
 * Note on timestamps: all `*_at` columns use `{ withTimezone: true }` so that
 * Neon (UTC) and local Postgres produce identical ISO-8601 strings on the wire.
 */
import {
  boolean,
  integer,
  json,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type {
  BuildStatus,
  ContactEventType,
  DeploymentStatus,
  JobStatus,
  LeadStatus,
  MetaAccountType,
  NotificationType,
  OutreachChannel,
  SiteSpec,
  SiteType,
} from '@sitecrm/types';

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Leads ─────────────────────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  website: varchar('website', { length: 512 }),
  /** Facebook Page ID for Messenger outreach via the Meta Graph API. */
  facebookPageId: varchar('facebook_page_id', { length: 255 }),
  /** Instagram Business Account ID for DM outreach via the Meta Graph API. */
  instagramAccountId: varchar('instagram_account_id', { length: 255 }),
  /** 0–100 score produced by the intelligence website analyser. */
  websiteScore: real('website_score'),
  websiteGrade: varchar('website_grade', { length: 10 }),
  websiteNotes: varchar('website_notes', { length: 1000 }),
  /** Google Places star rating (1–5). */
  rating: real('rating').default(0),
  reviews: integer('reviews').default(0),
  type: varchar('type', { length: 100 }),
  location: varchar('location', { length: 255 }),
  /** Composite intelligence score (0–100). */
  score: real('score').default(0),
  placeId: varchar('place_id', { length: 255 }),
  /** FK to a generated site in the `sites` table. */
  linkedSiteId: uuid('linked_site_id'),
  status: varchar('status', { length: 50 }).$type<LeadStatus>().default('new').notNull(),
  shortlisted: boolean('shortlisted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Notes ─────────────────────────────────────────────────────────────────────

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Contact Events ────────────────────────────────────────────────────────────

/**
 * Immutable audit log of every outreach touch-point with a lead.
 *
 * SMS is intentionally excluded from `type` — regulatory constraints make
 * cold SMS outreach impractical. Use `email`, `facebook_dm`, or `instagram_dm`.
 */
export const contactEvents = pgTable('contact_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  leadId: uuid('lead_id')
    .notNull()
    .references(() => leads.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 100 }).$type<ContactEventType>().notNull(),
  channel: varchar('channel', { length: 50 }).$type<OutreachChannel>().notNull(),
  /** `sent` = we initiated; `received` = lead replied. */
  direction: varchar('direction', { length: 10 }).notNull(),
  detail: text('detail'),
  /** Meta message ID or email provider message ID for deduplication. */
  externalId: varchar('external_id', { length: 512 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Outreach Sequences ────────────────────────────────────────────────────────

/** A reusable multi-step outreach campaign template. */
export const outreachSequences = pgTable('outreach_sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stepCount: integer('step_count').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/** A single step within an {@link outreachSequences outreach sequence}. */
export const outreachSteps = pgTable('outreach_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  sequenceId: uuid('sequence_id')
    .notNull()
    .references(() => outreachSequences.id, { onDelete: 'cascade' }),
  stepNumber: integer('step_number').notNull(),
  /** Days after the previous step (or enrollment date) before this step fires. */
  delayDays: integer('delay_days').default(0).notNull(),
  channel: varchar('channel', { length: 50 }).$type<OutreachChannel>().notNull(),
  /** Handlebars-style template string; e.g. `Hi {{lead.name}}, …`. */
  bodyTemplate: text('body_template').notNull(),
  /** Email subject template — only used when `channel === 'email'`. */
  subjectTemplate: varchar('subject_template', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 100 }).$type<NotificationType>().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  /** Arbitrary JSON payload for deep-link navigation (e.g. `{ leadId: "…" }`). */
  data: json('data').$type<Record<string, unknown>>(),
  read: boolean('read').default(false).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Sites ─────────────────────────────────────────────────────────────────────

/**
 * A generated site record — stores the AI-produced {@link SiteSpec} and tracks
 * build/export state.
 *
 * The `spec` JSON column is the canonical structural description consumed by
 * the code-generation pipeline in Phase 3.
 */
export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).$type<SiteType>().notNull(),
  spec: json('spec').$type<SiteSpec>().notNull(),
  buildStatus: varchar('build_status', { length: 50 })
    .$type<BuildStatus>()
    .default('draft')
    .notNull(),
  exportedAt: timestamp('exported_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Deployments ───────────────────────────────────────────────────────────────

/**
 * An AWS deployment of a generated site.
 *
 * `static` sites use S3 + CloudFront; `server` sites use ECS + optional RDS.
 * The Terraform state key allows the hosting dashboard to locate the
 * infrastructure state bucket for status checks and redeployments.
 */
export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteId: uuid('site_id')
    .notNull()
    .references(() => sites.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).$type<DeploymentStatus>().default('pending').notNull(),
  awsRegion: varchar('aws_region', { length: 50 }).notNull(),
  cloudfrontDomain: varchar('cloudfront_domain', { length: 255 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  /** ECS cluster ARN — only set for `server`-type sites. */
  ecsCluster: varchar('ecs_cluster', { length: 512 }),
  /** RDS endpoint — only set for `server`-type sites with a database tier. */
  rdsEndpoint: varchar('rds_endpoint', { length: 512 }),
  /** S3 key prefix for Terraform remote state. */
  terraformStateKey: varchar('terraform_state_key', { length: 512 }),
  deployedAt: timestamp('deployed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Meta Connections ──────────────────────────────────────────────────────────

/**
 * OAuth-linked Facebook Pages and Instagram Business Accounts.
 *
 * Access tokens are stored encrypted at rest (encryption layer TBD in Phase 2).
 * The `webhookVerified` flag is set to `true` after the Meta platform confirms
 * the webhook challenge for this account.
 */
export const metaConnections = pgTable('meta_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountType: varchar('account_type', { length: 20 }).$type<MetaAccountType>().notNull(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  /** Long-lived page access token — encrypt before storing in production. */
  accessToken: text('access_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  webhookVerified: boolean('webhook_verified').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Background Jobs ───────────────────────────────────────────────────────────

/** Async enrichment jobs dispatched to the intelligence service. */
export const jobs = pgTable('jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 50 }).$type<JobStatus>().default('pending').notNull(),
  businessTypes: json('business_types').$type<string[]>().notNull().default([]),
  locations: json('locations').$type<string[]>().notNull().default([]),
  enabledTasks: json('enabled_tasks')
    .$type<string[]>()
    .notNull()
    .default(['enrich', 'score', 'generate']),
  totalFound: integer('total_found').default(0).notNull(),
  totalEnriched: integer('total_enriched').default(0).notNull(),
  error: text('error'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ── Daily Snapshots ───────────────────────────────────────────────────────────

/** Daily pipeline funnel metrics per user — used by the CRM analytics dashboard. */
export const dailySnapshots = pgTable('daily_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: timestamp('date', { withTimezone: true }).defaultNow().notNull(),
  total: integer('total').default(0).notNull(),
  contacted: integer('contacted').default(0).notNull(),
  replied: integer('replied').default(0).notNull(),
  qualified: integer('qualified').default(0).notNull(),
  proposal: integer('proposal').default(0).notNull(),
  won: integer('won').default(0).notNull(),
  lost: integer('lost').default(0).notNull(),
});
