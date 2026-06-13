/**
 * @sitecrm/types — shared domain types for the SiteCRM monorepo.
 *
 * All apps (server, web, builder, intelligence) import from here so that the
 * wire shapes are defined exactly once. The server's Drizzle schema and Zod
 * validators are the authoritative source of truth; these interfaces mirror
 * the shape those produce at the API boundary.
 *
 * Types are grouped by domain:
 * - Auth / Users
 * - Leads & Contact Events
 * - Outreach Sequences
 * - Notifications
 * - Sites & Deployments
 * - Meta Connections (Facebook / Instagram)
 * - Background Jobs
 * - Shared API primitives
 */

// ── Auth / Users ──────────────────────────────────────────────────────────────

/** Public user record returned by the API — no password hash. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

/** Payload embedded inside a signed JWT. `sub` is the user's UUID. */
export interface JwtPayload {
  sub: string;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Returned by `/api/auth/register` and `/api/auth/login`. */
export interface AuthResponse {
  token: string;
  user: User;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

/** Channels available for outreach. SMS is intentionally excluded. */
export type OutreachChannel = 'email' | 'facebook_dm' | 'instagram_dm';

export type ContactEventType =
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'facebook_dm_sent'
  | 'facebook_dm_received'
  | 'instagram_dm_sent'
  | 'instagram_dm_received'
  | 'call'
  | 'meeting';

export interface Lead {
  id: string;
  userId: string;
  name: string;
  email?: string;
  website?: string;
  /** Facebook Page ID used for Messenger outreach. */
  facebookPageId?: string;
  /** Instagram Business Account ID used for DM outreach. */
  instagramAccountId?: string;
  /** 0–100 score from the intelligence scrape. */
  websiteScore?: number;
  websiteGrade?: string;
  websiteNotes?: string;
  /** Google Places star rating. */
  rating?: number;
  reviews?: number;
  type?: string;
  location?: string;
  /** Composite intelligence score (0–100). */
  score?: number;
  placeId?: string;
  /** FK to a generated {@link Site} associated with this lead. */
  linkedSiteId?: string;
  status: LeadStatus;
  shortlisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewLead {
  name: string;
  email?: string;
  website?: string;
  facebookPageId?: string;
  instagramAccountId?: string;
  type?: string;
  location?: string;
  placeId?: string;
}

export interface Note {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
}

export interface ContactEvent {
  id: string;
  leadId: string;
  type: ContactEventType;
  channel: OutreachChannel;
  /** `sent` = we initiated; `received` = lead replied. */
  direction: 'sent' | 'received';
  detail?: string;
  /** Meta message ID or email provider message ID for deduplication. */
  externalId?: string;
  createdAt: string;
}

// ── Outreach Sequences ────────────────────────────────────────────────────────

/** A reusable multi-step outreach campaign template. */
export interface OutreachSequence {
  id: string;
  userId: string;
  name: string;
  description?: string;
  stepCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A single step within an {@link OutreachSequence}. */
export interface OutreachStep {
  id: string;
  sequenceId: string;
  stepNumber: number;
  /** Days after the previous step (or enrollment) before this step fires. */
  delayDays: number;
  channel: OutreachChannel;
  /** Handlebars-style template; e.g. `Hi {{lead.name}}, …`. */
  bodyTemplate: string;
  /** Email subject template — only relevant when `channel === 'email'`. */
  subjectTemplate?: string;
  createdAt: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'dm_received'
  | 'email_reply'
  | 'lead_status_change'
  | 'deployment_complete'
  | 'build_complete'
  | 'job_complete'
  | 'job_failed';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  /** Arbitrary payload — e.g. `{ leadId: "…" }` for deep-link navigation. */
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// ── Sites & Deployments ───────────────────────────────────────────────────────

/** `static` → S3 + CloudFront. `server` → ECS + RDS. */
export type SiteType = 'static' | 'server';
export type DeploymentStatus =
  | 'pending'
  | 'provisioning'
  | 'deployed'
  | 'failed'
  | 'destroyed';
export type BuildStatus = 'draft' | 'generating' | 'ready' | 'exported';

/**
 * Full structural specification of a generated site produced by the AI builder.
 * Stored as JSON on the `sites` table and consumed by the code-generation pipeline.
 */
export interface SiteSpec {
  name: string;
  type: SiteType;
  industry?: string;
  pages: PageSpec[];
  styleTokens: StyleTokens;
}

export interface PageSpec {
  slug: string;
  title: string;
  sections: SectionSpec[];
}

export interface SectionSpec {
  type: string;
  content: Record<string, unknown>;
}

export interface StyleTokens {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface Site {
  id: string;
  userId: string;
  /** Lead this site was generated for, if any. */
  leadId?: string;
  name: string;
  type: SiteType;
  spec: SiteSpec;
  buildStatus: BuildStatus;
  exportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  siteId: string;
  userId: string;
  status: DeploymentStatus;
  awsRegion: string;
  cloudfrontDomain?: string;
  customDomain?: string;
  /** ECS cluster ARN — only set for `server`-type sites. */
  ecsCluster?: string;
  /** RDS endpoint — only set for `server`-type sites with a database. */
  rdsEndpoint?: string;
  /** S3 key prefix for Terraform remote state. */
  terraformStateKey?: string;
  deployedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Meta Connections ──────────────────────────────────────────────────────────

export type MetaAccountType = 'facebook' | 'instagram';

/** An OAuth-linked Facebook Page or Instagram Business Account. */
export interface MetaConnection {
  id: string;
  userId: string;
  accountType: MetaAccountType;
  accountId: string;
  accountName: string;
  tokenExpiresAt?: string;
  webhookVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Background Jobs ───────────────────────────────────────────────────────────

export type JobStatus = 'pending' | 'running' | 'complete' | 'failed';

/** An async enrichment/scrape job spawned by the intelligence service. */
export interface Job {
  id: string;
  userId: string;
  status: JobStatus;
  businessTypes: string[];
  locations: string[];
  /** Which intelligence tasks to run: `'enrich' | 'score' | 'generate'`. */
  enabledTasks: string[];
  totalFound: number;
  totalEnriched: number;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

// ── Shared API Primitives ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}
