import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  Flame,
  CreditCard,
  User,
  HelpCircle,
  History,
  LogIn,
  Zap,
  Megaphone,
  Compass,
  LayoutDashboard,
  Bell,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface Notif {
  id: string;
  title: string;
  message: string;
  priority: 'success' | 'info' | 'warning' | 'error';
  category: string;
  actionUrl: string | null;
  isRead: number;
  createdAt: string;
}

const PRIORITY_DOT: Record<string, string> = {
  success: 'bg-success',
  info: 'bg-brand',
  warning: 'bg-warning',
  error: 'bg-danger',
};

const NAV = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/dashboard', label: 'My Drops', icon: LayoutDashboard },
  { to: '/promo', label: 'Ads/Promo', icon: Megaphone },
  { to: '/contributions', label: 'Active', icon: Zap },
  { to: '/buy-credits', label: 'Credits', icon: CreditCard },
  { to: '/history', label: 'History', icon: History },
  { to: '/account', label: 'Account', icon: User },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export default function Layout() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [showBell, setShowBell] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = (notifs ?? []).filter((n) => !n.isRead).length;

  // Fetch notifications
  function fetchNotifs() {
    if (!isAuthenticated) return;
    api.get<{ notifications: Notif[] }>('/api/notifications/me?limit=20')
      .then((res) => setNotifs(Array.isArray(res?.notifications) ? res.notifications : []))
      .catch(() => {});
  }

  // Refresh user data (credits, etc.) once when layout mounts
  useEffect(() => {
    if (isAuthenticated) {
      refreshUser();
      fetchNotifs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Poll notifications every 90s
  useEffect(() => {
    if (!isAuthenticated) return;
    const t = setInterval(fetchNotifs, 90_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Close bell dropdown on outside click
  useEffect(() => {
    if (!showBell) return;
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBell]);

  async function markAllRead() {
    await api.patch('/api/notifications/read-all', {}).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
  }

  async function markRead(notifId: string) {
    await api.patch(`/api/notifications/${notifId}/read`, {}).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === notifId ? { ...n, isRead: 1 } : n));
  }

  async function deleteNotif(e: React.MouseEvent, notifId: string) {
    e.stopPropagation();
    await api.delete(`/api/notifications/${notifId}`).catch(() => {});
    setNotifs((prev) => prev.filter((n) => n.id !== notifId));
  }

  function handleNotifClick(n: Notif) {
    markRead(n.id);
    setShowBell(false);
    if (n.actionUrl) navigate(n.actionUrl);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="bg-surface border-b border-surface-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/explore" className="flex items-center gap-2 text-brand font-bold text-xl tracking-tight no-underline">
            <Flame className="w-6 h-6 flame-flicker" />
            Drauwper
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors no-underline ${
                  pathname === to
                    ? 'bg-brand/15 text-brand'
                    : 'text-text-muted hover:text-text hover:bg-surface-2'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-text-muted">
                  <span className="text-brand font-semibold">{user.creditBalance.toLocaleString()}</span> credits
                </span>

                {/* Notification bell */}
                <div ref={bellRef} className="relative">
                  <button
                    onClick={() => setShowBell((v) => !v)}
                    className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-2 transition-colors text-text-muted hover:text-text"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {showBell && (
                    <div className="absolute right-0 top-10 w-80 bg-surface border border-surface-3 rounded-2xl shadow-2xl z-50 overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
                        <span className="text-sm font-semibold text-text">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllRead}
                            className="text-xs text-brand hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* List */}
                      <div className="max-h-80 overflow-y-auto divide-y divide-surface-3">
                        {(notifs ?? []).length === 0 ? (
                          <p className="text-center text-sm text-text-muted py-8">No notifications</p>
                        ) : (
                          (notifs ?? []).map((n) => (
                            <div
                              key={n.id}
                              onClick={() => handleNotifClick(n)}
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-2 transition-colors group ${
                                !n.isRead ? 'bg-surface-2/50' : ''
                              }`}
                            >
                              <span
                                className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                                  n.isRead ? 'bg-surface-3' : (PRIORITY_DOT[n.priority] ?? 'bg-brand')
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-text leading-snug">{n.title}</p>
                                <p className="text-xs text-text-muted leading-snug mt-0.5 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-text-muted/60 mt-1">
                                  {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                              <button
                                onClick={(e) => deleteNotif(e, n.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger shrink-0 mt-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  to="/account"
                  className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-sm font-bold text-brand hover:bg-brand/30 transition-colors"
                >
                  {user.username[0].toUpperCase()}
                </Link>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors no-underline"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto border-t border-surface-3 px-2 py-1 gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap no-underline ${
                pathname === to
                  ? 'bg-brand/15 text-brand'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-3 py-4 text-center text-xs text-text-muted">
        &copy; 2026 Drauwper. Drop it when it&apos;s hot.
      </footer>
    </div>
  );
}
