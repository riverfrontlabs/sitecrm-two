import { Badge, Button, Card } from '@sitecrm/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ContactEvent, Lead, Note } from '@sitecrm/types';
import { leadsApi, ApiError } from '../api/client';
import { statusBadgeTone, statusLabel, ALL_STATUSES } from '../utils/leadStatus';
import { safeExternalHref } from '../utils/url';

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState('');

  const leadQuery = useQuery({
    queryKey: ['leads', id],
    queryFn: () => leadsApi.get(id!),
    enabled: !!id,
  });
  const notesQuery = useQuery({
    queryKey: ['leads', id, 'notes'],
    queryFn: () => leadsApi.listNotes(id!),
    enabled: !!id,
  });
  const eventsQuery = useQuery({
    queryKey: ['leads', id, 'events'],
    queryFn: () => leadsApi.listEvents(id!),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<Lead>) => leadsApi.update(id!, patch),
    onSuccess: () => {
      setActionError('');
      qc.invalidateQueries({ queryKey: ['leads', id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Update failed. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => leadsApi.delete(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      navigate('/leads');
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Delete failed. Please try again.'),
  });

  if (leadQuery.isPending) return <p className="text-sm text-ink-muted">Loading…</p>;
  if (leadQuery.isError || !leadQuery.data) return <p className="text-sm text-danger">Lead not found.</p>;

  const lead = leadQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/leads" className="text-ink-muted hover:text-ink">Leads</Link>
          <span className="text-ink-muted">/</span>
          <span className="font-medium text-ink">{lead.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => updateMutation.mutate({ shortlisted: !lead.shortlisted })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              lead.shortlisted ? 'text-interactive' : 'text-ink-muted hover:text-ink'
            }`}
            title={lead.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          >
            {lead.shortlisted ? '★ Shortlisted' : '☆ Shortlist'}
          </button>
          <Button
            variant="danger"
            size="sm"
            disabled={deleteMutation.isPending}
            onClick={() => { if (confirm(`Delete "${lead.name}"?`)) deleteMutation.mutate(); }}
          >
            Delete
          </Button>
        </div>
      </div>

      {actionError && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {actionError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Lead info */}
          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="font-semibold text-ink">{lead.name}</h2>
              <Badge tone={statusBadgeTone(lead.status)}>{statusLabel(lead.status)}</Badge>
            </div>
            <div className="p-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <InfoField label="Email" value={lead.email} link={lead.email ? `mailto:${lead.email}` : undefined} />
                <InfoField label="Website" value={lead.website} link={safeExternalHref(lead.website)} external />
                <InfoField label="Location" value={lead.location} />
                <InfoField label="Type" value={lead.type} />
                <InfoField label="Facebook Page" value={lead.facebookPageId} />
                <InfoField label="Instagram Acct" value={lead.instagramAccountId} />
                <InfoField label="Rating" value={lead.rating != null ? `${lead.rating} ★` : null} />
                <InfoField label="Reviews" value={lead.reviews != null ? String(lead.reviews) : null} />
                {lead.score != null && (
                  <div>
                    <dt className="text-xs text-ink-muted">Score</dt>
                    <dd className="mt-0.5 font-medium">{lead.score.toFixed(0)} / 100</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Status editor */}
          <Card title="Change status">
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map(status => (
                <button
                  key={status}
                  disabled={status === lead.status || updateMutation.isPending}
                  onClick={() => updateMutation.mutate({ status })}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    status === lead.status
                      ? 'cursor-default opacity-60 ring-2 ring-interactive ring-offset-1'
                      : 'bg-overlay text-ink-muted hover:text-ink'
                  }`}
                >
                  {statusLabel(status)}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <NotesSection leadId={id!} notes={notesQuery.data ?? []} />
          <EventsSection events={eventsQuery.data ?? []} />
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, link, external }: { label: string; value?: string | null; link?: string; external?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 truncate">
        {value ? (
          link ? (
            <a
              href={link}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              className="text-interactive hover:underline"
            >
              {external ? value.replace(/^https?:\/\//, '') : value}
            </a>
          ) : (
            <span className="text-ink">{value}</span>
          )
        ) : (
          <span className="text-ink-muted">–</span>
        )}
      </dd>
    </div>
  );
}

function NotesSection({ leadId, notes }: { leadId: string; notes: Note[] }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const addNote = useMutation({
    mutationFn: () => leadsApi.createNote(leadId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads', leadId, 'notes'] });
      setContent('');
      setError('');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to add note'),
  });

  const deleteNote = useMutation({
    mutationFn: (noteId: string) => leadsApi.deleteNote(leadId, noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads', leadId, 'notes'] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Failed to delete note'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError('');
    addNote.mutate();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Notes</h3>
      </div>
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Add a note…"
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-interactive focus:outline-none"
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" variant="secondary" size="sm" disabled={!content.trim() || addNote.isPending}>
            {addNote.isPending ? 'Adding…' : 'Add note'}
          </Button>
        </form>

        {notes.length > 0 && (
          <ul className="mt-4 space-y-3">
            {notes.map(note => (
              <li key={note.id} className="group flex items-start justify-between gap-2">
                <div>
                  <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{formatDate(note.createdAt)}</p>
                </div>
                <button
                  onClick={() => deleteNote.mutate(note.id)}
                  className="shrink-0 text-xs text-ink-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  title="Delete note"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventsSection({ events }: { events: ContactEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-ink">Activity</h3>
      </div>
      <div className="p-4">
        <ul className="space-y-2">
          {events.map(event => (
            <li key={event.id} className="flex items-start gap-3 text-sm">
              <span className="mt-0.5 shrink-0 rounded-full bg-overlay px-2 py-0.5 text-xs text-ink-muted">
                {event.channel.replace('_', ' ')}
              </span>
              <div>
                <p className="text-ink">{eventLabel(event)}</p>
                <p className="text-xs text-ink-muted">{formatDate(event.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function eventLabel(event: ContactEvent): string {
  switch (event.type) {
    case 'email_sent':              return 'Email sent';
    case 'email_opened':            return 'Email opened';
    case 'email_clicked':           return 'Email link clicked';
    case 'facebook_dm_sent':        return 'Facebook DM sent';
    case 'facebook_dm_received':    return 'Facebook DM received';
    case 'instagram_dm_sent':       return 'Instagram DM sent';
    case 'instagram_dm_received':   return 'Instagram DM received';
    case 'call':                    return 'Call logged';
    case 'meeting':                 return 'Meeting logged';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
