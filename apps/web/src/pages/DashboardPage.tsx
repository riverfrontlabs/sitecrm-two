import { Badge, Card } from '@sitecrm/design-system';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { LeadStatus } from '@sitecrm/types';
import { leadsApi } from '../api/client';
import { statusBadgeTone, statusLabel } from '../utils/leadStatus';

const PIPELINE_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

export function DashboardPage() {
  const statusCounts = useQueries({
    queries: PIPELINE_STATUSES.map(status => ({
      queryKey: ['leads', 'count', status] as const,
      queryFn: () => leadsApi.list({ status, pageSize: 1, page: 1 }),
    })),
  });

  const shortlistedQuery = useQuery({
    queryKey: ['leads', 'count', 'shortlisted'],
    queryFn: () => leadsApi.list({ shortlisted: true, pageSize: 1, page: 1 }),
  });

  const recentLeads = useQuery({
    queryKey: ['leads', 'recent'],
    queryFn: () => leadsApi.list({ pageSize: 5, page: 1 }),
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-ink">Dashboard</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-ink-muted">Pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PIPELINE_STATUSES.map((status, i) => {
            const q = statusCounts[i]!;
            return (
              <Link key={status} to={`/leads?status=${status}`}>
                <Card className="transition-colors hover:border-interactive">
                  <div className="py-1 text-center">
                    <p className="text-2xl font-bold text-ink">
                      {q.isPending ? '–' : (q.data?.total ?? 0)}
                    </p>
                    <Badge tone={statusBadgeTone(status)} className="mt-1">
                      {statusLabel(status)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex items-center gap-3">
        <span className="text-sm text-ink-muted">Shortlisted leads:</span>
        <span className="text-lg font-semibold text-ink">
          {shortlistedQuery.isPending ? '–' : (shortlistedQuery.data?.total ?? 0)}
        </span>
        <Link to="/leads?shortlisted=true" className="text-sm text-interactive hover:underline">
          View all
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">Recent leads</h2>
          <Link to="/leads" className="text-sm text-interactive hover:underline">View all</Link>
        </div>
        <div className="rounded-lg border border-border bg-surface shadow-sm overflow-hidden">
          {recentLeads.isPending && (
            <p className="px-4 py-3 text-sm text-ink-muted">Loading…</p>
          )}
          {recentLeads.isError && (
            <p className="px-4 py-3 text-sm text-danger">Failed to load leads</p>
          )}
          {recentLeads.data && recentLeads.data.data.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink-muted">
              No leads yet.{' '}
              <Link to="/leads" className="text-interactive hover:underline">Add your first lead →</Link>
            </p>
          )}
          {recentLeads.data && recentLeads.data.data.length > 0 && (
            <ul className="divide-y divide-border">
              {recentLeads.data.data.map(lead => (
                <li key={lead.id}>
                  <Link
                    to={`/leads/${lead.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-overlay"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink">{lead.name}</p>
                      {lead.location && <p className="text-xs text-ink-muted">{lead.location}</p>}
                    </div>
                    <Badge tone={statusBadgeTone(lead.status)}>{statusLabel(lead.status)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
