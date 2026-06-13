import { Badge, Button } from '@sitecrm/design-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '@sitecrm/types';
import { notificationsApi } from '../api/client';

export function NotificationsPage() {
  const qc = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list({ pageSize: 50 }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-ink">Notifications</h1>
          {data?.unreadCount ? (
            <Badge tone="primary">{data.unreadCount} unread</Badge>
          ) : null}
        </div>
        {data && data.unreadCount > 0 && (
          <Button variant="ghost" size="sm" disabled={markAll.isPending} onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        {isPending && <p className="px-4 py-4 text-sm text-ink-muted">Loading…</p>}
        {isError && <p className="px-4 py-4 text-sm text-danger">Failed to load notifications.</p>}
        {data && data.data.length === 0 && (
          <p className="px-4 py-4 text-sm text-ink-muted">No notifications yet.</p>
        )}
        {data && data.data.length > 0 && (
          <ul className="divide-y divide-border">
            {data.data.map(n => <NotificationItem key={n.id} notification={n} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const markRead = useMutation({
    mutationFn: () => notificationsApi.markRead(n.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClick = () => {
    if (!n.read) markRead.mutate();
    if (n.data?.leadId) navigate(`/leads/${n.data.leadId}`);
  };

  return (
    <li
      onClick={handleClick}
      className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-overlay ${!n.read ? 'bg-interactive/5' : ''}`}
    >
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-interactive'}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${n.read ? 'text-ink-muted' : 'font-medium text-ink'}`}>{n.title}</p>
        <p className="text-xs text-ink-muted">{n.body}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          {new Date(n.createdAt).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
    </li>
  );
}
