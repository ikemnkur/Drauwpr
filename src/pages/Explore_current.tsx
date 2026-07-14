import { Link, useLocation } from 'react-router-dom';
import { Flame, Clock, Users, Search, Star, Sparkles, Megaphone, TrendingUp, ChevronRight, User } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import PromotionModal from '../components/PromotionModal';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';


type SearchTab = 'drops' | 'profiles';

type CreatorPreview = {
  id: string;
  username: string;
  avatar: string;
  postCount: number;
  tags: string[];
};

/* ── Drop Card (reused across sections) ── */
function DropCard({ drop, badge }: { drop: Drop; badge?: string }) {
  const remaining = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const goalPct = Math.min((drop.currentContributions / drop.goalAmount) * 100, 100);
  const linkTo = drop.status === 'dropped' ? `/drop/${drop.id}/download` : `/drop/${drop.id}`;

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
      <div className="h-32 bg-surface-3 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
          <img
            src={drop.thumbnailUrl || `https://picsum.photos/seed/${drop.id}/400/200`}
          alt={drop.title}
          className="w-full h-full object-cover"
        />
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
interface TopCreator {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  creatorRating: number;
  totalDropsCreated: number;
  totalCreditsEarned: number;
}

function CreatorSpotlight({ creator }: { creator: TopCreator }) {
  return (
    <Link
      to={`/user/${creator.id}`}
      className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 hover:bg-surface-3 transition no-underline group"
    >
      <div className="w-11 h-11 rounded-full bg-surface-3 flex items-center justify-center text-lg font-bold text-brand shrink-0 overflow-hidden">
        {creator.profilePicture
          ? <img src={creator.profilePicture} alt={creator.username} className="w-full h-full object-cover" />
          : creator.username[0].toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text group-hover:text-brand transition truncate">{creator.username}</p>
        <p className="text-xs text-text-muted truncate">{creator.bio || ''}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-green-500">{creator.creatorRating ?? 0}%</p>
        <p className="text-[10px] text-text-muted">{creator.totalDropsCreated} drops</p>
      </div>
    </Link>
  );
}

/* ── Main Page ── */
interface FeaturedResponse {
  featured: ServerDrop[];
  trending: ServerDrop[];
  newest: ServerDrop[];
  topCreators: TopCreator[];
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
  const { drops } = useApp();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [search, setSearch] = useState('');
  const [searchTab, setSearchTab] = useState<SearchTab>('drops');
  const [featured, setFeatured] = useState<Drop[]>([]);
  const [hottest, setHottest] = useState<Drop[]>([]);
  const [newest, setNewest] = useState<Drop[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [sponsoredPromos, setSponsoredPromos] = useState<SponsoredPromo[]>([]);
  const [activeSponsoredAdId, setActiveSponsoredAdId] = useState<string | null>(null);
  const [adDetailsModalOpen, setAdDetailsModalOpen] = useState(false);

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
        setTopCreators(res.topCreators);
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
          void api.post(`/api/promotions/${p.id}/impression`, {}).catch(() => {});
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

  const recommended = useMemo(() => [...drops].sort((a, b) => b.contributorCount - a.contributorCount), [drops]);

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

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return creators;

    const mode = q[0];
    const term = (mode === '@' || mode === '#') ? q.slice(1).trim() : q;
    if (!term) return creators;

    if (mode === '#') {
      return creators.filter((creator) => creator.tags.some((tag) => tag.toLowerCase().replace(/^#/, '').includes(term)));
    }

    return creators.filter((creator) => creator.username.toLowerCase().includes(term));
  }, [creators, search]);

  const activeSponsoredAd = useMemo(
    () => sponsoredPromos.find((promo) => promo.id === activeSponsoredAdId) || null,
    [sponsoredPromos, activeSponsoredAdId]
  );

  const hasSearchQuery = search.trim().length > 0;

  const openAdDetailsModal = (ad: SponsoredPromo) => {
    setActiveSponsoredAdId(ad.id);
    void api.post(`/api/promotions/${ad.id}/impression`, {}).catch(() => {});
    setAdDetailsModalOpen(true);
  };

  const openAdTarget = () => {
    if (!activeSponsoredAd) return;
    void api.post(`/api/promotions/${activeSponsoredAd.id}/click`, {}).catch(() => {});
    const target = resolveAdTarget(activeSponsoredAd);
    setAdDetailsModalOpen(false);
    if (/^https?:\/\//i.test(target)) {
      window.open(target, '_blank', 'noopener,noreferrer');
    } else {
      window.location.assign(target);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero search */}
      <div className="bg-gradient-to-br from-brand/10 via-surface to-surface rounded-2xl p-6 sm:p-8">
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
        {/* Mode tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setSearchTab('drops')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              searchTab === 'drops' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Drops
          </button>
          <button
            onClick={() => setSearchTab('profiles')}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              searchTab === 'profiles' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
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
          {filteredProfiles.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-10">No users found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredProfiles.slice(0, 18).map((creator) => <ProfileCard key={creator.id} creator={creator} />)}
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
          {/* ── Featured ── */}
          <section>
            <SectionHeader icon={Star} title="Featured Drops" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {featured.slice(0, 4).map((d) => (
                <DropCard key={d.id} drop={d} badge="Featured" />
              ))}
            </div>
          </section>

          {/* ── Sponsored ── */}
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

          {/* ── Hottest Right Now ── */}
          <section>
            <SectionHeader icon={TrendingUp} title="Hottest Right Now" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hottest.slice(0, 3).map((d) => (
                <DropCard key={d.id} drop={d} />
              ))}
            </div>
          </section>

          {/* ── Recommended For You ── */}
          <section>
            <SectionHeader icon={Sparkles} title="Recommended For You" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recommended.slice(0, 4).map((d) => (
                <DropCard key={d.id} drop={d} />
              ))}
            </div>
          </section>

          {/* ── Newest Drops ── */}
          <section>
            <SectionHeader icon={Clock} title="Just Dropped" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {newest.slice(0, 3).map((d) => (
                <DropCard key={d.id} drop={d} />
              ))}
            </div>
          </section>

          {/* ── Creator Spotlight ── */}
          {topCreators.length > 0 && (
            <section>
              <SectionHeader icon={Star} title="Creator Spotlight" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {topCreators.map((c) => (
                  <CreatorSpotlight key={c.id} creator={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <PromotionModal
        open={adDetailsModalOpen}
        ad={activeSponsoredAd}
        countdown={0}
        variant={activeSponsoredAd?.submissionType === 'post_sponsorship' ? 'post_sponsorship' : 'ad'}
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
