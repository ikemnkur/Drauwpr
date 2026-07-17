import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  User,
  HelpCircle,
  LogIn,
  Megaphone,
  Compass,
  ArrowBigDownDash,
  Bell,
  X,
  // Music,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import PromotionModal from './PromotionModal';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import {
  deleteFrontendNotification,
  getFrontendNotifications,
  markAllFrontendNotificationsRead,
  markFrontendNotificationRead,
  mergeNotifications,
  runFrontendDropDetectionSync,
  type BackendNotification,
  type NotificationItem,
} from '../lib/frontendNotifications';

interface DashboardNotifResponse {
  myPosts?: ServerDrop[];
  myDrops?: ServerDrop[];
}

interface SponsoredPromo {
  id: string;
  username: string | null;
  submissionType: 'ad' | 'drop_sponsorship';
  title: string;
  description: string | null;
  targetDropId: string;
  target_url: string | null;
  ctaText: string | null;
  mediaUrl: string | null;
  assetPath: string | null;
  thumbnailPath?: string | null;
  thumbnailImg?: string | null;
  mediaType: string | null;
}

type MediaKind = 'image' | 'video' | 'audio';

function detectMediaKind(assetPath: string | null, mediaUrl: string | null, mediaType: string | null | undefined): MediaKind {
  if (mediaType) {
    if (/^video/i.test(mediaType)) return 'video';
    if (/^audio/i.test(mediaType)) return 'audio';
    if (/^image/i.test(mediaType)) return 'image';
  }
  const url = (assetPath || mediaUrl || '').toLowerCase().split('?')[0];
  if (!url) return 'image';
  if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return 'video';
  if (/\.(mp4|webm|mov|avi|mkv)$/.test(url)) return 'video';
  if (/\.(mp3|wav|ogg|aac|flac|m4a)$/.test(url)) return 'audio';
  return 'image';
}

function toEmbedUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

interface SponsoredResponse {
  sponsored: SponsoredPromo[];
}

const PRIORITY_DOT: Record<string, string> = {
  success: 'bg-success',
  info: 'bg-brand',
  warning: 'bg-warning',
  error: 'bg-danger',
};

const NAV = [
  { to: '/explore', label: 'Explore', icon: Compass },
  // { to: '/dashboard', label: 'My Drops', icon: LayoutDashboard },
  { to: '/dashboard', label: 'My Drops', icon: ArrowBigDownDash },
  { to: '/promo', label: 'Promo/Ads', icon: Megaphone },
  // { to: '/contributions', label: 'Active', icon: Zap },
  // { to: '/buy-credits', label: 'Credits', icon: CreditCard },
  // { to: '/history', label: 'History', icon: History },
  // { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/account', label: 'Account', icon: User },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export default function Layout() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [showBell, setShowBell] = useState(false);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredPromo[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [activeAd, setActiveAd] = useState<SponsoredPromo | null>(null);
  const [adCloseCountdown, setAdCloseCountdown] = useState(3);
  const [isLayoutHeaderCollapsed, setIsLayoutHeaderCollapsed] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = (notifs ?? []).filter((n) => !n.isRead).length;

  const shouldBlockAdPopup = (routePath: string, freq: number): boolean => {
    const key = `prolifer8_ad_gate:${routePath}`;
    const now = Date.now();
    const ttlMs = 20_000;

    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { blocked?: boolean; ts?: number };
        if (typeof parsed?.blocked === 'boolean' && typeof parsed?.ts === 'number' && now - parsed.ts < ttlMs) {
          return parsed.blocked;
        }
      }
    } catch {
      // Ignore parse/storage errors and re-roll below.
    }

    const blocked = Math.random() > freq;
    try {
      sessionStorage.setItem(key, JSON.stringify({ blocked, ts: now }));
    } catch {
      // Ignore storage failures; gating still works for this run.
    }
    return blocked;
  };

  function resolveAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) return 'https://picsum.photos/seed/sponsored-modal/600/300';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${API_BASE}${raw}`;
    return `${API_BASE}/${raw}`;
  }

  function resolveTarget(targetDropId: string): string {
    const t = String(targetDropId || '').trim();
    if (!t) return '/explore';
    if (/^https?:\/\//i.test(t)) return t;
    if (t.startsWith('/')) return t;
    if (t.includes('/drop/')) return t;
    return `/drop/${t}`;
  }

  // Fetch notifications
  function fetchNotifs() {
    if (!isAuthenticated || !user?.id) return;
    api.get<{ notifications: BackendNotification[] }>('/api/notifications/me?limit=20')
      .then((res) => {
        const backend = Array.isArray(res?.notifications) ? res.notifications : [];
        const frontend = getFrontendNotifications(user.id);
        setNotifs(mergeNotifications(backend, frontend));
      })
      .catch(() => {
        setNotifs(getFrontendNotifications(user.id));
      });
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

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;

    const runDetection = async () => {
      try {
        const res = await api.get<DashboardNotifResponse>('/api/dashboard');
        if (cancelled) return;
        const myDropsRaw = res.myDrops || res.myDrops || [];
        const myDrops = myDropsRaw.map(mapDrop);
        const { created } = runFrontendDropDetectionSync({ userId: user.id, drops: myDrops });
        if (created.length > 0) fetchNotifs();
      } catch {
        // Detection is best-effort and should not block layout behavior.
      }
    };

    void runDetection();
    const timer = window.setInterval(() => {
      void runDetection();
    }, 60 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

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

  useEffect(() => {
    let cancelled = false;
    api.get<SponsoredResponse>('/api/promotions/sponsored?limit=10')
      .then((res) => {
        if (!cancelled) setSponsoredAds(res.sponsored || []);
      })
      .catch(() => {
        if (!cancelled) setSponsoredAds([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const isExplore = pathname === '/explore';
    const isAccount = pathname === '/account';
    const isDashboard = pathname === '/dashboard';
    const isPromo = pathname.startsWith('/promo');
    const isDropFeature = /^\/drop\/[^/]+$/.test(pathname);
    const shouldShowOnRoute = isExplore || isAccount || isDashboard || isPromo || isDropFeature;

    // Frequency gate — reads VITE_AD_POPUP_FREQ (0.0–1.0, default 0.3)
    const rawFreq = Number(import.meta.env.VITE_AD_POPUP_FREQ ?? '0.3');
    const freq = Number.isFinite(rawFreq) ? Math.min(1, Math.max(0, rawFreq)) : 0.3;
    const blocked = shouldBlockAdPopup(pathname, freq);

    console.debug('[ad-popup] route=%s freq=%s blocked=%s ads=%s', pathname, freq, blocked, sponsoredAds.length);

    // Subscribed users (Standard / Premium) are ad-free
    const isSubscribed = ['standard', 'premium'].includes((user?.accountPlan ?? '').toLowerCase());

    console.log('[ad-popup] shouldShowOnRoute=%s isSubscribed=%s activeAd=%s', shouldShowOnRoute, isSubscribed, activeAd?.id);

    

    if (!shouldShowOnRoute || sponsoredAds.length === 0 || blocked || isSubscribed) {
      setShowAdModal(false);
      setActiveAd(null);
      return;
    }

    const next = sponsoredAds[Math.floor(Math.random() * sponsoredAds.length)];
    setActiveAd(next);
    setAdCloseCountdown(3);

    // Show modal after a random delay between 3 and 13 seconds.
    setShowAdModal(false);
    const delayMs = Math.floor(Math.random() * 10_001) + 3000;
    const timer = window.setTimeout(() => {
      setShowAdModal(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, sponsoredAds, user?.accountPlan]);

  // Count down the close button delay whenever the modal is open
  useEffect(() => {
    if (!showAdModal) return;
    setAdCloseCountdown(3);
    const t = setInterval(() => {
      setAdCloseCountdown((prev) => {
        if (prev <= 1) { clearInterval(t); return 0; }
        return prev - 1;
      });
    }, 1_000);
    return () => clearInterval(t);
  }, [showAdModal]);

  useEffect(() => {
    if (!showAdModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && adCloseCountdown === 0) setShowAdModal(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAdModal, adCloseCountdown]);

  useEffect(() => {
    if (!showAdModal || !activeAd) return;
    void api.post(`/api/promotions/${activeAd.id}/impression`, {}).catch(() => {});
  }, [showAdModal, activeAd]);

  async function markAllRead() {
    if (user?.id) markAllFrontendNotificationsRead(user.id);
    await api.patch('/api/notifications/read-all', {}).catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
  }

  async function markRead(notif: NotificationItem) {
    if (notif.source === 'frontend') {
      if (user?.id) markFrontendNotificationRead(user.id, notif.id);
      setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: 1 } : n));
      return;
    }
    await api.patch(`/api/notifications/${notif.id}/read`, {}).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.id === notif.id ? { ...n, isRead: 1 } : n));
  }

  async function deleteNotif(e: React.MouseEvent, notif: NotificationItem) {
    e.stopPropagation();
    if (notif.source === 'frontend') {
      if (user?.id) deleteFrontendNotification(user.id, notif.id);
      setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
      return;
    }
    await api.delete(`/api/notifications/${notif.id}`).catch(() => {});
    setNotifs((prev) => prev.filter((n) => n.id !== notif.id));
  }

  function handleNotifClick(n: NotificationItem) {
    void markRead(n);
    setShowBell(false);
    navigate('/notifications');
  }

  function openSponsoredTarget() {
    if (!activeAd) return;
    void api.post(`/api/promotions/${activeAd.id}/click`, {}).catch(() => {});
    setShowAdModal(false);
    // Ads link to an external URL (target_url); sponsorships link to a drop inside the app
    if (activeAd.submissionType === 'ad' && activeAd.target_url) {
      window.open(activeAd.target_url, '_blank', 'noopener,noreferrer');
    } else {
      const target = resolveTarget(activeAd.targetDropId);
      if (/^https?:\/\//i.test(target)) {
        window.location.href = target;
      } else {
        navigate(target);
      }
    }
  }

  function reactToAd(reaction: 'like' | 'neutral' | 'dislike') {
    if (!activeAd) return;
    void api.post(`/api/promotions/${activeAd.id}/reaction`, { reaction }).catch(() => {});
  }

  function openAdInNewTab() {
    if (!activeAd || !activeAd.target_url) return;
    void api.post(`/api/promotions/${activeAd.id}/click`, {}).catch(() => {});
    window.open(activeAd.target_url, '_blank', 'noopener,noreferrer');
    setShowAdModal(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <button
        type="button"
        onClick={() => setIsLayoutHeaderCollapsed((prev) => !prev)}
        aria-expanded={!isLayoutHeaderCollapsed}
        aria-label={isLayoutHeaderCollapsed ? 'Show layout header' : 'Hide layout header'}
        className="fixed left-1/2 top-0 z-[120] flex h-4 w-16 -translate-x-1/2 items-center justify-center rounded-b-xl border border-white/20 bg-black/5 text-white/90 backdrop-blur-sm transition hover:bg-black/25"
      >
        {isLayoutHeaderCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      <PromotionModal
        open={showAdModal && !!activeAd}
        ad={activeAd}
        countdown={adCloseCountdown}
        variant={activeAd?.submissionType === 'drop_sponsorship' ? 'post_sponsorship' : 'ad'}
        onClose={() => adCloseCountdown === 0 && setShowAdModal(false)}
        onPrimaryAction={activeAd?.submissionType === 'ad' ? openAdInNewTab : openSponsoredTarget}
        onReact={reactToAd}
        resolveAssetUrl={resolveAssetUrl}
        detectMediaKind={detectMediaKind}
        toEmbedUrl={toEmbedUrl}
        primaryLabel={activeAd?.submissionType === 'ad' ? 'Visit Site' : 'Learn more'}
      />

      {/* Top navbar */}
      <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${isLayoutHeaderCollapsed ? 'max-h-0 opacity-0' : 'max-h-44 opacity-100'}`}>
        <header className="bg-surface border-b border-surface-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/explore" className="flex items-center gap-2 text-brand font-bold text-xl tracking-tight no-underline">
          Prolifer
          <div style={{ padding: '0 5px', backgroundColor: '#d377f7', borderRadius: '0.5rem' }} className="flex items-center gap-4">
 
            <span className="text-white">8</span>
        
          </div>
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
                {/* <span className="text-sm text-text-muted">
                  <span className="text-brand font-semibold">{user.creditBalance.toLocaleString()}</span> credits
                </span> */}

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
                              key={`${n.source}-${n.id}`}
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
                                onClick={(e) => deleteNotif(e, n)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-danger shrink-0 mt-0.5"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Footer */}
                      <div className="px-4 py-2 border-t border-surface-3 bg-surface-2/40">
                        <Link
                          to="/notifications"
                          onClick={() => setShowBell(false)}
                          className="text-xs text-brand hover:underline"
                        >
                          View all notifications
                        </Link>
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
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-3 py-4 text-center text-xs text-text-muted">
        &copy; 2026 Prolifer8. BLOW the LUCK up.
      </footer>
    </div>
  );
}
