import { Badge } from '@sitecrm/design-system';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { Lead, LeadStatus } from '@sitecrm/types';
import { leadsApi } from '../api/client';
import { statusBadgeTone, statusLabel, ALL_STATUSES } from '../utils/leadStatus';

export function PipelinePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['leads', 'pipeline'],
    queryFn: () => leadsApi.list({ pageSize: 200, page: 1 }),
  });

  if (isPending) {
    return <p className="text-sm text-ink-muted">Loading pipeline…</p>;
  }
  if (isError) {
    return <p className="text-sm text-danger">Failed to load pipeline.</p>;
  }

  const byStatus = groupByStatus(data.data);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Pipeline</h1>
        <Link to="/leads" className="text-sm text-interactive hover:underline">List view</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ALL_STATUSES.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            leads={byStatus[status] ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanColumn({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-canvas">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Badge tone={statusBadgeTone(status)}>{statusLabel(status)}</Badge>
        <span className="text-sm font-medium text-ink-muted">{leads.length}</span>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {leads.length === 0 && (
          <p className="py-4 text-center text-xs text-ink-muted">No leads</p>
        )}
        {leads.map(lead => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <Link to={`/leads/${lead.id}`}>
      <div className="rounded-lg border border-border bg-surface p-3 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-medium leading-tight text-ink">{lead.name}</p>
          {lead.shortlisted && <span className="shrink-0 text-xs text-interactive">★</span>}
        </div>
        {lead.location && (
          <p className="mt-0.5 truncate text-xs text-ink-muted">{lead.location}</p>
        )}
        {lead.score != null && (
          <div className="mt-2 flex items-center gap-1">
            <div className="h-1 flex-1 rounded-full bg-overlay">
              <div
                className="h-1 rounded-full bg-interactive"
                style={{ width: `${lead.score}%` }}
              />
            </div>
            <span className="tabular-nums text-xs text-ink-muted">{lead.score.toFixed(0)}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function groupByStatus(leads: Lead[]): Record<LeadStatus, Lead[]> {
  const result = {} as Record<LeadStatus, Lead[]>;
  for (const status of ALL_STATUSES) result[status] = [];
  for (const lead of leads) result[lead.status].push(lead);
  return result;
}
