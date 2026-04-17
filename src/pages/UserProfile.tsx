import { useParams, Link } from 'react-router-dom';
import { SocialIcon } from 'react-social-icons'

const Twitter = <SocialIcon url="https://twitter.com" />
const Instagram = <SocialIcon url="https://instagram.com" />
const Youtube = <SocialIcon url="https://youtube.com" />
const Github = <SocialIcon url="https://github.com" />

import { Heart, Star, Users, Package, CreditCard, Calendar, ArrowLeft, Flame, Globe, ExternalLink, Pencil } from 'lucide-react';
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
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get<ServerProfile>(`/api/users/${id}`),
      api.get<ServerDrop[]>(`/api/users/${id}/drops`),
    ])
      .then(([profileRes, dropsRes]) => {
        if (cancelled) return;
        setProfile(mapProfile(profileRes));
        setUserDrops(dropsRes.map(mapDrop));
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
          setUserDrops(fallbackDrops);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [id, contextDrops]);

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

  const activeDrops = userDrops.filter((d) => d.status === 'active' || d.status === 'pending');
  const pastDrops = userDrops.filter((d) => d.status === 'dropped' || d.status === 'expired');

  const joinedDate = new Date(profile.joined).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const ratingColor =
    profile.rating >= 80 ? 'text-green-500' : profile.rating >= 50 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Back link */}
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline">
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {/* Profile Header */}
      <div className="bg-surface rounded-2xl border border-surface-3 overflow-hidden">
        {/* Banner */}
        {profile.bannerUrl ? (
          <div
            className="h-32 bg-cover bg-center"
            style={{ backgroundImage: `url(${profile.bannerUrl})` }}
          />
        ) : (
          <div className="h-32 bg-gradient-to-r from-orange-600/30 via-orange-500/10 to-transparent" />
        )}

        <div className="px-6 pb-5 -mt-12">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-surface-3 border-4 border-surface flex items-center justify-center text-3xl font-bold text-brand shrink-0 overflow-hidden">
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.username} className="w-full h-full object-cover" />
                : profile.username[0].toUpperCase()
              }
            </div>

            <div className="flex-1 pt-2 sm:pt-12">
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
                  onClick={() => setFavorited(!favorited)}
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                    favorited
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-surface-2 text-text-muted border border-surface-3 hover:border-brand/50 hover:text-brand'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorited ? 'fill-red-400' : ''}`} />
                  {favorited ? 'Following' : 'Follow'}
                </button>
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
                    { key: 'website',   Icon: Globe,        label: 'Website' },
                    { key: 'twitter',   Icon: Twitter,      label: 'Twitter' },
                    { key: 'instagram', Icon: Instagram,    label: 'Instagram' },
                    { key: 'youtube',   Icon: Youtube,      label: 'YouTube' },
                    { key: 'github',    Icon: Github,       label: 'GitHub' },
                    { key: 'tiktok',    Icon: ExternalLink, label: 'TikTok' },
                    { key: 'discord',   Icon: ExternalLink, label: 'Discord' },
                  ] as { key: keyof SocialLinks; Icon: React.ElementType; label: string }[]).map(({ key, Icon, label }) => {
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
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl border border-surface-3 p-4 text-center">
          <Star className={`w-5 h-5 mx-auto mb-1 ${ratingColor}`} />
          <p className={`text-2xl font-bold ${ratingColor}`}>{profile.rating}%</p>
          <p className="text-xs text-text-muted">Rating</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-3 p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-brand" />
          <p className="text-2xl font-bold text-text">{profile.followerCount.toLocaleString()}</p>
          <p className="text-xs text-text-muted">Followers</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-3 p-4 text-center">
          <Package className="w-5 h-5 mx-auto mb-1 text-brand" />
          <p className="text-2xl font-bold text-text">{profile.totalDrops}</p>
          <p className="text-xs text-text-muted">Drops</p>
        </div>
        <div className="bg-surface rounded-xl border border-surface-3 p-4 text-center">
          <CreditCard className="w-5 h-5 mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold text-text">{(profile.totalCreditsEarned / 1000).toFixed(0)}K</p>
          <p className="text-xs text-text-muted">Credits Earned</p>
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
      {userDrops.length === 0 && (
        <div className="bg-surface rounded-xl border border-surface-3 p-8 text-center">
          <Package className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">This user hasn't created any drops yet.</p>
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
  const pct = Math.min(100, Math.round((drop.currentContributions / drop.goalAmount) * 100));
  const statusColors: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    pending: 'bg-yellow-500/15 text-yellow-400',
    dropped: 'bg-blue-500/15 text-blue-400',
    expired: 'bg-red-500/15 text-red-400',
  };

  return (
    <Link
      to={drop.status === 'dropped' ? `/drop/${drop.id}/download` : `/drop/${drop.id}`}
      className="block bg-surface-2 rounded-xl border border-surface-3 p-4 hover:border-brand/50 transition no-underline group"
    >
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
