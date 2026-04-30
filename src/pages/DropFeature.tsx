import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop, Contributor } from '../types';
import AnalogClock from '../components/AnalogClock';
import BurnRateGauge from '../components/BurnRateGauge';
import GoalProgress from '../components/GoalProgress';
import ContributorList from '../components/ContributorList';
import ContributeForm from '../components/ContributeForm';
import { estimateRealSecondsRemaining } from '../engine/burnRate';
import { Tag, HardDrive, ChevronDown, ChevronUp, Film, Image } from 'lucide-react';
import ExpirationGauge from '../components/ExpirationGauge';

interface ServerContributor {
  userId: string;
  username: string;
  avatar: string | null;
  totalAmount: number;
  lastContribution: string;
}

interface SponsoredPromo {
  id: string;
  username: string | null;
  title: string;
  description: string | null;
  targetDropId: string;
  ctaText: string | null;
  mediaUrl: string | null;
  assetPath: string | null;
}

interface SponsoredResponse {
  sponsored: SponsoredPromo[];
}

export default function DropFeature() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const { drops } = useApp();
  const [fetchedDrop, setFetchedDrop] = useState<Drop | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [sponsoredAd, setSponsoredAd] = useState<SponsoredPromo | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [showBanner, setShowBanner] = useState(true);
  const [showTrailer, setShowTrailer] = useState(true);

  const localDrop = drops.find((d) => d.id === id);
  const drop = localDrop ?? fetchedDrop;

  function resolveAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) return 'https://picsum.photos/seed/dropfeature-ad/800/420';
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
    if (!id || !drop) return;

    const windowClosed = Date.now() >= drop.scheduledDropTime;
    const goalReached = drop.currentContributions >= drop.goalAmount;
    const released = drop.status === 'dropped' || (goalReached && windowClosed);

    if (released) {
      navigate(`/drop/${id}/download`, { replace: true });
    }
  }, [drop, id, navigate]);

  useEffect(() => {
    let cancelled = false;
    api.get<SponsoredResponse>('/api/promotions/sponsored?limit=8')
      .then((res) => {
        if (cancelled) return;
        const ads = res.sponsored || [];
        setSponsoredAd(ads.length ? ads[Math.floor(Math.random() * ads.length)] : null);
      })
      .catch(() => {
        if (!cancelled) setSponsoredAd(null);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!sponsoredAd) return;
    void api.post(`/api/promotions/${sponsoredAd.id}/impression`, {}).catch(() => {});
  }, [sponsoredAd]);

  const fetchContributors = useCallback(() => {
    if (!id) return;
    api.get<ServerContributor[]>(`/api/drops/${id}/contributors`)
      .then((rows) => {
        setContributors(rows.map((c) => ({
          id: c.userId,
          username: c.username,
          avatar: c.avatar || '',
          amount: c.totalAmount,
          timestamp: new Date(c.lastContribution).getTime(),
        })));
      })
      .catch(() => { });
  }, [id]);

  const refreshDrop = useCallback(() => {
    if (!id) return;
    api.get<ServerDrop>(`/api/drops/${id}`)
      .then((raw) => setFetchedDrop(mapDrop(raw)))
      .catch(() => { });
  }, [id]);

  const handleContributed = useCallback(() => {
    fetchContributors();
    refreshDrop();
  }, [fetchContributors, refreshDrop]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const promises: Promise<void>[] = [];

    if (!localDrop) {
      setLoading(true);
      setNotFound(false);
      promises.push(
        api.get<ServerDrop>(`/api/drops/${id}`)
          .then((raw) => { if (!cancelled) setFetchedDrop(mapDrop(raw)); })
          .catch(() => { if (!cancelled) setNotFound(true); })
      );
    }

    promises.push(
      api.get<ServerContributor[]>(`/api/drops/${id}/contributors`)
        .then((rows) => {
          if (cancelled) return;
          setContributors(rows.map((c) => ({
            id: c.userId,
            username: c.username,
            avatar: c.avatar || '',
            amount: c.totalAmount,
            timestamp: new Date(c.lastContribution).getTime(),
          })));
        })
        .catch(() => { })
    );

    Promise.all(promises).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id, localDrop]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading drop…</p>
      </div>
    );
  }

  if (!drop || notFound) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Drop not found.</p>
        <Link to="/" className="text-brand underline text-sm mt-2 block">Back to dashboard</Link>
      </div>
    );
  }

  const clockSecondsFromSchedule = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
  const estimatedReal = estimateRealSecondsRemaining(
    clockSecondsFromSchedule,
    drop.burnRate,
    Date.now(),
    drop.createdAt,
    drop.expiresAt,
  );
  const goalMet = drop.currentContributions >= drop.goalAmount;

  const uniqueContributorCount = contributors.length > 0 ? contributors.length : drop.contributorCount;
  const lastBurnMs = drop.lastContributionTime
    ?? (contributors.length > 0 ? Math.max(...contributors.map(c => c.timestamp)) : null);
  const lastBurnLabel = lastBurnMs
    ? (() => {
      const diff = Math.abs((Date.now() - lastBurnMs) / 1000 + 5*3600);
      // if (diff < 60) return 'just now';  
      if (diff < 60) return `${Math.floor(diff)}s ago`;;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    })()
    : '—';
  const avgContribution = uniqueContributorCount > 0
    // ? Math.floor(drop.currentContributions / uniqueContributorCount)
    ? Math.floor(drop.currentContributions / drop.contributorCount)
    : 0;

  const dropDate = new Date(drop.scheduledDropTime);
  const trailerEmbedUrl = toYouTubeEmbed(drop.trailerUrl ?? '');
  const calYear = dropDate.getFullYear();
  const calMonth = dropDate.getMonth();
  const calDropDay = dropDate.getDate();
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDays = new Date(calYear, calMonth + 1, 0).getDate();
  const calMonthLabel = dropDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayDate = new Date();
  const isSameMonth = todayDate.getMonth() === calMonth && todayDate.getFullYear() === calYear;
  const todayDay = isSameMonth ? todayDate.getDate() : -1;

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Banner ── */}
      <div className="mb-4">
        <button
          onClick={() => setShowBanner((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition mb-2"
        >
          <Image className="w-3.5 h-3.5" />
          Banner
          {showBanner ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showBanner && (
          <div className="w-full h-40 bg-surface-2 rounded-2xl overflow-hidden">
            <img
              src={drop.thumbnailUrl || `https://picsum.photos/seed/${drop.id}/1280/240`}
              alt={`${drop.title} banner`}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      {/* ── Trailer ── */}
      {trailerEmbedUrl && (
        <div className="mb-6">
          <button
            onClick={() => setShowTrailer((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition mb-2"
          >
            <Film className="w-3.5 h-3.5" />
            Trailer
            {showTrailer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showTrailer && (
            <div className="aspect-video bg-surface-2 rounded-2xl overflow-hidden">
              <iframe
                src={trailerEmbedUrl}
                title="Drop trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Title row */}
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text mb-1">{drop.title}</h1>
          <div className="flex items-center gap-3 text-sm text-text-muted flex-wrap">
            <Link
              to={`/user/${drop.creatorId}`}
              className="flex items-center gap-2 hover:text-brand transition no-underline"
            >
              <div className="w-7 h-7 rounded-full bg-surface-3 border border-surface-3 flex items-center justify-center text-xs font-bold text-brand overflow-hidden shrink-0">
                {drop.creatorAvatar
                  ? <img src={drop.creatorAvatar} alt={drop.creatorName} className="w-full h-full object-cover" />
                  : drop.creatorName[0].toUpperCase()
                }
              </div>
              <span>{drop.creatorName}</span>
            </Link>
            <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {drop.fileSize}</span>
            <span className="flex items-center gap-1"><Tag className="w-4 h-4" /> {drop.fileType}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {drop.tags.map((t) => (
            <span key={t} className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full">
              #{t}
            </span>
          ))}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-text-muted mb-8 leading-relaxed">{drop.description}</p>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Clock + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clock */}
          <div className="bg-surface-2 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {/* Clock — shrunk on mobile */}
            <div className="flex justify-center">
              <AnalogClock remainingSeconds={estimatedReal} burnRate={drop.burnRate} size={180} />
            </div>


            {/* Calendar — right of the clock */}
            <div className="flex flex-col items-center shrink-0 gap-1 border-[2px] border-surface-3 rounded-2xl p-3">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-1">{calMonthLabel}</p>

              <div className="grid grid-cols-7 gap-0.5 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="w-6 h-6 flex items-center justify-center text-[9px] font-bold text-text-muted">{d}</div>
                ))}
                {Array.from({ length: calFirstDay }).map((_, i) => (
                  <div key={`blank-${i}`} className="w-6 h-6" />
                ))}
                {Array.from({ length: calDays }, (_, i) => i + 1).map(day => {
                  const isDropDay = day === calDropDay;
                  const isToday = day === todayDay;
                  return (
                    <div
                      key={day}
                      className={[
                        'w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-mono transition',
                        isDropDay
                          ? 'bg-brand text-white font-bold ring-2 ring-brand/40 scale-110'
                          : isToday
                            ? 'bg-surface-3 text-text font-semibold'
                            : 'text-text-muted hover:text-text',
                      ].join(' ')}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>

              <div className="mt-2 text-center border-[2px] border-brand/40 rounded-xl px-3 py-1.5">
                <p className="text-xs font-bold text-brand">
                  🔥 {dropDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {drop.scheduledDropTime > Date.now() ? 'estimated drop' : 'drop date'}
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface-2 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-text font-mono">{uniqueContributorCount.toLocaleString()}</p>
              <p className="text-xs text-text-muted">Contributors</p>
            </div>

            <div className="bg-surface-2 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-text font-mono">{lastBurnLabel}</p>
              {/* <p className="text-2xl font-bold text-text font-mono">{drop.lastMomentumUpdate.toLocaleString()}</p> */}
              <p className="text-xs text-text-muted">Last Burn</p>
            </div>

            <div className="bg-surface-2 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-text font-mono">{avgContribution.toLocaleString()}</p>
              <p className="text-xs text-text-muted">Avg Contribution</p>
            </div>

            <div className="bg-surface-2 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-text font-mono">{drop.currentContributions.toLocaleString()}</p>
              <p className="text-xs text-text-muted">Credits Burned</p>
            </div>
          </div>


          {/* Burn Rate + Goal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Todo: only show the BurnRateGauge if Goal has been met 100% else show Expiration Gauge */}
            
            {(goalMet
              ? <BurnRateGauge rate={drop.burnRate} goalPct={Math.min((drop.currentContributions / drop.goalAmount) * 100, 100)} />
              : <ExpirationGauge
                  createdAt={drop.createdAt}
                  expiresAt={drop.expiresAt}
                  currentContributions={drop.currentContributions}
                  goalAmount={drop.goalAmount}
                />
            )}

            {/* <BurnRateGauge rate={drop.burnRate} goalPct={Math.min((drop.currentContributions / drop.goalAmount) * 100, 100)} />

            <ExpirationGauge
              createdAt={drop.createdAt}
              expiresAt={drop.expiresAt}
              currentContributions={drop.currentContributions}
              goalAmount={drop.goalAmount}
            /> */}

            <GoalProgress current={drop.currentContributions} goal={drop.goalAmount} />
          </div>

          {/* Expiry notice (only if goal not met) */}

          {/* {!goalMet && (
            <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm text-yellow-300 font-medium">Spark Threshold Not Met</p>
                <p className="text-xs text-text-muted">
                  Timer won&apos;t start until the goal is reached. Expires{' '}
                  <span className="flex items-center gap-1 inline-flex">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(drop.expiresAt).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>
          )} */}




          {/* Contributors */}
          <ContributorList contributors={contributors} />
        </div>

        {/* Right: Contribute form */}
        <div className="space-y-4">
          <ContributeForm dropId={drop.id} onContributed={handleContributed} />

          {sponsoredAd && (
            (() => {
              const target = resolveTarget(sponsoredAd.targetDropId);
              const external = /^https?:\/\//i.test(target);
              const classes = 'hidden lg:block bg-surface-2 rounded-xl border border-surface-3 overflow-hidden no-underline group';
              const content = (
                <>
                  <div className="aspect-[16/10] overflow-hidden bg-surface-3">
                    <img
                      src={resolveAssetUrl(sponsoredAd.assetPath, sponsoredAd.mediaUrl)}
                      alt={sponsoredAd.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-brand/80">Sponsored</p>
                    <p className="text-sm font-semibold text-text mt-1 line-clamp-1">{sponsoredAd.title}</p>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{sponsoredAd.description || 'Sponsored content'}</p>
                    <p className="text-xs text-brand font-semibold mt-2">{sponsoredAd.ctaText || 'Learn more'}</p>
                    <p className="text-[10px] text-text-muted mt-1">by {sponsoredAd.username || 'Sponsor'}</p>
                  </div>
                </>
              );

              return external ? (
                <a
                  href={target}
                  className={classes}
                  onClick={() => { void api.post(`/api/promotions/${sponsoredAd.id}/click`, {}).catch(() => {}); }}
                >
                  {content}
                </a>
              ) : (
                <Link
                  to={target}
                  className={classes}
                  onClick={() => { void api.post(`/api/promotions/${sponsoredAd.id}/click`, {}).catch(() => {}); }}
                >
                  {content}
                </Link>
              );
            })()
          )}


        
            
        </div>
      </div>
    </div>
  );
}

function toYouTubeEmbed(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    let videoId = '';
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    } else {
      videoId = u.searchParams.get('v') || '';
    }
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : '';
  } catch {
    return '';
  }
}
