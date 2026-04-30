import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, CheckCheck, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

type Notif = {
  id: string;
  title: string;
  message: string;
  priority: 'success' | 'info' | 'warning' | 'error';
  category: string;
  actionUrl: string | null;
  isRead: number;
  createdAt: string;
};

const PRIORITY_CHIP: Record<string, string> = {
  success: 'bg-green-500/15 text-green-400',
  info: 'bg-brand/15 text-brand',
  warning: 'bg-yellow-500/15 text-yellow-400',
  error: 'bg-danger/15 text-danger',
};

function formatDate(input: string) {
  const date = new Date(input);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await api.get<{ notifications: Notif[] }>('/api/notifications/me?limit=50');
      setItems(Array.isArray(res?.notifications) ? res.notifications : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  async function markAllRead() {
    await api.patch('/api/notifications/read-all', {}).catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
  }

  async function markRead(notifId: string) {
    await api.patch(`/api/notifications/${notifId}/read`, {}).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: 1 } : n)));
  }

  async function remove(notifId: string) {
    await api.delete(`/api/notifications/${notifId}`).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== notifId));
  }

  async function goToNotification(n: Notif) {
    await markRead(n.id);
    if (n.actionUrl) {
      navigate(n.actionUrl);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand" />
          Notifications
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">{unreadCount} unread</span>
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed text-text-muted hover:text-text flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="bg-surface border border-surface-3 rounded-2xl overflow-hidden divide-y divide-surface-3">
        {loading ? (
          <p className="px-4 py-8 text-sm text-text-muted text-center">Loading notifications...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-sm text-text-muted text-center">You have no notifications yet.</p>
        ) : (
          items.map((n) => (
            <article key={n.id} className={`px-4 py-3 ${!n.isRead ? 'bg-surface-2/40' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? 'bg-surface-3' : 'bg-brand'}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-text">{n.title}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CHIP[n.priority] ?? PRIORITY_CHIP.info}`}>
                      {n.priority}
                    </span>
                    <span className="text-[10px] text-text-muted/70">{formatDate(n.createdAt)}</span>
                  </div>

                  <p className="text-sm text-text-muted mt-1">{n.message}</p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => void goToNotification(n)}
                      disabled={!n.actionUrl}
                      className="text-xs px-3 py-1.5 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      Go
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {!n.isRead && (
                      <button
                        onClick={() => void markRead(n.id)}
                        className="text-xs px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text"
                      >
                        Mark read
                      </button>
                    )}

                    <button
                      onClick={() => void remove(n.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-danger/20 text-text-muted hover:text-danger"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
