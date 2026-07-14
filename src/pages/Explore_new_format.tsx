import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, Search, ThumbsDown, ThumbsUp, Star, User, Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { adsConfig, randomAdDelayMs } from '../config/ads';
import { censorTitle, isMatureContent } from '../lib/contentSafety';
import { getPrimaryRecommendationScore } from '../lib/recommendationScore';
import { getTopTags, loadTagProfile, scoreByTagAffinity, trackTags } from '../lib/tagProfile';
import ExploreSponsoredAdCard from '../components/ExploreSponsoredAdCard';
import PromotionModal from '../components/PromotionModal';
import type { Post } from '../types';

type SearchTab = 'posts' | 'profiles';

type CreatorPreview = {
  id: string;
  username: string;
  avatar: string;
  postCount: number;
  tags: string[];
};

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

interface SponsoredResponse {
  sponsored: SponsoredPromo[];
}

type SponsoredMediaKind = 'image' | 'video' | 'audio';

type ExploreFeedItem =
  | { kind: 'post'; id: string; post: Post; index: number }
  | { kind: 'ad'; id: string };

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

function resolvePostImageUrl(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (!apiBase) return value.startsWith('/') ? value : `/${value}`;
  return value.startsWith('/') ? `${apiBase}${value}` : `${apiBase}/${value}`;
}

function getUserProfilePath(username?: string | null, userId?: string | null): string {
  const identifier = String(username || userId || '').trim();
  return `/user/${encodeURIComponent(identifier)}`;
}

function resolveAdAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
  const apiBase = import.meta.env.VITE_API_URL || '';
  const raw = (pathOrUrl || fallbackUrl || '').trim();
  if (!raw) return 'https://picsum.photos/seed/explore-ad-slot/800/1000';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${apiBase}${raw}`;
  return `${apiBase}/${raw}`;
}

function resolveAdTarget(ad: SponsoredPromo): string {
  if (ad.submissionType === 'ad' && ad.target_url) return ad.target_url;
  const t = String(ad.targetPostId || '').trim();
  if (!t) return '/explore';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('/')) return t;
  if (t.includes('/post/')) return t;
  return `/post/${t}`;
}

function getClipLabel(post: Post, index: number): string {
  const tags = post.tags.map((tag) => tag.toLowerCase());
  const isSponsored = tags.includes('sponsored') || tags.includes('#sponsored');
  if (isSponsored) return 'Sponsored';
  if (post.status === 'boosted') return 'Boosted';
  if (Date.now() - post.createdAt <= 1000 * 60 * 60 * 24) return 'Just Posted';
  if (index < 6) return 'Featured';
  if (post.likeCount - post.dislikeCount >= 20) return 'Hottest';
  if ((post.avgRating ?? 0) >= 80) return 'Recommended';
  return 'Post';
}

function TileCard({ post, clipLabel, onOpen }: { post: Post; clipLabel: string; onOpen: (post: Post) => void }) {
  const avatar = post.creatorAvatar?.trim();
  const tags = post.tags.length > 0 ? post.tags : ['discover', 'new', 'creator'];
  const mature = isMatureContent(post.mature);
  const resolvedThumb = resolvePostImageUrl(post.thumbnailUrl);
  const trailerEmbed = toEmbedUrl(String(post.trailerUrl || ''));
  const showTrailerFallback = !resolvedThumb && post.fileType === 'link' && !!trailerEmbed;

  return (
    <Link
      to={`/post/${post.id}`}
      onClick={() => onOpen(post)}
      id={`explore-post-${post.id}`}
      className="relative block aspect-[9/12] overflow-hidden rounded-2xl bg-surface-2 no-underline group"
      aria-label={`View post ${post.title}`}
    >
      {showTrailerFallback ? (
        <iframe
          src={trailerEmbed || ''}
          title={post.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={`h-full w-full transition duration-300 group-hover:scale-[1.03] ${mature ? 'blur-md saturate-50 brightness-75' : ''}`}
        />
      ) : (
        <img
          src={resolvedThumb || `https://picsum.photos/seed/${post.id}/800/1000`}
          alt={post.title}
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-[1.03] ${mature ? 'blur-md saturate-50 brightness-75' : ''}`}
        />
      )}

      <span className="absolute left-2 top-2 z-10 rounded-full border border-white/30 bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        {clipLabel}
      </span>

      <div className="absolute inset-x-0 bottom-0 z-10 h-12 border-t border-white/15 bg-black/50 px-2 backdrop-blur-[2px]">
        <div className="flex h-6 items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="h-8 w-8 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/20">
              {avatar ? (
                <img src={avatar} alt={post.creatorName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-4 w-4 text-white/80" />
                </div>
              )}
            </div>
            <p className="truncate text-[11px] font-semibold text-white">{post.creatorName}</p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/90">
           <span className="inline-flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {post.views}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <ThumbsUp className="h-3 w-3" />
              {post.likeCount}
            </span>
            <span className="inline-flex items-center gap-0.5 text-white/75">
              <ThumbsDown className="h-3 w-3" />
              {post.dislikeCount}
            </span>
            <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
              <Star className="h-3 w-3" />
              {Math.round(post.avgRating ?? 0)}
            </span>
          </div>
        </div>

        <div className="h-6 overflow-hidden">
          <div className="inline-flex min-w-full animate-[marquee_14s_linear_infinite] items-center gap-2 whitespace-nowrap text-[10px] text-white/85">
            {[...tags, ...tags].map((tag, idx) => (
              <span key={`${post.id}-tag-${idx}`}>#{tag.replace(/^#/, '')}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent opacity-80" />

      <div className="absolute inset-x-0 bottom-12 z-10 px-2 pb-2">
        <p className="max-w-full truncate rounded-md bg-black/45 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          {censorTitle(post.title, mature)}
        </p>
        {mature && (
          <span className="mt-1 inline-flex rounded-full border border-white/25 bg-black/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
            Mature
          </span>
        )}
      </div>
    </Link>
  );
}

function ProfileCard({ creator }: { creator: CreatorPreview }) {
  const topTags = creator.tags.slice(0, 3);
  return (
    <Link
      to={getUserProfilePath(creator.username, creator.id)}
      className="rounded-2xl border border-surface-3 bg-surface-2 p-4 no-underline transition hover:border-brand/50"
      aria-label={`View profile ${creator.username}`}
    >
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-surface ring-1 ring-surface-3">
          {creator.avatar ? (
            <img src={creator.avatar} alt={creator.username} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-text-muted" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text">{creator.username}</p>
          <p className="text-xs text-text-muted">{creator.postCount} posts</p>
        </div>
      </div>

      {topTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
  const { posts } = useApp();
  const [search, setSearch] = useState('');
  const [isSearchPanelCollapsed, setIsSearchPanelCollapsed] = useState(false);
  const [searchTab, setSearchTab] = useState<SearchTab>('posts');
  const [sponsoredAds, setSponsoredAds] = useState<SponsoredPromo[]>([]);
  const [activeSponsoredAdId, setActiveSponsoredAdId] = useState<string | null>(null);
  const [adDetailsModalOpen, setAdDetailsModalOpen] = useState(false);
  const [adSlotReady, setAdSlotReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawTag = String(params.get('tag') || '').trim();
    if (!rawTag) return;

    const normalizedTag = rawTag.replace(/^#/, '');
    setSearch(`#${normalizedTag}`);
    setSearchTab('posts');
  }, [location.search]);

  const topTags = useMemo(() => getTopTags(6), []);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const profile = loadTagProfile();

    // Filter: hide 'removed', 'draft', and 'hidden' posts
    const pool = [...posts]
      .filter((post) => post.isPublic && !['removed', 'draft', 'hidden'].includes(post.status) && Number(post.flagCount || 0) < 3)
      .sort((a, b) => {
        const scoreA = getPrimaryRecommendationScore(a, scoreByTagAffinity(a.tags, profile));
        const scoreB = getPrimaryRecommendationScore(b, scoreByTagAffinity(b.tags, profile));
        return scoreB - scoreA || b.createdAt - a.createdAt;
      });

    if (!q) return pool;

    // Search modes:
    // @username => creator search
    // #tag      => tag search
    // plain     => title search
    const mode = q[0];
    const term = (mode === '@' || mode === '#') ? q.slice(1).trim() : q;
    if (!term) return pool;

    if (mode === '@') {
      return pool.filter((post) => post.creatorName.toLowerCase().includes(term));
    }

    if (mode === '#') {
      return pool.filter((post) => post.tags.some((tag) => tag.toLowerCase().replace(/^#/, '').includes(term)));
    }

    return pool.filter((post) => post.title.toLowerCase().includes(term));
  }, [posts, search]);

  const displayPosts = useMemo(() => {
    const slice = visiblePosts.slice(0, 15);
    // Guarantee at least one boosted post appears if any exist but didn't make the top-15
    const hasBoosted = slice.some((p) => p.status === 'boosted');
    if (!hasBoosted) {
      const boosted = visiblePosts.find((p) => p.status === 'boosted');
      if (boosted) return [boosted, ...slice.slice(0, 14)];
    }
    return slice;
  }, [visiblePosts]);

  const activeSponsoredAd = useMemo(
    () => sponsoredAds.find((ad) => ad.id === activeSponsoredAdId) || null,
    [sponsoredAds, activeSponsoredAdId]
  );

  const postItems = useMemo<ExploreFeedItem[]>(() => {
    const items: ExploreFeedItem[] = displayPosts.map((post, index) => ({
      kind: 'post',
      id: post.id,
      post,
      index,
    }));

    if (!activeSponsoredAd || !adSlotReady) return items;
    const insertAt = Math.min(adsConfig.insertIndex, items.length);
    items.splice(insertAt, 0, { kind: 'ad', id: `explore-ad-${activeSponsoredAd.id}` });
    return items;
  }, [displayPosts, activeSponsoredAd, adSlotReady]);

  useEffect(() => {
    setAdSlotReady(false);
    if (!activeSponsoredAd) return;
    const timer = window.setTimeout(() => {
      setAdSlotReady(Math.random() <= adsConfig.showProbability);
    }, randomAdDelayMs());
    return () => window.clearTimeout(timer);
  }, [activeSponsoredAdId, activeSponsoredAd]);

  const visibleProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    const creatorsMap = new Map<string, CreatorPreview>();

    for (const post of posts) {
      if (!post.isPublic || ['removed', 'draft', 'hidden'].includes(post.status)) continue;
      const existing = creatorsMap.get(post.creatorId);
      if (!existing) {
        creatorsMap.set(post.creatorId, {
          id: post.creatorId,
          username: post.creatorName,
          avatar: post.creatorAvatar || '',
          postCount: 1,
          tags: [...(post.tags || [])],
        });
      } else {
        existing.postCount += 1;
        existing.tags = [...new Set([...existing.tags, ...(post.tags || [])])];
      }
    }

    const pool = [...creatorsMap.values()].sort((a, b) => b.postCount - a.postCount || a.username.localeCompare(b.username));
    if (!q) return pool;

    const mode = q[0];
    const term = (mode === '@' || mode === '#') ? q.slice(1).trim() : q;
    if (!term) return pool;

    if (mode === '#') {
      return pool.filter((creator) => creator.tags.some((tag) => tag.toLowerCase().replace(/^#/, '').includes(term)));
    }

    return pool.filter((creator) => creator.username.toLowerCase().includes(term));
  }, [posts, search]);

  const displayProfiles = useMemo(() => visibleProfiles.slice(0, 18), [visibleProfiles]);

  const handleOpenPost = async (post: Post) => {
    const tags = post.tags || [];
    trackTags(tags, 1);
    try {
      await api.post('/api/tags/interaction', {
        postId: post.id,
        tags,
        eventType: 'open',
        source: 'explore',
      });
    } catch {
      // Non-blocking analytics signal.
    }
  };

  useEffect(() => {
    let cancelled = false;

    api.get<SponsoredResponse>('/api/promotions/sponsored?limit=10')
      .then((res) => {
        if (cancelled) return;
        const ads = Array.isArray(res?.sponsored) ? res.sponsored.filter((a) => a.submissionType === 'ad') : [];
        setSponsoredAds(ads);
        setActiveSponsoredAdId((prev) => {
          if (prev && ads.some((a) => a.id === prev)) return prev;
          return ads[0]?.id ?? null;
        });
      })
      .catch(() => {
        if (cancelled) return;
        setSponsoredAds([]);
        setActiveSponsoredAdId(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sponsoredAds.length <= 1 || adDetailsModalOpen) return;
    const timer = window.setInterval(() => {
      setActiveSponsoredAdId((prev) => {
        const idx = sponsoredAds.findIndex((ad) => ad.id === prev);
        if (idx < 0) return sponsoredAds[0]?.id ?? null;
        return sponsoredAds[(idx + 1) % sponsoredAds.length]?.id ?? null;
      });
    }, adsConfig.rotationMs);

    return () => window.clearInterval(timer);
  }, [sponsoredAds, adDetailsModalOpen]);

  const openAdDetailsModal = () => {
    if (!activeSponsoredAd) return;
    void api.post(`/api/promotions/${activeSponsoredAd.id}/impression`, {}).catch(() => {});
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
    <div className="space-y-6">
      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className={`rounded-2xl bg-gradient-to-br from-brand/10 via-surface to-surface ${isSearchPanelCollapsed ? 'p-4 sm:p-5' : 'p-6 sm:p-8'}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          {!isSearchPanelCollapsed && (
            <div>
              <h1 className="mb-1 text-2xl font-bold text-text sm:text-3xl">Explore Posts</h1>
              <p className="max-w-2xl text-sm text-text-muted">
                This feed currently prioritizes posts that match your local tag profile so you can iterate recommendation logic next.
              </p>
            </div>
          )} 
          {isSearchPanelCollapsed && (
            <h1 className="mb-1 text-2xl font-bold text-text sm:text-3xl">Explore Posts</h1>
          )}
          <button
            type="button"
            onClick={() => setIsSearchPanelCollapsed((prev) => !prev)}
            aria-expanded={!isSearchPanelCollapsed}
            aria-label={isSearchPanelCollapsed ? 'Expand explore search panel' : 'Collapse explore search panel'}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-3 bg-surface-2 text-text-muted transition hover:text-text"
          >
            {isSearchPanelCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>

        {!isSearchPanelCollapsed && topTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {topTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearch(`#${tag.replace(/^#/, '')}`)}
                className="rounded-full border border-surface-3 bg-surface-2 px-3 py-1 text-xs text-text-muted hover:border-brand hover:text-brand"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search: @username, #tag, or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-surface-3 bg-surface-2 py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-text-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div className="mt-3 inline-flex rounded-xl border border-surface-3 bg-surface-2 p-1">
          <button
            type="button"
            onClick={() => setSearchTab('posts')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${searchTab === 'posts' ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-text'}`}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setSearchTab('profiles')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${searchTab === 'profiles' ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-text'}`}
          >
            User Profiles
          </button>
        </div>
      </div>

      {searchTab === 'posts' && displayPosts.length === 0 ? (
        <div className="rounded-2xl border border-surface-3 bg-surface-2 p-8 text-center text-sm text-text-muted">
          No posts found. Seed the database or create your first post to start training tag affinity.
        </div>
      ) : searchTab === 'posts' ? (
        <section className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4">
          {postItems.map((item) =>
            item.kind === 'ad' ? (
              <ExploreSponsoredAdCard
                key={item.id}
                ad={activeSponsoredAd}
                onOpen={openAdDetailsModal}
                detectMediaKind={detectSponsoredMediaKind}
                resolveAssetUrl={resolveAdAssetUrl}
                toEmbedUrl={toEmbedUrl}
              />
            ) : (
              <TileCard
                key={item.id}
                post={item.post}
                clipLabel={getClipLabel(item.post, item.index)}
                onOpen={handleOpenPost}
              />
            )
          )}
        </section>
      ) : displayProfiles.length === 0 ? (
        <div className="rounded-2xl border border-surface-3 bg-surface-2 p-8 text-center text-sm text-text-muted">
          No user profiles found.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {displayProfiles.map((creator) => (
            <ProfileCard key={creator.id} creator={creator} />
          ))}
        </section>
      )}

      <PromotionModal
        open={adDetailsModalOpen}
        ad={activeSponsoredAd}
        countdown={0}
        variant={activeSponsoredAd?.submissionType === 'post_sponsorship' ? 'post_sponsorship' : 'ad'}
        onClose={() => setAdDetailsModalOpen(false)}
        onPrimaryAction={openAdTarget}
        resolveAssetUrl={resolveAdAssetUrl}
        detectMediaKind={detectSponsoredMediaKind}
        toEmbedUrl={toEmbedUrl}
        primaryLabel={activeSponsoredAd?.ctaText || 'Visit Site'}
      />
    </div>
  );
}
