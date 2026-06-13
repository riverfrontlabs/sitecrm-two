# CLAUDE.md — SiteCRM Two

This file gives Claude Code persistent context about this project. Read it at the start of every session.

## What This Project Is

A single-tenant agency tool combining:
1. **AI-powered site/app builder** — prompt-driven generator + interactive editor, exports standalone project ZIPs with Terraform + hosting config for AWS deployment
2. **CRM lead pipeline** — cold outreach via Facebook/Instagram DMs (Meta Graph API) and email (Resend), NOT SMS
3. **AWS hosting dashboard** — manage deployed client sites (S3+CloudFront static, ECS+RDS server apps)
4. **Lead intelligence** — Playwright web scraping + OpenAI for lead scoring and prospect enrichment
5. **In-app notifications** — real-time alerts for DMs, email replies, lead status changes

## Monorepo Structure

```
apps/web/          → Main CRM dashboard (lead pipeline, outreach, hosting dashboard)
apps/server/       → Primary Fastify API (Drizzle ORM, JWT auth)
apps/builder/      → AI site/app builder UI + live preview
apps/intelligence/ → Lead scoring, OpenAI, Playwright scraping
packages/design-system/   → Themeable React component library (keep as-is)
packages/types/    → Shared TypeScript interfaces
packages/site-templates/  → Template/component catalog for builder
terraform/         → AWS modules: static (S3+CloudFront) and server (ECS+RDS)
```

## Key Tech Decisions

- **ORM**: Drizzle (NOT raw pg) — type-safe schemas, Neon-compatible for prod
- **Auth**: JWT via @fastify/jwt + bcrypt
- **Outreach**: Meta Graph API for FB/Instagram DMs + Resend for email — no SMS
- **Builder AI**: OpenAI GPT-4o — prompt → structured site spec → code generation → iterative edits
- **Scraping**: Playwright (NOT Puppeteer) — more reliable, better multi-browser support
- **Reverse proxy**: Traefik for local dev (subdomains per app)
- **Infra**: Terraform AWS (two variants — static site, server app)

## Reference Project

The existing app at `C:\Users\plack\projects\riverfront\site-crm` is the reference monorepo.
Use it for: Drizzle schema patterns, JWT auth implementation, Traefik docker-compose setup, React Query patterns, Fastify route structure.
Do NOT copy it wholesale — this is a ground-up rewrite with significant differences.

## Current Phase

**Phase 1 — Foundation** (not yet started)
See `Roadmap.md` for full phase breakdown and task checklist.

## Conventions

- TypeScript strict mode throughout
- Drizzle ORM for all DB access — no raw SQL except in migrations
- Fastify plugins for cross-cutting concerns (auth, CORS, rate limit)
- React Query for all server state in frontend apps
- Design system components first — only reach for Radix primitives when design-system doesn't cover it
- Zod for all API input validation
- All secrets via environment variables — never hardcoded
- Prettier + ESLint enforced (run `npm run lint` and `npm run typecheck` before committing)
