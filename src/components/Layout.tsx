import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import {
  Flame,
  CreditCard,
  User,
  HelpCircle,
  History,
  LogIn,
  Megaphone,
  Compass,
  ArrowBigDownDash,
  Bell,
  X,
  Music,
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
  { to: '/dashboard', label: 'Drops', icon: ArrowBigDownDash },
  { to: '/promo', label: 'Promo', icon: Megaphone },
  // { to: '/contributions', label: 'Active', icon: Zap },
  { to: '/buy-credits', label: 'Credits', icon: CreditCard },
  { to: '/history', label: 'History', icon: History },
  // { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/account', label: 'Account', icon: User },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export default function Layout() {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [showBell, setShowBell] = useState(false);
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredPromo[]>([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [activeAd, setActiveAd] = useState<SponsoredPromo | null>(null);
  const [adCloseCountdown, setAdCloseCountdown] = useState(3);
  const bellRef = useRef<HTMLDivElement>(null);
  const unreadCount = (notifs ?? []).filter((n) => !n.isRead).length;

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

    // Frequency gate — reads VITE_AD_POPUP_FREQ (0.0–1.0, default 1.0)
    const freq = Math.min(1, Math.max(0, parseFloat(import.meta.env.VITE_AD_POPUP_FREQ ?? '1') || 1));
    const blocked = Math.random() > freq;

    if (!shouldShowOnRoute || sponsoredAds.length === 0 || blocked) {
      setShowAdModal(false);
      setActiveAd(null);
      return;
    }

    const next = sponsoredAds[Math.floor(Math.random() * sponsoredAds.length)];
    setActiveAd(next);
    setAdCloseCountdown(3);

    // Show modal after a random delay between 0 and 10 seconds.
    setShowAdModal(false);
    const delayMs = Math.floor(Math.random() * 10_001);
    const timer = window.setTimeout(() => {
      setShowAdModal(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pathname, sponsoredAds]);

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
    void markRead(n.id);
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
      {showAdModal && activeAd && activeAd.submissionType === 'ad' && (
        /* ── Advertisement modal ── */
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/65"
            onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
            aria-label="Close advertisement"
          />
          <div className="relative w-full max-w-xl bg-surface border border-surface-3 rounded-2xl overflow-hidden shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
              disabled={adCloseCountdown > 0}
              className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white transition z-10 ${
                adCloseCountdown > 0
                  ? 'bg-black/40 cursor-not-allowed'
                  : 'bg-black/50 hover:bg-black/70 cursor-pointer'
              }`}
              aria-label={adCloseCountdown > 0 ? `Close in ${adCloseCountdown}s` : 'Close'}
            >
              {adCloseCountdown > 0 ? (
                <span className="text-xs font-bold">{adCloseCountdown}</span>
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
            {/* Media banner — image, video, or audio depending on asset type */}
            {(() => {
              const resolvedUrl = resolveAssetUrl(activeAd.assetPath, activeAd.mediaUrl);
              const kind = detectMediaKind(activeAd.assetPath, activeAd.mediaUrl, activeAd.mediaType);

              if (kind === 'video') {
                const embedSrc = toEmbedUrl(resolvedUrl);
                return (
                  <div className="aspect-[16/7] bg-black overflow-hidden">
                    {embedSrc ? (
                      <iframe
                        src={embedSrc}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={activeAd.title}
                      />
                    ) : (
                      <video
                        src={resolvedUrl}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      />
                    )}
                  </div>
                );
              }

              if (kind === 'audio') {
                return (
                  <div className="bg-surface-2 px-5 py-8 flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center">
                      <Music className="w-7 h-7 text-brand" />
                    </div>
                    <p className="text-sm font-semibold text-text text-center line-clamp-1">{activeAd.title}</p>
                    <audio
                      src={resolvedUrl}
                      controls
                      preload="metadata"
                      className="w-full max-w-xs"
                    />
                  </div>
                );
              }

              // Default: image (clickable → opens advertiser URL in new tab)
              return (
                <button
                  onClick={openAdInNewTab}
                  className="block w-full aspect-[16/7] bg-surface-2 overflow-hidden cursor-pointer group"
                  aria-label={`Visit ${activeAd.title}`}
                >
                  <img
                    src={resolvedUrl}
                    alt={activeAd.title}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                </button>
              );
            })()}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted/60 border border-surface-3 rounded px-1.5 py-0.5">
                  Ad
                </span>
                <p className="text-[10px] text-text-muted/50 truncate">{activeAd.username || 'Advertiser'}</p>
              </div>
              <h3 className="text-lg font-bold text-text">{activeAd.title}</h3>
              <p className="text-xs text-text-muted mt-1 line-clamp-2">{activeAd.description || ''}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => reactToAd('like')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Like
                </button>
                <button
                  onClick={() => reactToAd('neutral')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Neutral
                </button>
                <button
                  onClick={() => reactToAd('dislike')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Dislike
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={openAdInNewTab}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-dark transition"
                >
                  {activeAd.ctaText || 'Visit Site'}
                </button>
                <button
                  onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
                  disabled={adCloseCountdown > 0}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                    adCloseCountdown > 0
                      ? 'bg-surface-2 text-text-muted/50 cursor-not-allowed'
                      : 'bg-surface-2 text-text-muted hover:text-text cursor-pointer'
                  }`}
                >
                  {adCloseCountdown > 0 ? `Close (${adCloseCountdown}s)` : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAdModal && activeAd && activeAd.submissionType === 'drop_sponsorship' && (
        /* ── Sponsored drop modal ── */
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop — only dismissible after countdown */}
          <button
            className="absolute inset-0 bg-black/65"
            onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
            aria-label="Close ad"
          />
          <div className="relative w-full max-w-xl bg-surface border border-surface-3 rounded-2xl overflow-hidden shadow-2xl">
            {/* Close button — shows countdown then becomes active */}
            <button
              onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
              disabled={adCloseCountdown > 0}
              className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white transition ${
                adCloseCountdown > 0
                  ? 'bg-black/40 cursor-not-allowed'
                  : 'bg-black/50 hover:bg-black/70 cursor-pointer'
              }`}
              aria-label={adCloseCountdown > 0 ? `Close in ${adCloseCountdown}s` : 'Close'}
            >
              {adCloseCountdown > 0 ? (
                <span className="text-xs font-bold">{adCloseCountdown}</span>
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
            <div className="aspect-[16/7] bg-surface-2 overflow-hidden">
              <img
                src={resolveAssetUrl(activeAd.assetPath, activeAd.mediaUrl)}
                alt={activeAd.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-brand/80">Sponsored</p>
              <h3 className="text-lg font-bold text-text mt-1">{activeAd.title}</h3>
              <p className="text-xs text-text-muted mt-1 line-clamp-3">{activeAd.description || 'Sponsored content'}</p>
              <p className="text-[11px] text-text-muted mt-2">By {activeAd.username || 'Sponsor'}</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => reactToAd('like')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Like
                </button>
                <button
                  onClick={() => reactToAd('neutral')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Neutral
                </button>
                <button
                  onClick={() => reactToAd('dislike')}
                  className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
                >
                  Dislike
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={openSponsoredTarget}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-dark transition"
                >
                  {activeAd.ctaText || 'Learn more'}
                </button>
                <button
                  onClick={() => adCloseCountdown === 0 && setShowAdModal(false)}
                  disabled={adCloseCountdown > 0}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                    adCloseCountdown > 0
                      ? 'bg-surface-2 text-text-muted/50 cursor-not-allowed'
                      : 'bg-surface-2 text-text-muted hover:text-text cursor-pointer'
                  }`}
                >
                  {adCloseCountdown > 0 ? `Close (${adCloseCountdown}s)` : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
