import { useParams, Link } from 'react-router-dom';
import { SocialIcon } from 'react-social-icons';
import { Heart, Star, Users, Package, CreditCard, Calendar, ArrowLeft, Flame, Globe, Pencil, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop, CreatorProfile, SocialLinks } from '../types';

interface ServerProfile {
  id: string;
  username: string;
  profilePicture: string | null;
  bio: string | null;
  accountType: string;
  totalDropsCreated: number;
  totalCreditsEarned: number;
  creatorRating: number;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  likesReceived60d?: number;
  dislikesReceived60d?: number;
  bannerUrl?: string | null;
  bioVideoUrl?: string | null;
  socialLinks?: string | SocialLinks | null;
}

function mapProfile(s: ServerProfile): CreatorProfile {
  const rawSocial = s.socialLinks;
  const socialLinks: SocialLinks | undefined = rawSocial
    ? (typeof rawSocial === 'string' ? JSON.parse(rawSocial) as SocialLinks : rawSocial)
    : undefined;
  return {
    id: s.id,
    username: s.username,
    avatar: s.profilePicture || '',
    bio: s.bio || '',
    rating: s.creatorRating ?? 0,
    followerCount: s.followerCount ?? 0,
    totalDrops: s.totalDropsCreated ?? 0,
    totalCreditsEarned: s.totalCreditsEarned ?? 0,
    joined: new Date(s.createdAt).getTime(),
    likesReceived60d: s.likesReceived60d ?? 0,
    dislikesReceived60d: s.dislikesReceived60d ?? 0,
    bannerUrl: s.bannerUrl || undefined,
    bioVideoUrl: s.bioVideoUrl || undefined,
    socialLinks,
  };
}

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { drops: contextDrops } = useApp();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [userDrops, setUserDrops] = useState<Drop[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [showUserStats, setShowUserStats] = useState(false);
  const [dropQuery, setDropQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    const profileReq = api.get<ServerProfile>(`/api/users/${id}`);
    const dropsReq = api.get<ServerDrop[]>(`/api/users/${id}/drops`);
    const followingReq = authUser && authUser.id !== id
      ? api.get<{ following: boolean }>(`/api/users/${id}/am-i-following`).catch(() => null)
      : Promise.resolve(null);

    Promise.all([profileReq, dropsReq, followingReq])
      .then(([profileRes, dropsRes, followRes]) => {
        if (cancelled) return;
        const mapped = mapProfile(profileRes);
        setProfile(mapped);
        setFollowerCount(mapped.followerCount);
        setUserDrops(dropsRes.map(mapDrop));
        if (followRes) setFollowing(followRes.following);
      })
      .catch(() => {
        // Fallback: try to build profile from context drops
        const fallbackDrops = contextDrops.filter((d) => d.creatorId === id);
        if (fallbackDrops.length > 0) {
          setProfile({
            id: id!,
            username: fallbackDrops[0].creatorName,
            avatar: fallbackDrops[0].creatorAvatar,
            bio: '',
            rating: 0,
            followerCount: 0,
            totalDrops: fallbackDrops.length,
            totalCreditsEarned: 0,
            joined: Date.now(),
          });
          setFollowerCount(0);
          setUserDrops(fallbackDrops);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, contextDrops, authUser]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-text-muted text-lg">Loading profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <p className="text-text-muted text-lg">User not found.</p>
        <Link to="/dashboard" className="text-brand hover:underline mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const dropQueryNorm = dropQuery.trim().toLowerCase();
  const filteredDrops = userDrops.filter((d) => {
    if (!dropQueryNorm) return true;
    const tagsJoined = (d.tags || []).join(' ').toLowerCase();
    return (
      String(d.title || '').toLowerCase().includes(dropQueryNorm)
      || String(d.description || '').toLowerCase().includes(dropQueryNorm)
      || String(d.status || '').toLowerCase().includes(dropQueryNorm)
      || tagsJoined.includes(dropQueryNorm)
    );
  });

  const activeDrops = filteredDrops.filter((d) => d.status === 'active' || d.status === 'pending');
  const pastDrops = filteredDrops.filter((d) => d.status === 'dropped' || d.status === 'expired');
  const releasedDrops = userDrops.filter((d) => d.status === 'dropped');
  const totalDrops = userDrops.length;
  const qualityRating = releasedDrops.length > 0
    ? releasedDrops.reduce((sum, drop) => sum + Number(drop.avgRating ?? 0), 0) / releasedDrops.length
    : null;
  const avatarFallback = `https://picsum.photos/seed/user-avatar-${profile.id}/240/240`;
  const bannerFallback = `https://picsum.photos/seed/user-banner-${profile.id}/1600/400`;
  const avatarSrc = (profile.avatar || '').trim() || avatarFallback;
  const bannerSrc = (profile.bannerUrl || '').trim() || bannerFallback;

  const joinedDate = new Date(profile.joined).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const qualityColor =
    qualityRating == null ? 'text-text-muted' : qualityRating >= 80 ? 'text-green-500' : qualityRating >= 50 ? 'text-yellow-500' : 'text-red-500';
  const reportHref = `/help?report=1&targetId=${encodeURIComponent(profile.id)}&targetUsername=${encodeURIComponent(profile.username)}`;

  return (
    <div className="max-w-4xl mx-auto py-0 px-4 space-y-3">
      {/* Back link */}
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile Header */}
      <div className="bg-surface rounded-2xl border border-surface-3 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-surface-3 overflow-hidden">
          <img
            src={bannerSrc}
            alt={`${profile.username} banner`}
            className="w-full h-full object-cover"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== bannerFallback) img.src = bannerFallback;
            }}
          />
        </div>

        <div className="px-6 pb-5 -mt-12">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-surface-3 border-4 border-surface flex items-center justify-center text-3xl font-bold text-brand shrink-0 overflow-hidden">
              <img
                src={avatarSrc}
                alt={profile.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const img = e.currentTarget;
                  if (img.src !== avatarFallback) img.src = avatarFallback;
                }}
              />
            </div>

            <div className="flex-1 pt-2 sm:pt-12">
              <br></br>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-text">{profile.username}</h1>

                {/* Edit own profile */}
                {authUser?.id === profile.id && (
                  <Link
                    to="/edit-profile"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-2 border border-surface-3 text-text-muted hover:text-brand hover:border-brand/50 transition no-underline"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit Profile
                  </Link>
                )}

                <button
                  onClick={async () => {
                    if (!authUser || authUser.id === profile.id || followLoading) return;
                    setFollowLoading(true);
                    try {
                      const res = await api.post<{ following: boolean; followerCount: number }>(
                        `/api/users/${profile.id}/follow`, {}
                      );
                      setFollowing(res.following);
                      setFollowerCount(res.followerCount);
                    } catch {
                      // silently fail — button reverts visually
                    } finally {
                      setFollowLoading(false);
                    }
                  }}
                  disabled={followLoading || !authUser || authUser.id === profile.id}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    following
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-surface-2 text-text-muted border border-surface-3 hover:border-brand/50 hover:text-brand'
                  } disabled:opacity-50`}
                >
                  <Heart className={`w-4 h-4 ${following ? 'fill-red-400' : ''}`} />
                  {followLoading ? '…' : following ? 'Unfollow' : 'Follow'}
                </button>

                {authUser?.id !== profile.id && (
                  <Link
                    to={reportHref}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-surface-2 text-text-muted border border-surface-3 hover:border-red-500/50 hover:text-red-400 transition no-underline"
                  >
                    Report User
                  </Link>
                )}
              </div>
              <p className="text-text-muted mt-2 text-sm leading-relaxed max-w-xl">{profile.bio}</p>
              <p className="text-text-muted text-xs mt-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {joinedDate}
              </p>

              {/* Social links */}
              {profile.socialLinks && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {([
                    { key: 'website',   network: null,        label: 'Website' },
                    { key: 'twitter',   network: 'twitter',   label: 'Twitter' },
                    { key: 'instagram', network: 'instagram', label: 'Instagram' },
                    { key: 'youtube',   network: 'youtube',   label: 'YouTube' },
                    { key: 'github',    network: 'github',    label: 'GitHub' },
                    { key: 'tiktok',    network: 'tiktok',    label: 'TikTok' },
                    { key: 'discord',   network: 'discord',   label: 'Discord' },
                  ] as { key: keyof SocialLinks; network: string | null; label: string }[]).map(({ key, network, label }) => {
                    const href = profile.socialLinks?.[key];
                    if (!href) return null;
                    return (
                      <a
                        key={key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        className="w-8 h-8 rounded-lg bg-surface-2 border border-surface-3 flex items-center justify-center text-text-muted hover:text-brand hover:border-brand/50 transition"
                      >
                        {network
                          ? <SocialIcon network={network} style={{ width: 24, height: 24 }} />
                          : <Globe className="w-4 h-4" />
                        }
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Table */}
      <div className="bg-surface rounded-2xl border border-surface-3 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowUserStats((prev) => !prev)}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-surface-2 transition"
        >
          <span className="text-sm font-semibold text-text">{showUserStats ? 'Hide User Stats' : 'Show User Stats'}</span>
          {showUserStats ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
        </button>
        {showUserStats && (
          <table className="w-full border-t border-surface-3">
            <tbody>
              <tr className="border-b border-surface-3/80">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Star className={`mt-0.5 w-5 h-5 shrink-0 ${qualityColor}`} />
                    <div>
                      <p className="text-sm font-semibold text-text">Quality Rating</p>
                      <p className="text-xs text-text-muted">Average quality rating from released/dropped drops</p>
                    </div>
                  </div>
                </td>
                <td className={`px-4 py-4 align-top text-right text-lg font-bold whitespace-nowrap ${qualityColor}`}>
                  {qualityRating == null ? '--' : `${qualityRating.toFixed(1)}%`}
                </td>
              </tr>
              <tr className="border-b border-surface-3/80">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 w-5 h-5 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-semibold text-text">Followers</p>
                      <p className="text-xs text-text-muted">People following this creator</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right text-lg font-bold text-text whitespace-nowrap">
                  {followerCount.toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-surface-3/80">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Package className="mt-0.5 w-5 h-5 shrink-0 text-brand" />
                    <div>
                      <p className="text-sm font-semibold text-text">Drops</p>
                      <p className="text-xs text-text-muted">Total drops published by this creator</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right text-lg font-bold text-text whitespace-nowrap">
                  {totalDrops.toLocaleString()}
                </td>
              </tr>
              <tr className="border-b border-surface-3/80">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <CreditCard className="mt-0.5 w-5 h-5 shrink-0 text-green-500" />
                    <div>
                      <p className="text-sm font-semibold text-text">Credits Earned</p>
                      <p className="text-xs text-text-muted">Total credits earned across drops</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right text-lg font-bold text-text whitespace-nowrap">
                  {(profile.totalCreditsEarned / 1000).toFixed(0)}K
                </td>
              </tr>
              <tr className="border-b border-surface-3/80">
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Heart className="mt-0.5 w-5 h-5 shrink-0 text-red-400" />
                    <div>
                      <p className="text-sm font-semibold text-text">Likes Received</p>
                      <p className="text-xs text-text-muted">Last 60 days across this creator&apos;s drops</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right text-lg font-bold text-text whitespace-nowrap">
                  {(profile.likesReceived60d ?? 0).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-4 align-top">
                  <div className="flex items-start gap-3">
                    <Heart className="mt-0.5 w-5 h-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-sm font-semibold text-text">Dislikes Received</p>
                      <p className="text-xs text-text-muted">Last 60 days across this creator&apos;s drops</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right text-lg font-bold text-text whitespace-nowrap">
                  {(profile.dislikesReceived60d ?? 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Drop Search */}
      <div className="bg-surface rounded-2xl border border-surface-3 p-4">
        <label className="text-xs text-text-muted mb-2 block">Search this creator&apos;s drops</label>
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={dropQuery}
            onChange={(e) => setDropQuery(e.target.value)}
            placeholder="Search by title, description, tag, or status"
            className="w-full bg-surface-2 border border-surface-3 rounded-xl pl-10 pr-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Active Drops */}
      {activeDrops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-3">
            <Flame className="w-5 h-5 text-brand" />
            Active Drops
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeDrops.map((d) => (
              <DropCard key={d.id} drop={d} />
            ))}
          </div>
        </section>
      )}

      {/* Past Drops */}
      {pastDrops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-text-muted" />
            Past Drops
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pastDrops.map((d) => (
              <DropCard key={d.id} drop={d} />
            ))}
          </div>
        </section>
      )}

      {/* No drops */}
      {filteredDrops.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-3 p-8 text-center">
          <Package className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">
            {dropQueryNorm ? 'No drops match your search.' : "This user hasn't created any drops yet."}
          </p>
        </div>
      )}

      {/* Bio Video */}
      {profile.bioVideoUrl && (
        <div className="bg-surface rounded-2xl border border-surface-3 overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Intro Video</h2>
          </div>
          <div className="aspect-video">
            <iframe
              src={profile.bioVideoUrl}
              title={`${profile.username} intro video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DropCard({ drop }: { drop: import('../types').Drop }) {
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const pct = Math.min(100, Math.round((drop.currentContributions / drop.goalAmount) * 100));
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    pending: 'bg-yellow-500/15 text-yellow-400',
    dropped: 'bg-blue-500/15 text-blue-400',
    expired: 'bg-red-500/15 text-red-400',
  };
  const thumbRaw = String(drop.thumbnailUrl || '').trim();
  const thumbFallback = `https://picsum.photos/seed/profile-drop-${drop.id}/600/320`;
  const thumbnailSrc = thumbRaw
    ? (/^https?:\/\//i.test(thumbRaw)
      ? thumbRaw
      : thumbRaw.startsWith('/')
        ? `${API_BASE}${thumbRaw}`
        : `${API_BASE}/${thumbRaw}`)
    : thumbFallback;

  return (
    <Link
      to={drop.status === 'dropped' ? `/drop/${drop.id}/download` : `/drop/${drop.id}`}
      className="block bg-surface-2 rounded-xl border border-surface-3 p-4 hover:border-brand/50 transition no-underline group"
    >
      <div className="w-full h-28 rounded-lg overflow-hidden bg-surface-3 mb-3">
        <img
          src={thumbnailSrc}
          alt={`${drop.title} thumbnail`}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== thumbFallback) img.src = thumbFallback;
          }}
        />
      </div>

      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-text group-hover:text-brand transition truncate pr-2">
          {drop.title}
        </h3>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[drop.status]}`}>
          {drop.status}
        </span>
      </div>
      <div className="w-full bg-surface-3 rounded-full h-1.5 mb-2">
        <div
          className="h-1.5 rounded-full bg-brand transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>{pct}% funded</span>
        <span>{drop.contributorCount.toLocaleString()} contributors</span>
      </div>
    </Link>
  );
}
