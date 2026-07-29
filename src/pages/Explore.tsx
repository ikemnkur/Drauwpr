import { Link, useLocation } from 'react-router-dom';
import { Flame, Clock, Users, Search, Star, Sparkles, Megaphone, TrendingUp, ChevronRight, User } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import PromotionModal from '../components/PromotionModal';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';


type SearchTab = 'drops' | 'profiles';
type ExploreTabId = 'recommended' | 'featured' | 'following' | 'hottest' | 'latest';

type CreatorPreview = {
  id: string;
  username: string;
  avatar: string;
  postCount: number;
  tags: string[];
};

type FavoriteDropsResponse = ServerDrop[];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_PROMPT_STORAGE_KEY = 'drauwper-install-prompt-next-at';
const INSTALL_PROMPT_INTERVAL_MS = 15 * 60 * 1000;

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer;
}

/* ── Drop Card (reused across sections) ── */
function DropCard({ drop, badge }: { drop: Drop; badge?: string }) {
  const remaining = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const goalPct = Math.min((drop.currentContributions / drop.goalAmount) * 100, 100);
  const linkTo = drop.status === 'dropped' ? `/drop/${drop.id}/download` : `/drop/${drop.id}`;
  const thumbnailSrc = drop.thumbnailUrl || `https://picsum.photos/seed/${drop.id}/400/200`;

  return (
    <Link
      to={linkTo}
      className="bg-surface-2 rounded-2xl p-4 hover:bg-surface-3 transition-colors block no-underline group relative"
    >
      {badge && (
        <span className="absolute top-3 right-3 bg-brand/20 text-brand text-[10px] font-bold uppercase px-2 py-0.5 rounded-full z-10">
          {badge}
        </span>
      )}
      {/* Thumbnail */}
      <div className="relative h-32 bg-surface-3 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
        <img
          src={thumbnailSrc}
          alt={drop.title}
          className={`w-full h-full object-cover transition-transform duration-300 ${drop.mature ? 'scale-110 blur-lg' : ''}`}
        />
        {drop.mature && (
          <>
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
            <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full z-10">
              Mature
            </span>
            <div className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-black/65 px-3 py-2 text-center text-[11px] font-medium text-white">
              Mature content preview blurred
            </div>
          </>
        )}
      </div>

      <h3 className="text-sm font-semibold text-text group-hover:text-brand transition-colors line-clamp-1 mb-1">
        {drop.title}
      </h3>
      <p className="text-xs text-text-muted line-clamp-2 mb-2">{drop.description}</p>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        {drop.status !== 'dropped' && remaining > 0 && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {days > 0 ? `${days}d ` : ''}{hours}h
          </span>
        )}
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-brand" />
          {drop.burnRate.toFixed(1)}x
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {drop.contributorCount.toLocaleString()}
        </span>
      </div>

      {/* Goal bar */}
      <div className="mt-2">
        <div className="h-1 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${goalPct}%`, background: goalPct >= 100 ? '#22c55e' : '#f97316' }}
          />
        </div>
      </div>
    </Link>
  );
}

interface SponsoredPromo {
  id: string;
  username: string | null;
  submissionType: 'ad' | 'post_sponsorship';
  title: string;
  description: string | null;
  targetPostId: string;
  target_url: string | null;
  ctaText: string | null;
  mediaUrl: string | null;
  assetPath: string | null;
  thumbnailPath?: string | null;
  thumbnailImg?: string | null;
  mediaType: string | null;
}

type SponsoredMediaKind = 'image' | 'video' | 'audio';

interface SponsoredApiPromo {
  id: string;
  username: string | null;
  submissionType: string;
  title: string;
  description: string | null;
  targetDropId?: string | null;
  targetPostId?: string | null;
  target_url?: string | null;
  ctaText: string | null;
  mediaUrl: string | null;
  assetPath: string | null;
  thumbnailPath?: string | null;
  thumbnailImg?: string | null;
  mediaType: string | null;
}

interface SponsoredApiResponse {
  sponsored: SponsoredApiPromo[];
}

function detectSponsoredMediaKind(assetPath: string | null, mediaUrl: string | null, mediaType: string | null | undefined): SponsoredMediaKind {
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

function getUserProfilePath(username?: string | null, userId?: string | null): string {
  const identifier = String(username || userId || '').trim();
  return `/user/${encodeURIComponent(identifier)}`;
}

function normalizeSponsoredPromo(promo: SponsoredApiPromo): SponsoredPromo {
  return {
    id: promo.id,
    username: promo.username,
    submissionType: promo.submissionType === 'drop_sponsorship' ? 'post_sponsorship' : 'ad',
    title: promo.title,
    description: promo.description,
    targetPostId: String(promo.targetPostId || promo.targetDropId || '').trim(),
    target_url: promo.target_url || null,
    ctaText: promo.ctaText,
    mediaUrl: promo.mediaUrl,
    assetPath: promo.assetPath,
    thumbnailPath: promo.thumbnailPath,
    thumbnailImg: promo.thumbnailImg,
    mediaType: promo.mediaType,
  };
}

/* ── Section Header ── */
function SectionHeader({ icon: Icon, title, linkTo, linkLabel }: {
  icon: React.ElementType;
  title: string;
  linkTo?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-bold text-text flex items-center gap-2">
        <Icon className="w-5 h-5 text-brand" />
        {title}
      </h2>
      {linkTo && (
        <Link to={linkTo} className="text-xs text-text-muted hover:text-brand transition no-underline flex items-center gap-0.5">
          {linkLabel || 'See all'} <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ── Creator Spotlight Card ── */
/* ── Main Page ── */
interface FeaturedResponse {
  featured: ServerDrop[];
  trending: ServerDrop[];
  newest: ServerDrop[];
  topCreators: unknown[];
}

interface FollowingUser {
  id: string;
}

function ProfileCard({ creator }: { creator: CreatorPreview }) {
  const topTags = creator.tags.slice(0, 3);
  return (
    <Link
      to={getUserProfilePath(creator.username, creator.id)}
      className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 hover:bg-surface-3 transition no-underline group"
    >
      <div className="w-11 h-11 rounded-full bg-surface-3 flex items-center justify-center text-lg font-bold text-brand shrink-0 overflow-hidden">
        {creator.avatar
          ? <img src={creator.avatar} alt={creator.username} className="w-full h-full object-cover" />
          : <User className="w-5 h-5 text-brand" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text group-hover:text-brand transition truncate">{creator.username}</p>
        <p className="text-xs text-text-muted truncate">{creator.postCount} drops</p>
      </div>
      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topTags.map((tag) => (
            <span key={`${creator.id}-${tag}`} className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-text-muted">
              #{tag.replace(/^#/, '')}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

export default function Explore() {
  const location = useLocation();
  const { user } = useAuth();
  const { drops } = useApp();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [search, setSearch] = useState('');
  const [searchTab, setSearchTab] = useState<SearchTab>('drops');
  const [following, setFollowing] = useState<Drop[]>([]);
  const [featured, setFeatured] = useState<Drop[]>([]);
  const [hottest, setHottest] = useState<Drop[]>([]);
  const [newest, setNewest] = useState<Drop[]>([]);
  const [favoriteDrops, setFavoriteDrops] = useState<Drop[]>([]);
  const [sponsoredPromos, setSponsoredPromos] = useState<SponsoredPromo[]>([]);
  const [activeSponsoredAdId, setActiveSponsoredAdId] = useState<string | null>(null);
  const [adDetailsModalOpen, setAdDetailsModalOpen] = useState(false);
  const [followedCreatorIds, setFollowedCreatorIds] = useState<string[]>([]);
  const [profileSearchResults, setProfileSearchResults] = useState<CreatorPreview[]>([]);
  const [profileSearchLoading, setProfileSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ExploreTabId>('recommended');
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushError, setPushError] = useState('');
  const touchStartXRef = useRef<number | null>(null);

  const isInstalled = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    return standalone || iosStandalone;
  }, []);

  const isPromptDue = () => {
    const nextAt = Number(localStorage.getItem(INSTALL_PROMPT_STORAGE_KEY) || '0');
    return Number.isNaN(nextAt) || Date.now() >= nextAt;
  };

  const snoozeInstallPrompt = () => {
    localStorage.setItem(INSTALL_PROMPT_STORAGE_KEY, String(Date.now() + INSTALL_PROMPT_INTERVAL_MS));
    setShowInstallPrompt(false);
  };

  const handleInstallClick = async () => {
    if (!deferredInstallPrompt) return;
    try {
      await deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      setDeferredInstallPrompt(null);
      if (choiceResult.outcome !== 'accepted') {
        snoozeInstallPrompt();
      } else {
        setShowInstallPrompt(false);
      }
    } catch {
      snoozeInstallPrompt();
    }
  };

  const enablePushNotifications = async () => {
    if (!user?.id) {
      setPushError('Sign in to enable push notifications.');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPushError('Push notifications are not supported on this device/browser.');
      return;
    }

    setPushBusy(true);
    setPushError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushError('Notification permission was not granted.');
        setPushBusy(false);
        return;
      }

      const { publicKey } = await api.get<{ publicKey: string }>('/api/push/public-key');
      if (!publicKey) {
        setPushError('Push notifications are not configured yet.');
        setPushBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await api.post('/api/push/subscribe', { subscription });
      setPushEnabled(true);
    } catch {
      setPushError('Unable to enable push notifications.');
    } finally {
      setPushBusy(false);
    }
  };

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      setDeferredInstallPrompt(installEvent);
      if (!isInstalled && isPromptDue()) {
        setShowInstallPrompt(true);
      }
    };

    const onAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isInstalled]);

  useEffect(() => {
    if (isInstalled) {
      setShowInstallPrompt(false);
      return;
    }

    if (isPromptDue()) {
      setShowInstallPrompt(true);
    }

    const timer = window.setInterval(() => {
      if (!isInstalled && isPromptDue()) {
        setShowInstallPrompt(true);
      }
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, [isInstalled]);

  useEffect(() => {
    if (isInstalled || !deferredInstallPrompt) {
      setShowInstallPrompt(false);
      return;
    }
    if (isPromptDue()) {
      setShowInstallPrompt(true);
    }
  }, [deferredInstallPrompt, isInstalled]);

  useEffect(() => {
    if (!user?.id || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setPushEnabled(Boolean(subscription));
      })
      .catch(() => {
        setPushEnabled(false);
      });
  }, [user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawTag = String(params.get('tag') || '').trim();
    if (!rawTag) return;
    const normalizedTag = rawTag.replace(/^#/, '');
    setSearch(`#${normalizedTag}`);
    setSearchTab('drops');
  }, [location.search]);

  function resolveAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) return 'https://picsum.photos/seed/sponsored-default/160/160';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${API_BASE}${raw}`;
    return `${API_BASE}/${raw}`;
  }

  function resolveAdTarget(ad: SponsoredPromo): string {
    if (ad.submissionType === 'ad' && ad.target_url) return ad.target_url;
    const t = String(ad.targetPostId || '').trim();
    if (!t) return '/explore';
    if (/^https?:\/\//i.test(t)) return t;
    if (t.startsWith('/')) return t;
    if (t.includes('/drop/')) return t;
    return `/drop/${t}`;
  }

  useEffect(() => {
    let cancelled = false;

    api.get<FeaturedResponse>('/api/drops/featured')
      .then((res) => {
        if (cancelled) return;
        setFeatured(res.featured.map(mapDrop));
        setHottest(res.trending.map(mapDrop));
        setNewest(res.newest.map(mapDrop));
      })
      .catch(() => {
        // Fallback to context drops
        const activeDrops = drops.filter((d) => d.status === 'active');
        setFeatured(activeDrops.length > 0 ? [...activeDrops].sort((a, b) => b.burnRate - a.burnRate).slice(0, 4) : drops.slice(0, 4));
        setHottest([...drops].sort((a, b) => b.momentum - a.momentum).slice(0, 3));
        setNewest([...drops].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3));
      });

    api.get<SponsoredApiResponse>('/api/promotions/sponsored?limit=6')
      .then((res) => {
        if (cancelled) return;
        const promos = Array.isArray(res.sponsored) ? res.sponsored.map(normalizeSponsoredPromo) : [];
        setSponsoredPromos(promos);
        setActiveSponsoredAdId((prev) => {
          if (prev && promos.some((promo) => promo.id === prev)) return prev;
          return promos[0]?.id ?? null;
        });
        promos.slice(0, 2).forEach((p) => {
          void api.post(`/api/promotions/${p.id}/impression`, {}).catch(() => { });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSponsoredPromos([]);
          setActiveSponsoredAdId(null);
        }
      });

    return () => { cancelled = true; };
  }, [drops]);

  useEffect(() => {
    if (!user?.id) {
      setFavoriteDrops([]);
      return;
    }

    let cancelled = false;
    api.get<FavoriteDropsResponse>('/api/user/favorites')
      .then((rows) => {
        if (cancelled) return;
        setFavoriteDrops((rows || []).map(mapDrop));
      })
      .catch(() => {
        if (!cancelled) setFavoriteDrops([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setFollowedCreatorIds([]);
      return;
    }

    let cancelled = false;
    api.get<FollowingUser[]>(`/api/users/${user.id}/following`)
      .then((rows) => {
        if (cancelled) return;
        setFollowedCreatorIds((rows || []).map((r) => r.id).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setFollowedCreatorIds([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!followedCreatorIds.length) {
      setFollowing([]);
      return;
    }

    const idSet = new Set(followedCreatorIds);
    const pool = [...drops, ...featured, ...hottest, ...newest];
    const byId = new Map<string, Drop>();
    pool.forEach((d) => byId.set(d.id, d));

    const activeFollowing = [...byId.values()]
      .filter((d) => d.isPublic && !['removed', 'draft', 'hidden'].includes(d.status) && idSet.has(d.creatorId))
      .sort((a, b) => b.createdAt - a.createdAt || b.currentContributions - a.currentContributions)
      .slice(0, 10);

    setFollowing(activeFollowing);
  }, [followedCreatorIds, drops, featured, hottest, newest]);

  useEffect(() => {
    const q = search.trim();
    if (searchTab !== 'profiles' || !q) {
      setProfileSearchResults([]);
      setProfileSearchLoading(false);
      return;
    }

    const mode = q[0];
    const term = (mode === '@' || mode === '#') ? q.slice(1).trim() : q;
    if (term.length < 2) {
      setProfileSearchResults([]);
      setProfileSearchLoading(false);
      return;
    }

    let cancelled = false;
    setProfileSearchLoading(true);

    const timer = window.setTimeout(() => {
      api.get<Array<{
        id: string;
        username?: string;
        profilePicture?: string | null;
        totalDropsCreated?: number | null;
      }>>(`/api/users/search?q=${encodeURIComponent(term)}`)
        .then((rows) => {
          if (cancelled) return;
          setProfileSearchResults((rows || []).map((user) => ({
            id: user.id,
            username: String(user.username || '').trim() || 'Unknown',
            avatar: String(user.profilePicture || '').trim(),
            postCount: Number(user.totalDropsCreated || 0),
            tags: [],
          })));
        })
        .catch(() => {
          if (!cancelled) setProfileSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setProfileSearchLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, searchTab]);

  const visibleDrops = useMemo(
    () => drops.filter((d) => d.isPublic && !['removed', 'draft', 'hidden'].includes(d.status)),
    [drops]
  );

  const recommended = useMemo(() => {
    const tagCounts = new Map<string, number>();

    const seedDrops = [
      ...favoriteDrops,
      ...visibleDrops.filter((d) => followedCreatorIds.includes(d.creatorId)),
      ...visibleDrops.filter((d) => d.creatorId === user?.id),
    ];

    seedDrops.forEach((drop) => {
      (drop.tags || []).forEach((tag) => {
        const key = String(tag || '').trim().toLowerCase();
        if (!key) return;
        tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
      });
    });

    const ranked = [...visibleDrops].map((drop) => {
      const overlapScore = (drop.tags || []).reduce((sum, tag) => {
        const key = String(tag || '').trim().toLowerCase();
        return sum + (tagCounts.get(key) || 0);
      }, 0);
      const followingBoost = followedCreatorIds.includes(drop.creatorId) ? 3 : 0;
      const favoriteBoost = favoriteDrops.some((favorite) => favorite.id === drop.id) ? 2 : 0;
      return {
        drop,
        score: overlapScore + followingBoost + favoriteBoost,
      };
    });

    const hasSignals = ranked.some((entry) => entry.score > 0);
    ranked.sort((a, b) => {
      if (hasSignals && b.score !== a.score) return b.score - a.score;
      if (b.drop.currentContributions !== a.drop.currentContributions) return b.drop.currentContributions - a.drop.currentContributions;
      return b.drop.createdAt - a.drop.createdAt;
    });

    return ranked.map((entry) => entry.drop).slice(0, 10);
  }, [favoriteDrops, followedCreatorIds, user?.id, visibleDrops]);

  const featuredSlides = useMemo(
    () => featured.filter((drop) => !drop.mature).slice(0, 10),
    [featured]
  );

  const hottestSlides = useMemo(() => {
    const source = hottest.length ? hottest : visibleDrops;
    return [...source]
      .filter((drop) => !drop.mature)
      .sort((a, b) => b.currentContributions - a.currentContributions || b.contributorCount - a.contributorCount || b.burnRate - a.burnRate)
      .slice(0, 10);
  }, [hottest, visibleDrops]);

  const latestSlides = useMemo(
    () => [...visibleDrops].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10),
    [visibleDrops]
  );

  const creators = useMemo(() => {
    const creatorsMap = new Map<string, CreatorPreview>();

    for (const drop of drops) {
      if (!drop.isPublic || ['removed', 'draft', 'hidden'].includes(drop.status)) continue;
      const existing = creatorsMap.get(drop.creatorId);
      if (!existing) {
        creatorsMap.set(drop.creatorId, {
          id: drop.creatorId,
          username: drop.creatorName,
          avatar: drop.creatorAvatar || '',
          postCount: 1,
          tags: [...(drop.tags || [])],
        });
      } else {
        existing.postCount += 1;
        existing.tags = [...new Set([...existing.tags, ...(drop.tags || [])])];
      }
    }

    return [...creatorsMap.values()].sort((a, b) => b.postCount - a.postCount || a.username.localeCompare(b.username));
  }, [drops]);

  const filteredDrops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return drops;

    const mode = q[0];
    const term = (mode === '@' || mode === '#') ? q.slice(1).trim() : q;
    if (!term) return drops;

    if (mode === '@') {
      return drops.filter((d) => (d.creatorName ?? '').toLowerCase().includes(term));
    }

    if (mode === '#') {
      return drops.filter((d) => d.tags.some((tag) => tag.toLowerCase().replace(/^#/, '').includes(term)));
    }

    return drops.filter((d) =>
      d.title.toLowerCase().includes(term) ||
      d.tags.some((tag) => tag.toLowerCase().replace(/^#/, '').includes(term)) ||
      (d.creatorName ?? '').toLowerCase().includes(term)
    );
  }, [drops, search]);

  const profilesToDisplay = search.trim() ? profileSearchResults : creators;

  const activeSponsoredAd = useMemo(
    () => sponsoredPromos.find((promo) => promo.id === activeSponsoredAdId) || null,
    [sponsoredPromos, activeSponsoredAdId]
  );

  const slides = useMemo(() => ([
    {
      id: 'recommended' as const,
      title: 'Recommended For You',
      chip: 'Recommended',
      icon: Sparkles,
      badge: undefined,
      drops: recommended,
      emptyMessage: 'No recommendations yet. Favorite or follow creators to tune this feed.',
    },
    {
      id: 'featured' as const,
      title: 'Featured',
      chip: 'Featured',
      icon: Star,
      badge: 'Featured',
      drops: featuredSlides,
      emptyMessage: 'No featured drops right now.',
    },
    {
      id: 'following' as const,
      title: 'Following',
      chip: 'Following',
      icon: Users,
      badge: 'Following',
      drops: following,
      emptyMessage: 'You are not following any creators with visible drops yet.',
    },
    {
      id: 'hottest' as const,
      title: 'Hottest Right Now',
      chip: 'Hottest',
      icon: TrendingUp,
      badge: undefined,
      drops: hottestSlides,
      emptyMessage: 'No hot drops available right now.',
    },
    {
      id: 'latest' as const,
      title: 'Latest Drops',
      chip: 'Latest',
      icon: Clock,
      badge: undefined,
      drops: latestSlides,
      emptyMessage: 'No recent drops available right now.',
    },
  ]), [featuredSlides, following, hottestSlides, latestSlides, recommended]);

  const activeSlideIndex = Math.max(0, slides.findIndex((slide) => slide.id === activeTab));

  const hasSearchQuery = search.trim().length > 0;

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX == null || endX == null) return;

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 50) return;

    if (deltaX < 0 && activeSlideIndex < slides.length - 1) {
      setActiveTab(slides[activeSlideIndex + 1].id);
    } else if (deltaX > 0 && activeSlideIndex > 0) {
      setActiveTab(slides[activeSlideIndex - 1].id);
    }
  };

  const openAdDetailsModal = (ad: SponsoredPromo) => {
    setActiveSponsoredAdId(ad.id);
    void api.post(`/api/promotions/${ad.id}/impression`, {}).catch(() => { });
    setAdDetailsModalOpen(true);
  };

  const openAdTarget = () => {
    if (!activeSponsoredAd) return;
    void api.post(`/api/promotions/${activeSponsoredAd.id}/click`, {}).catch(() => { });
    const target = resolveAdTarget(activeSponsoredAd);
    setAdDetailsModalOpen(false);
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(target);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hero search */}
      <div className="bg-gradient-to-br from-brand/10 via-surface to-surface rounded-2xl p-2 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text mb-1">
          Explore Drops
        </h1>
        <p className="text-sm text-text-muted mb-5">
          Discover files worth burning for. Fund the countdown, unlock the drop.
        </p>
        <div className="relative max-w-lg">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search: @username, #tag, or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
        </div>

        {showInstallPrompt && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-4">
            <p className="text-sm font-semibold text-text">Install Drauwper App</p>
            <p className="mt-1 text-xs text-text-muted">
              Add Drauwper to your device for a faster, app-like experience and release notifications.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={!deferredInstallPrompt}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand/90"
              >
                {deferredInstallPrompt ? 'Install App' : 'Use Browser Install Menu'}
              </button>
              <button
                type="button"
                onClick={snoozeInstallPrompt}
                className="rounded-lg border border-surface-3 px-3 py-1.5 text-xs font-semibold text-text-muted hover:text-text"
              >
                Remind me later
              </button>
              {user?.id && (
                <button
                  type="button"
                  onClick={enablePushNotifications}
                  disabled={pushBusy || pushEnabled}
                  className="rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-semibold text-brand disabled:opacity-60"
                >
                  {pushEnabled ? 'Notifications Enabled' : pushBusy ? 'Enabling…' : 'Enable Notifications'}
                </button>
              )}
            </div>
            {pushError && <p className="mt-2 text-xs text-danger">{pushError}</p>}
          </div>
        )}
        {/* Mode tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setSearchTab('drops')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${searchTab === 'drops' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
              }`}
          >
            <Flame className="w-3.5 h-3.5" /> Drops
          </button>
          <button
            onClick={() => setSearchTab('profiles')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${searchTab === 'profiles' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
              }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
        </div>
      </div>

      {/* Search results override */}
      {searchTab === 'profiles' ? (
        <section>
          <SectionHeader icon={Users} title={hasSearchQuery ? `Users matching "${search}"` : 'User Profiles'} />
          {profileSearchLoading ? (
            <p className="text-text-muted text-sm text-center py-10">Searching users…</p>
          ) : profilesToDisplay.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-10">No users found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profilesToDisplay.slice(0, 18).map((creator) => <ProfileCard key={creator.id} creator={creator} />)}
            </div>
          )}
        </section>
      ) : hasSearchQuery ? (
        <section>
          <SectionHeader icon={Search} title={`Results for "${search}"`} />
          {filteredDrops.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-10">No drops found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDrops.map((d) => <DropCard key={d.id} drop={d} />)}
            </div>
          )}
        </section>
      ) : (
        <>
          <section
            className="space-y-3"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >

             <div className="flex flex-wrap items-center justify-center gap-2 pb-1">
              {slides.map((slide, index) => {
                const isActive = slide.id === activeTab;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveTab(slide.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isActive ? 'bg-brand text-white shadow-lg shadow-brand/25' : 'bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text'}`}
                    aria-label={`Go to ${slide.chip}`}
                    aria-current={isActive ? 'true' : 'false'}
                  >
                    <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white' : 'bg-text-muted'}`} />
                    <span>{slide.chip}</span>
                    <span className="text-[10px] opacity-80">{index + 1}/5</span>
                  </button>
                );
              })}
            </div>

            <div className="overflow-hidden rounded-[28px] border border-surface-3 bg-gradient-to-br from-surface via-surface-2/90 to-surface p-1 sm:py-2">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
              >
                {slides.map((slide) => {
                  const Icon = slide.icon;
                  return (
                    <div key={slide.id} className="min-w-full px-1 sm:px-2">
                      <div className="rounded-2xl bg-surface-2/60 p-4 sm:p-5 border border-surface-3/70 min-h-[28rem]">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-text-muted mb-1">Explore</p>
                            <h2 className="text-xl font-bold text-text flex items-center gap-2">
                              <Icon className="w-5 h-5 text-brand" />
                              {slide.title}
                            </h2>
                          </div>
                          <p className="text-xs text-text-muted">{Math.min(slide.drops.length, 10)} drops</p>
                        </div>

                        {slide.drops.length === 0 ? (
                          <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-dashed border-surface-3 bg-surface/60 px-6 text-center text-sm text-text-muted">
                            {slide.emptyMessage}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {slide.drops.slice(0, 10).map((drop) => (
                              <DropCard key={`${slide.id}-${drop.id}`} drop={drop} badge={slide.badge} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <section>
              <SectionHeader icon={Megaphone} title="Sponsored" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sponsoredPromos.length === 0 ? (
                  <div className="bg-surface-2 rounded-2xl p-5 text-sm text-text-muted border border-surface-3">
                    No sponsored drops right now.
                  </div>
                ) : sponsoredPromos.slice(0, 2).map((p) => {
                  const imageSrc = resolveAssetUrl(p.assetPath, p.mediaUrl);
                  const cardClass = 'bg-gradient-to-r from-brand/10 to-surface-2 rounded-2xl p-5 flex gap-4 items-center hover:from-brand/20 transition no-underline group border border-brand/20 w-full text-left';

                  const content = (
                    <>
                      <div className="w-20 h-20 bg-surface-3 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        <img
                          src={imageSrc}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] uppercase font-bold text-brand/70 tracking-wider">Sponsored</span>
                        <h3 className="text-base font-semibold text-text group-hover:text-brand transition truncate">{p.title}</h3>
                        <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{p.description || 'Sponsored content'}</p>
                        <p className="text-[11px] text-brand mt-1 font-semibold">{p.ctaText || 'Learn more'}</p>
                        <p className="text-[10px] text-text-muted mt-1">by {p.username || 'Sponsor'}</p>
                      </div>
                    </>
                  );

                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={cardClass}
                      onClick={() => openAdDetailsModal(p)}
                    >
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>

           
          </section>
        </>
      )}

      <PromotionModal
        open={adDetailsModalOpen}
        ad={activeSponsoredAd}
        countdown={0}
        variant={activeSponsoredAd?.submissionType === 'post_sponsorship' ? 'drop_sponsorship' : 'ad'}
        onClose={() => setAdDetailsModalOpen(false)}
        onPrimaryAction={openAdTarget}
        resolveAssetUrl={resolveAssetUrl}
        detectMediaKind={detectSponsoredMediaKind}
        toEmbedUrl={toEmbedUrl}
        primaryLabel={activeSponsoredAd?.ctaText || 'Visit Site'}
      />
    </div>
  );
}
