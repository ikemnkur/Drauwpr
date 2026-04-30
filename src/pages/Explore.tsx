import { Link } from 'react-router-dom';
import { Flame, Clock, Users, Search, Star, Sparkles, Megaphone, TrendingUp, ChevronRight, User } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';

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

interface SponsoredPromo {
  id: string;
  userId: string;
  username: string | null;
  submissionType: string;
  mediaType: string;
  title: string;
  description: string | null;
  targetDropId: string;
  mediaUrl: string | null;
  ctaText: string | null;
  budgetUsd: number;
  assetPath: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface SponsoredResponse {
  sponsored: SponsoredPromo[];
}

interface UserResult {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  accountType: string;
  totalDropsCreated: number;
}

function UserResultCard({ user }: { user: UserResult }) {
  return (
    <Link
      to={`/user/${user.id}`}
      className="bg-surface-2 rounded-xl p-4 flex items-center gap-3 hover:bg-surface-3 transition no-underline group"
    >
      <div className="w-11 h-11 rounded-full bg-surface-3 flex items-center justify-center text-lg font-bold text-brand shrink-0 overflow-hidden">
        {user.profilePicture
          ? <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
          : <User className="w-5 h-5 text-brand" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text group-hover:text-brand transition truncate">{user.username}</p>
        <p className="text-xs text-text-muted truncate">{user.bio || '\u00a0'}</p>
      </div>
      <div className="text-right shrink-0">
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
          user.accountType === 'creator' ? 'bg-brand/20 text-brand' : 'bg-surface-3 text-text-muted'
        }`}>{user.accountType}</span>
        {user.totalDropsCreated > 0 && (
          <p className="text-[10px] text-text-muted mt-0.5">{user.totalDropsCreated} drops</p>
        )}
      </div>
    </Link>
  );
}

export default function Explore() {
  const { drops } = useApp();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [search, setSearch] = useState('');
  const [searchMode, setSearchMode] = useState<'drops' | 'users'>('drops');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [userSearching, setUserSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [featured, setFeatured] = useState<Drop[]>([]);
  const [hottest, setHottest] = useState<Drop[]>([]);
  const [newest, setNewest] = useState<Drop[]>([]);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [sponsoredPromos, setSponsoredPromos] = useState<SponsoredPromo[]>([]);

  function resolveAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) return 'https://picsum.photos/seed/sponsored-default/160/160';
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

    api.get<SponsoredResponse>('/api/promotions/sponsored?limit=6')
      .then((res) => {
        if (cancelled) return;
        const promos = res.sponsored || [];
        setSponsoredPromos(promos);
        promos.slice(0, 2).forEach((p) => {
          void api.post(`/api/promotions/${p.id}/impression`, {}).catch(() => {});
        });
      })
      .catch(() => {
        if (!cancelled) setSponsoredPromos([]);
      });

    return () => { cancelled = true; };
  }, [drops]);

  const recommended = [...drops].sort((a, b) => b.contributorCount - a.contributorCount);

  // Debounced user search
  useEffect(() => {
    if (searchMode !== 'users' || !search.trim()) {
      setUserResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setUserSearching(true);
      api.get<UserResult[]>(`/api/users/search?q=${encodeURIComponent(search.trim())}`)
        .then(setUserResults)
        .catch(() => setUserResults([]))
        .finally(() => setUserSearching(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, searchMode]);

  const dropSearchResults = search && searchMode === 'drops'
    ? drops.filter((d) =>
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.tags.some((t) => t.includes(search.toLowerCase())) ||
        (d.creatorName ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : null;

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
            placeholder={searchMode === 'drops' ? 'Search drops, tags, creators…' : 'Search usernames…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
        </div>
        {/* Mode tabs */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => { setSearchMode('drops'); setSearch(''); }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              searchMode === 'drops' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Drops
          </button>
          <button
            onClick={() => { setSearchMode('users'); setSearch(''); }}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              searchMode === 'users' ? 'bg-brand text-white' : 'bg-surface-2 text-text-muted hover:text-text'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Users
          </button>
        </div>
      </div>

      {/* Search results override */}
      {searchMode === 'users' && search ? (
        <section>
          <SectionHeader icon={Users} title={`Users matching "${search}"`} />
          {userSearching ? (
            <p className="text-text-muted text-sm text-center py-10">Searching…</p>
          ) : userResults.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-10">No users found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {userResults.map((u) => <UserResultCard key={u.id} user={u} />)}
            </div>
          )}
        </section>
      ) : dropSearchResults ? (
        <section>
          <SectionHeader icon={Search} title={`Results for "${search}"`} />
          {dropSearchResults.length === 0 ? (
            <p className="text-text-muted text-sm text-center py-10">No drops found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dropSearchResults.map((d) => <DropCard key={d.id} drop={d} />)}
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
                const target = resolveTarget(p.targetDropId);
                const external = /^https?:\/\//i.test(target);
                const imageSrc = resolveAssetUrl(p.assetPath, p.mediaUrl);
                const cardClass = 'bg-gradient-to-r from-brand/10 to-surface-2 rounded-2xl p-5 flex gap-4 items-center hover:from-brand/20 transition no-underline group border border-brand/20';

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

                return external ? (
                  <a
                    key={p.id}
                    href={target}
                    className={cardClass}
                    rel="noopener noreferrer"
                    onClick={() => { void api.post(`/api/promotions/${p.id}/click`, {}).catch(() => {}); }}
                  >
                    {content}
                  </a>
                ) : (
                  <Link
                    key={p.id}
                    to={target}
                    className={cardClass}
                    onClick={() => { void api.post(`/api/promotions/${p.id}/click`, {}).catch(() => {}); }}
                  >
                    {content}
                  </Link>
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
    </div>
  );
}
