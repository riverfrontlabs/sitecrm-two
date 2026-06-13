import { Badge, Button } from '@sitecrm/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Lead, LeadStatus } from '@sitecrm/types';
import { Input } from '@sitecrm/design-system';
import { leadsApi, ApiError } from '../api/client';
import { statusBadgeTone, statusLabel, ALL_STATUSES } from '../utils/leadStatus';

const PAGE_SIZE = 20;

export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  const search = searchParams.get('search') ?? '';
  const statusParam = searchParams.getAll('status') as LeadStatus[];
  const shortlisted = searchParams.get('shortlisted') === 'true' ? true : undefined;

  const { data, isPending, isError } = useQuery({
    queryKey: ['leads', { page, search, status: statusParam, shortlisted }],
    queryFn: () =>
      leadsApi.list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        status: statusParam.length ? statusParam : undefined,
        shortlisted,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const setFilter = (key: string, value: string | null) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const toggleStatus = (status: LeadStatus) => {
    setPage(1);
    const next = new URLSearchParams(searchParams);
    const current = next.getAll('status');
    if (current.includes(status)) {
      next.delete('status');
      current.filter(s => s !== status).forEach(s => next.append('status', s));
    } else {
      next.append('status', status);
    }
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Leads</h1>
        <div className="flex items-center gap-2">
          <Link to="/leads/pipeline">
            <Button variant="ghost" size="sm">Pipeline view</Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            + Add lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search name, email, location…"
          value={search}
          onChange={e => setFilter('search', e.target.value || null)}
          className="h-10 w-64 rounded-md border border-border bg-surface px-3 text-sm text-ink placeholder:text-ink-muted focus:border-interactive focus:outline-none"
        />
        <div className="flex flex-wrap gap-1">
          {ALL_STATUSES.map(status => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                statusParam.includes(status)
                  ? 'bg-interactive text-white'
                  : 'bg-overlay text-ink-muted hover:text-ink'
              }`}
            >
              {statusLabel(status)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setFilter('shortlisted', shortlisted ? null : 'true')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            shortlisted ? 'bg-interactive text-white' : 'bg-overlay text-ink-muted hover:text-ink'
          }`}
        >
          ★ Shortlisted
        </button>
        {(search || statusParam.length > 0 || shortlisted) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchParams({}); setPage(1); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {isPending && <p className="px-4 py-3 text-sm text-ink-muted">Loading…</p>}
        {isError && <p className="px-4 py-3 text-sm text-danger">Failed to load leads.</p>}
        {data && data.data.length === 0 && (
          <p className="px-4 py-3 text-sm text-ink-muted">No leads match your filters.</p>
        )}
        {data && data.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.data.map(lead => (
                  <LeadRow key={lead.id} lead={lead} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>{data ? `${data.total} leads` : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              ← Previous
            </Button>
            <span>{page} / {totalPages}</span>
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next →
            </Button>
          </div>
        </div>
      )}

      {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  return (
    <tr className="hover:bg-overlay/50">
      <td className="px-4 py-3">
        <Link to={`/leads/${lead.id}`} className="font-medium text-ink hover:text-interactive hover:underline">
          {lead.name}
          {lead.shortlisted && <span className="ml-1 text-xs text-interactive">★</span>}
        </Link>
      </td>
      <td className="px-4 py-3 text-ink-muted">{lead.location ?? '–'}</td>
      <td className="px-4 py-3">
        <Badge tone={statusBadgeTone(lead.status)}>{statusLabel(lead.status)}</Badge>
      </td>
      <td className="px-4 py-3 text-ink-muted">
        {lead.email ? (
          <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
        ) : '–'}
      </td>
      <td className="px-4 py-3 text-ink-muted">
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {lead.website.replace(/^https?:\/\//, '')}
          </a>
        ) : '–'}
      </td>
      <td className="px-4 py-3 text-right tabular-nums">
        {lead.score != null ? lead.score.toFixed(0) : '–'}
      </td>
    </tr>
  );
}

function AddLeadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => leadsApi.create({ name, email: email || undefined, website: website || undefined, location: location || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create lead');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold text-ink">Add lead</h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input label="Name *" value={name} onChange={e => setName(e.target.value)} autoFocus required />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Website" type="url" value={website} onChange={e => setWebsite(e.target.value)} />
            <Input label="Location" value={location} onChange={e => setLocation(e.target.value)} />
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={mutation.isPending}>
                {mutation.isPending ? 'Adding…' : 'Add lead'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
