/**
 * Shared helpers for rendering lead status — badge tone + display label.
 * Centralised so every page that shows status uses identical copy and colour.
 */
import type { LeadStatus } from '@sitecrm/types';

/** Maps a {@link LeadStatus} to a design-system Badge tone. */
export function statusBadgeTone(status: LeadStatus): 'neutral' | 'primary' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'new':        return 'neutral';
    case 'contacted':  return 'primary';
    case 'qualified':  return 'warning';
    case 'proposal':   return 'warning';
    case 'won':        return 'success';
    case 'lost':       return 'danger';
  }
}

/** Human-readable label for a {@link LeadStatus}. */
export function statusLabel(status: LeadStatus): string {
  switch (status) {
    case 'new':        return 'New';
    case 'contacted':  return 'Contacted';
    case 'qualified':  return 'Qualified';
    case 'proposal':   return 'Proposal';
    case 'won':        return 'Won';
    case 'lost':       return 'Lost';
  }
}

export const ALL_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
