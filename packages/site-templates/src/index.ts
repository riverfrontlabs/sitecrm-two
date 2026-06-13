/**
 * @sitecrm/site-templates — template catalog and factory helpers for the AI site builder.
 *
 * Templates are the starting-point structural definitions that the builder either:
 *   a) Uses directly when the user picks "start from a template", or
 *   b) Blends with AI-generated content when the prompt asks for a specific industry.
 *
 * The `SiteTemplate` type wraps a partial {@link SiteSpec} with metadata
 * (name, description, industry tags) so the builder UI can display a catalog.
 *
 * This package is intentionally minimal in Phase 1.  The component catalog and
 * richer template library are added in Phase 3 (AI Site/App Builder).
 */

import type { SiteSpec } from '@sitecrm/types';

export type { SiteSpec, PageSpec, SectionSpec, StyleTokens } from '@sitecrm/types';

// ── Template shape ────────────────────────────────────────────────────────────

/**
 * A named, categorised starting-point for a generated site.
 *
 * `defaultSpec` omits `name` because the user supplies that at generation time.
 */
export interface SiteTemplate {
  id: string;
  name: string;
  description: string;
  /** Industry keywords used to match templates to a lead's business type. */
  industryTags: string[];
  /** Path to a thumbnail image relative to the package root (optional). */
  thumbnail?: string;
  defaultSpec: Omit<SiteSpec, 'name'>;
}

// ── Built-in templates ────────────────────────────────────────────────────────

/**
 * The initial template catalog.
 *
 * These are intentionally sparse stubs.  Real section content is populated by
 * the AI generation pipeline in Phase 3; these supply the structural skeleton
 * and default style tokens.
 */
export const TEMPLATES: SiteTemplate[] = [
  {
    id: 'landing-minimal',
    name: 'Minimal Landing Page',
    description: 'Clean single-page site: hero, features overview, and a contact form.',
    industryTags: ['generic'],
    defaultSpec: {
      type: 'static',
      pages: [
        {
          slug: '/',
          title: 'Home',
          sections: [
            { type: 'hero', content: { headline: '', subheadline: '', ctaText: 'Get Started' } },
            { type: 'features', content: { items: [] } },
            { type: 'contact', content: {} },
          ],
        },
      ],
      styleTokens: {
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
      },
    },
  },
  {
    id: 'business-full',
    name: 'Full Business Site',
    description: 'Multi-page business site with home, about, services, and contact pages.',
    industryTags: ['generic', 'professional-services'],
    defaultSpec: {
      type: 'static',
      pages: [
        {
          slug: '/',
          title: 'Home',
          sections: [
            { type: 'hero', content: {} },
            { type: 'services-preview', content: {} },
            { type: 'testimonials', content: {} },
          ],
        },
        {
          slug: '/about',
          title: 'About',
          sections: [{ type: 'about', content: {} }],
        },
        {
          slug: '/services',
          title: 'Services',
          sections: [{ type: 'services', content: {} }],
        },
        {
          slug: '/contact',
          title: 'Contact',
          sections: [{ type: 'contact', content: {} }],
        },
      ],
      styleTokens: {
        primaryColor: '#16a34a',
        secondaryColor: '#4b5563',
        backgroundColor: '#ffffff',
        textColor: '#111827',
      },
    },
  },
  {
    id: 'app-with-backend',
    name: 'Web App with Backend',
    description: 'React SPA backed by a Node.js API and PostgreSQL database — deployed to ECS.',
    industryTags: ['generic', 'saas', 'technology'],
    defaultSpec: {
      type: 'server',
      pages: [
        {
          slug: '/',
          title: 'Dashboard',
          sections: [{ type: 'dashboard', content: {} }],
        },
      ],
      styleTokens: {
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        backgroundColor: '#f9fafb',
        textColor: '#111827',
      },
    },
  },
];

// ── Catalog helpers ───────────────────────────────────────────────────────────

/**
 * Returns a template by id, or `undefined` if not found.
 *
 * @example
 * const tmpl = getTemplate('landing-minimal');
 * if (!tmpl) throw new Error('Template not found');
 */
export function getTemplate(id: string): SiteTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/**
 * Returns all templates that match at least one of the provided industry tags.
 * Passing an empty array returns the full catalog (useful for showing all options).
 *
 * @example
 * const results = getTemplatesByIndustry(['saas', 'technology']);
 */
export function getTemplatesByIndustry(tags: string[]): SiteTemplate[] {
  if (tags.length === 0) return TEMPLATES;
  return TEMPLATES.filter((t) => tags.some((tag) => t.industryTags.includes(tag)));
}
