# SiteCRM Two — Product Roadmap

## Vision

A single-tenant agency tool that combines an AI-powered website/app builder with a CRM pipeline for lead management and cold outreach. Agencies use it to generate client sites, deploy them to AWS, and manage ongoing client relationships from one dashboard.

---

## Architecture

### Monorepo Structure

```
sitecrm-two/
├── apps/
│   ├── web/              # Main CRM dashboard (lead pipeline, outreach, notifications, hosting dashboard)
│   ├── server/           # Primary Fastify API (Drizzle ORM, JWT auth, business logic)
│   ├── builder/          # AI-assisted site/app builder UI + live preview pane
│   └── intelligence/     # Lead scoring, OpenAI integration, Playwright web scraping
├── packages/
│   ├── design-system/    # Themeable component library (keep from boilerplate)
│   ├── types/            # Shared TypeScript interfaces across all apps
│   └── site-templates/   # Template definitions + component catalog for the builder
├── terraform/            # AWS infrastructure modules (static + server site types)
└── docker-compose.yml    # Traefik reverse proxy + all services
```

### Service Routing (Traefik)
- `app.localhost` → `apps/web` (port 5173)
- `api.localhost` → `apps/server` (port 3000)
- `builder.localhost` → `apps/builder` (port 5174)
- `intelligence.localhost` → `apps/intelligence` (port 3001)

### Tech Stack
| Concern | Choice |
|---|---|
| Frontend | React 19, Tailwind CSS 4, Vite 6, React Router 7 |
| State | TanStack React Query + React Context |
| Backend | Fastify 5, Node 20+ |
| Database | PostgreSQL 17, Drizzle ORM (Neon-compatible for prod) |
| Auth | JWT (@fastify/jwt) + bcrypt |
| Outreach | Meta Graph API (Facebook/Instagram DMs), Nodemailer/Resend (email) |
| Builder AI | OpenAI (GPT-4o) — prompt → site description → code generation |
| Scraping | Playwright (replaces Puppeteer) |
| Lead Intelligence | OpenAI + Playwright + structured extraction |
| Reverse Proxy | Traefik v3 (local dev + prod) |
| Infrastructure | Terraform (AWS: S3/CloudFront for static, ECS/RDS for server apps) |
| UI Library | Custom design-system package + Radix UI primitives |

---

## Phase 1 — Foundation
**Goal:** Working monorepo with all four apps scaffolded, auth, and database layer.

- [x] Add `apps/builder` and `apps/intelligence` workspaces
- [x] Rename/restructure `apps/web` for CRM dashboard
- [x] Add `packages/types` shared type definitions
- [x] Add `packages/site-templates` stub
- [x] Replace raw `pg` driver with Drizzle ORM in `apps/server`
- [x] Define initial DB schemas: users, leads, sites, deployments, notifications
- [x] Implement JWT auth (register, login, refresh, middleware)
- [x] Set up Traefik in `docker-compose.yml` for all four services
- [ ] Update Terraform modules: static site (S3+CloudFront) and server app (ECS+RDS) variants

---

## Phase 2 — CRM Core
**Goal:** Functional lead pipeline with outreach and notifications.

- [ ] Lead list, pipeline board (kanban), and lead detail views
- [ ] Meta Business API integration
  - Webhook endpoint for incoming FB/Instagram DMs
  - Send DM via Graph API (Facebook Messenger + Instagram Messaging)
  - OAuth flow for connecting a Meta Business account
- [ ] Email outreach integration (Resend API)
  - Compose and send cold outreach emails
  - Track open/click events via webhooks
- [ ] Outreach sequence builder (multi-step campaigns: email + DM)
- [ ] In-app notification system
  - Real-time notifications (SSE or WebSocket) for new DMs, replies, lead status changes
  - Notification center UI in `apps/web`
- [ ] Basic lead intelligence (company info enrichment from web)

---

## Phase 3 — AI Site/App Builder
**Goal:** Prompt-driven generator that produces exportable, standalone projects.

- [ ] Builder UI (`apps/builder`)
  - Split-pane: prompt/config panel + live preview
  - Conversation-style prompt interface for initial generation
  - Interactive section/component editor (click to edit, AI-assisted rewrites)
- [ ] Template system (`packages/site-templates`)
  - Template catalog with metadata (industry, page structure, style tokens)
  - Component library aligned with design-system
  - "From scratch" mode (no template base)
- [ ] AI generation pipeline (`apps/server` + OpenAI)
  - Prompt → structured site spec (pages, sections, content, style)
  - Spec → code generation (React + Tailwind or plain HTML/CSS)
  - Iterative edit: user describes a change → AI patches the affected component
- [ ] Live preview (`apps/builder`)
  - Renders generated project in an iframe sandbox
  - Hot-updates on AI edits
- [ ] Site type support
  - Static marketing site (React + Vite → builds to static HTML)
  - App with backend (React frontend + Express/Fastify server + optional DB)

---

## Phase 4 — Export & Hosting
**Goal:** One-click export with deployment-ready package and an AWS hosting dashboard.

- [ ] Export package generator
  - ZIP of standalone project files (ready to `npm install && npm run dev`)
  - Terraform module for the site's AWS environment (static or server type)
  - `hosting.properties` file (domain, AWS region, resource names, deploy config)
- [ ] AWS Hosting Dashboard (in `apps/web`)
  - List deployed sites with status, domain, last deploy date
  - Trigger redeploy from dashboard
  - View CloudFront/ECS health metrics
  - Domain management (add/verify custom domain, update Route53 records)
  - Environment variables management for server-type deployments
- [ ] CI/CD integration (optional export artifact)
  - GitHub Actions workflow file included in ZIP

---

## Phase 5 — Intelligence & Enrichment
**Goal:** Improved lead scoring and prospect research.

- [ ] Playwright-based web scraper (replaces Puppeteer)
  - Structured data extraction from prospect websites
  - Screenshot capture for site analysis
- [ ] OpenAI-powered lead scoring
  - Score leads based on scraped data + DM/email engagement
  - Generate outreach personalization suggestions
- [ ] Prospect research automation
  - Auto-enrich new leads: company info, social profiles, tech stack detection
  - Summarize findings in lead detail view
- [ ] Builder AI improvements
  - Use scraped prospect site as context for generating a replacement/competitor site
  - Style matching from reference URLs

---

## Backlog / Future

- Multi-user with role-based access (expand single-tenant to team accounts)
- Client portal — share preview links and collect feedback
- White-label builder (agencies resell to clients)
- Stripe billing integration for hosting plan management
- Analytics dashboard per deployed site (CloudFront + custom events)
- Mobile app for CRM notifications

---

## Reference: Existing Codebase (site-crm)
Location: `C:\Users\plack\projects\riverfront\site-crm`
Use as reference for: Drizzle ORM schema patterns, JWT auth implementation, Traefik docker-compose config, React Query data-fetching patterns, Fastify route structure.
