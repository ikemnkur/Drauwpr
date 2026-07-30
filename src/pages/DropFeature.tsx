import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop, Contributor } from '../types';
import AnalogClock from '../components/AnalogClock';
import BurnRateGauge from '../components/BurnRateGauge';
import GoalProgress from '../components/GoalProgress';
import ContributorList from '../components/ContributorList';
import ContributeForm from '../components/ContributeForm';
import StallModal from '../components/StallModal';
import ShareModal from '../components/ShareModal';
import DropCelebrationModal from '../components/DropCelebrationModal';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';
import { Tag, HardDrive, ChevronDown, ChevronUp, Film, Image, Timer, Share2, Link2, Check, MessageCircle, Send, AlertTriangle, Calendar, Eye } from 'lucide-react';
import ExpirationGauge from '../components/ExpirationGauge';
import { useFuseCountdown } from '../hooks/useFuseCountdown';

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
  const [showStallModal, setShowStallModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadInfoModal, setShowDownloadInfoModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const celebrationFired = useRef(false);
  const prevProjectedDayKeyRef = useRef<string>('');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dropDayPulse, setDropDayPulse] = useState(false);
  const [copiedInline, setCopiedInline] = useState(false);
  const [stallExpiresAt, setStallExpiresAt] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const viewDropIdRef = useRef<string | null>(null);


  const localDrop = drops.find((d) => d.id === id);
  const drop = localDrop ?? fetchedDrop;
  const goalMet = drop ? drop.currentContributions >= drop.goalAmount : false;



  const expiryThresholdMet =
    drop
      ? (() => {
        const d = drop as Drop & {
          expiryThreshold?: number | null;
          expiryThresholdMet?: boolean | null;
        };

        if (typeof d.expiryThresholdMet === 'boolean') return d.expiryThresholdMet;
        if (typeof d.expiryThreshold === 'number') return drop.currentContributions >= d.expiryThreshold;
        return false;
      })()
      : false;


  const baseFuseTimeMs = drop
    ? (drop.fuseTime ?? Math.max(0, drop.scheduledDropTime - drop.createdAt))
    : 0;

  const fuseTimeMs = useFuseCountdown(
    baseFuseTimeMs,
    drop?.burnRate ?? 1,
    Boolean(drop && goalMet && drop.status !== 'dropped' && drop.status !== 'expired')
  );

  const isReleased = fuseTimeMs < 300;

  // const isCelebrationReady =
  //   !!drop &&
  //   (
  //     (goalMet && (drop.status === 'dropped' || fuseTimeMs <= 0)) ||
  //     (drop.status === 'expired' && !goalMet && expiryThresholdMet)
  //   );

  // const baseFuseTimeMs = drop
  //   ? (drop.fuseTime ?? Math.max(0, drop.scheduledDropTime - drop.createdAt))
  //   : 0;



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

  function resolveSponsoredMedia(pathOrUrl: string | null, fallbackUrl: string | null): {
    type: 'youtube' | 'video' | 'image';
    src: string;
  } {
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) {
      return { type: 'image', src: 'https://picsum.photos/seed/dropfeature-ad/800/420' };
    }

    const youtubeEmbed = toYouTubeEmbed(raw);
    if (youtubeEmbed) {
      return { type: 'youtube', src: youtubeEmbed };
    }

    const resolved = resolveAssetUrl(pathOrUrl, fallbackUrl);
    const isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(raw) || /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(resolved);

    if (isVideo) {
      return { type: 'video', src: resolved };
    }

    return { type: 'image', src: resolved };
  }

  // Display Drop Data in the Console
  useEffect(() => {
    if (!drop) return;
    console.log('Drop Data:', drop);
  }, [drop]);

  useEffect(() => {
    if (!drop) return;
    // Show expired modal if drop expired without reaching its goal
    const isExpired = drop.status === 'expired' ||
      (Date.now() > (stallExpiresAt ?? drop.expiresAt) && drop.currentContributions < drop.goalAmount);
    if (isExpired) setShowExpiredModal(true);
  }, [drop, stallExpiresAt]);

  useEffect(() => {
    if (!drop?.id) return;

    const serverViews = Number((drop as Drop & { view?: number }).views ?? (drop as Drop & { view?: number }).view ?? 0);

    setViewCount((prev) => {
      if (viewDropIdRef.current !== drop.id) {
        return serverViews;
      }
      return Math.max(prev, serverViews);
    });

    viewDropIdRef.current = drop.id;
  }, [drop?.id, drop?.views]);

  useEffect(() => {
    if (!id) return;

    const sessionKey = `drop-viewed:${id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    sessionStorage.setItem(sessionKey, '1');
    api.post<{ views?: number }>(`/api/drops/${id}/view`, {})
      .then((res) => {
        if (typeof res?.views === 'number') {
          setViewCount(res.views);
        } else {
          setViewCount((prev) => prev + 1);
        }
      })
      .catch(() => {
        // no-op: counter failure should not interrupt page usage
      });
  }, [id]);

  // Show celebration modal when the drop is about to be released
  // 1. contribution goal has been met
  // 2. fusetime is 0
  // 3. the drop is exprired (contibutributions are still not at goal amount at the scheduled drop datetime) but the contribution threshold (expiry_threshold on the DB in the drops table) has been met.
  useEffect(() => {
    if (!drop) return;

    // check condition 1
    if (!goalMet) return; // condition 1 not met
    // check condition 2
    if (drop.fuseTime && fuseTimeMs > 0) return; // condition 2 not met
    // check condition 3
    if ((drop.status === 'expired' || (drop.expiresAt - nowMs <= 0)) && !expiryThresholdMet) return; // condition 3 not met

    if (goalMet && ((drop.status === 'dropped' || drop.status === 'active') || fuseTimeMs <= 0)) {
      celebrationFired.current = true;
      setShowCelebration(true);
    }
  }, [drop, expiryThresholdMet, fuseTimeMs, goalMet, nowMs]);

  useEffect(() => {
    if (!id || !drop) return;

    const released = goalMet && (drop.status === 'dropped' || fuseTimeMs <= 0);

    if (released) {
      navigate(`/drop/${id}/download`, { replace: true });
    }
  }, [drop, fuseTimeMs, goalMet, id, navigate]);

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
    void api.post(`/api/promotions/${sponsoredAd.id}/impression`, {}).catch(() => { });
  }, [sponsoredAd]);

  useEffect(() => {
    const iv = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(iv);
  }, []);

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

  // useEffect(() => {
  //   if (!drop || drop.status === 'dropped' || celebrationFired.current) return;
  //   if (!isCelebrationReady) return;

  //   celebrationFired.current = true;
  //   setShowCelebration(true);
  // }, [drop, isCelebrationReady]);


  // Replace by a button in the celebration modal
  // useEffect(() => {
  //   if (!id || !drop) return;

  //   const released =
  //     (goalMet && (drop.status === 'dropped' || fuseTimeMs <= 0)) ||
  //     (drop.status === 'expired' && !goalMet && expiryThresholdMet);

  //   if (released) {
  //     navigate(`/drop/${id}/download`, { replace: true });
  //   }
  // }, [drop, expiryThresholdMet, fuseTimeMs, goalMet, id, navigate]);

  useEffect(() => {
    if (!drop) return;

    const isExpired =
      drop.status === 'expired' ||
      (Date.now() > (stallExpiresAt ?? drop.expiresAt) && drop.currentContributions < drop.goalAmount);

    if (isExpired && !(drop.status === 'expired' && !goalMet && expiryThresholdMet)) {
      setShowExpiredModal(true);
    }
  }, [drop, stallExpiresAt, goalMet, expiryThresholdMet]);

  useEffect(() => {
    if (!drop) return;

    const projectedDropDate = new Date(nowMs + (fuseTimeMs / Math.max(1, drop.burnRate)));
    const projectedDayKey = `${projectedDropDate.getFullYear()}-${projectedDropDate.getMonth() + 1}-${projectedDropDate.getDate()}`;

    if (!prevProjectedDayKeyRef.current) {
      prevProjectedDayKeyRef.current = projectedDayKey;
      return;
    }
    if (prevProjectedDayKeyRef.current === projectedDayKey) return;

    prevProjectedDayKeyRef.current = projectedDayKey;
    setDropDayPulse(true);
    const timeout = window.setTimeout(() => setDropDayPulse(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [drop, nowMs, fuseTimeMs, stallExpiresAt]);

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

  const effectiveExpiresAt = stallExpiresAt ?? drop.expiresAt;
  const dropDate = new Date(drop.scheduledDropTime);
  const dropExpiryDate = new Date(effectiveExpiresAt);
  const goalNotMet = drop.currentContributions < drop.goalAmount;
  const remainingSeconds = goalNotMet
    ? Math.max(0, (effectiveExpiresAt - nowMs) / 1000)
    : fuseTimeMs / 1000;
  const totalMinutesLeft = Math.max(0, (effectiveExpiresAt - nowMs) / 60_000);

  const uniqueContributorCount = contributors.length > 0 ? contributors.length : drop.contributorCount;
  const lastBurnMs = drop.lastContributionTime
    ?? (contributors.length > 0 ? Math.max(...contributors.map(c => c.timestamp)) : null);
  const lastBurnLabel = lastBurnMs
    ? (() => {
      const diff = Math.abs((nowMs - lastBurnMs) / 1000 + 5 * 3600);
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
  const goalProgressPct = Math.min(100, (drop.currentContributions / Math.max(1, drop.goalAmount)) * 100);
  const unlockThresholdPct = Math.round(Math.max(0, Math.min(1, drop.expiryThreshold ?? 1)) * 100);
  const unlockHours = Math.max(1, Math.ceil((goalNotMet ? baseFuseTimeMs : fuseTimeMs) / 3_600_000));

  const projectedDropDate = new Date(nowMs + (fuseTimeMs / Math.max(1, drop.burnRate)));
  const createdDate = new Date(drop.createdAt);
  const bannerRaw = String(drop.thumbnailUrl || '').trim();
  const bannerUrl = bannerRaw
    ? (/^https?:\/\//i.test(bannerRaw)
      ? bannerRaw
      : bannerRaw.startsWith('/')
        ? `${API_BASE}${bannerRaw}`
        : `${API_BASE}/${bannerRaw}`)
    : '';
  const trailerRaw = String(drop.trailerUrl || '').trim();
  const trailerEmbedUrl = toYouTubeEmbed(trailerRaw);
  const trailerDirectUrl = trailerEmbedUrl
    ? ''
    : trailerRaw
      ? (/^https?:\/\//i.test(trailerRaw)
        ? trailerRaw
        : trailerRaw.startsWith('/')
          ? `${API_BASE}${trailerRaw}`
          : `${API_BASE}/${trailerRaw}`)
      : '';
  const hasTrailer = Boolean(trailerEmbedUrl || trailerDirectUrl);
  const expiryDate = new Date(effectiveExpiresAt);
  const dropMonthStart = new Date(projectedDropDate.getFullYear(), projectedDropDate.getMonth(), 1);
  const expiryMonthStart = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), 1);
  const showTwoCalendars = dropMonthStart.getTime() !== expiryMonthStart.getTime();
  const calendarMonths = showTwoCalendars
    ? [dropMonthStart, expiryMonthStart].sort((a, b) => a.getTime() - b.getTime())
    : [dropMonthStart];
  const todayDate = new Date(nowMs);

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Banner ── */}
      {bannerUrl && !hasTrailer && (
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
                src={bannerUrl}
                alt={`${drop.title} banner`}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* ── Trailer ── */}
      {(trailerEmbedUrl || trailerDirectUrl) && (
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
              {trailerEmbedUrl ? (
                <iframe
                  src={trailerEmbedUrl}
                  title="Drop trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              ) : (
                <video
                  src={trailerDirectUrl}
                  controls
                  preload="metadata"
                  className="w-full h-full"
                />
              )}
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
            <span className="flex items-center gap-1"><Eye className="w-4 h-4" /> {viewCount.toLocaleString()} views</span>
            {/* Date Created */}
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(drop.createdAt).toLocaleDateString()}</span>



          </div>
          <div className="mt-2">
            {/* <br/> */}
            {/* Description */}
            <span className="text-sm text-text-muted mt-8 leading-relaxed">{drop.description}</span>
          </div>
        </div>
        <div className="w-full md:w-auto overflow-x-auto">
          <div className="min-w-[280px] grid grid-cols-10 items-start gap-3">
            <div className="col-span-9 flex gap-2 flex-wrap">
              {drop.tags.map((t) => (
                <span key={t} className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
            <div className="col-span-1 flex justify-end">
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-3 text-text-muted hover:text-brand hover:border-brand/40 text-sm transition"
              >
                <Share2 className="w-4 h-4" />

              </button>
            </div>

          </div>
          <br />
          <button
            type="button"
            onClick={() => setShowDownloadInfoModal(true)}
            className="w-full py-3 rounded-2xl bg-surface-3 border border-surface-3 text-text-muted font-semibold text-sm cursor-pointer hover:border-surface hover:text-text transition download-cta-pulse"
            aria-label="Download information"
          >
            Download Now
          </button>
        </div>
      </div>


      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Clock + Stats */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clock */}
          <div className="bg-surface-2 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            {/* Clock — shrunk on mobile */}
            <div className="flex flex-col items-center gap-3">
              <AnalogClock
                remainingSeconds={remainingSeconds}
                size={180}
                label={goalNotMet ? 'Countdown till Drop Expires' : 'Time left (to burn) until file drops'}
                notice={goalNotMet ? 'Countdown for the file drop starts after the Goal is 100% met' : "File will drop once the countdown reaches zero"}
              />
              {/* Stall button — only for active/pending drops */}
              {(drop.status === 'active' || drop.status === 'pending') && (
                <button
                  onClick={() => setShowStallModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/20 hover:border-yellow-500/60 transition"
                >
                  <Timer className="w-4 h-4" />
                  Stall Clock
                </button>
              )}
            </div>


            {/* Calendar — right of the clock */}
            <div className="flex flex-col items-center shrink-0 gap-2 border-[2px] border-surface-3 rounded-2xl p-3">
              <div className="flex flex-wrap justify-center gap-2">
                {calendarMonths.map((monthStart) => {
                  const year = monthStart.getFullYear();
                  const month = monthStart.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const isTodayMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
                  const todayDay = isTodayMonth ? todayDate.getDate() : -1;
                  const isDropMonth = projectedDropDate.getFullYear() === year && projectedDropDate.getMonth() === month;
                  const dropDay = isDropMonth ? projectedDropDate.getDate() : -1;
                  const isCreatedMonth = createdDate.getFullYear() === year && createdDate.getMonth() === month;
                  const createdDay = isCreatedMonth ? createdDate.getDate() : -1;
                  const isExpiryMonth = expiryDate.getFullYear() === year && expiryDate.getMonth() === month;
                  const expiryDay = isExpiryMonth ? expiryDate.getDate() : -1;

                  return (
                    <div key={`${year}-${month}`} className="flex flex-col items-center rounded-xl border border-surface-3/70 px-2 py-2">
                      <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest mb-1">{monthLabel}</p>
                      <div className="grid grid-cols-7 gap-0.5 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <div key={i} className="w-6 h-6 flex items-center justify-center text-[9px] font-bold text-text-muted">{d}</div>
                        ))}
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <div key={`blank-${year}-${month}-${i}`} className="w-6 h-6" />
                        ))}
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                          const isDropDay = day === dropDay;
                          const isCreatedDay = day === createdDay;
                          const isExpiryDay = day === expiryDay;
                          const isToday = day === todayDay;

                          return (
                            <div
                              key={`${year}-${month}-${day}`}
                              className={[
                                'w-6 h-6 relative flex items-center justify-center rounded-lg text-[11px] font-mono transition',
                                isDropDay && isExpiryDay
                                  ? `bg-gradient-to-r from-brand to-red-500 text-white font-bold ring-2 ring-brand/40 scale-110 ${dropDayPulse ? 'animate-pulse' : ''}`
                                  : isDropDay
                                    ? `bg-brand text-white font-bold ring-2 ring-brand/40 scale-110 ${dropDayPulse ? 'animate-pulse' : ''}`
                                    : isExpiryDay
                                      ? 'bg-red-500 text-white font-bold ring-2 ring-red-500/40'
                                      : isToday
                                        ? 'bg-surface-3 text-text font-semibold'
                                        : 'text-text-muted hover:text-text',
                              ].join(' ')}
                            >
                              {day}
                              {isCreatedDay && (
                                <span
                                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-400 ring-1 ring-purple-300/60"
                                  title="Created date"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="mt-2 text-center border-2 border-purple-500/40 rounded-xl px-3 py-1.5">
                  <p className="text-xs font-bold text-purple-300">
                    🟣 {createdDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">
                    created on
                  </p>
                </div>
                <div className="mt-2 text-center border-2 border-orange-500/40 rounded-xl px-3 py-1.5">
                  <p className="text-xs font-bold text-orange-400">
                    🔥 {dropDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">
                    {isReleased ? 'scheduled drop date' : 'possible drop on'}
                  </p>
                </div>
                <div className="mt-2 text-center border-2 border-red-500/40 rounded-xl px-3 py-1.5">
                  <p className="text-xs font-bold text-red-400">
                    💀 {dropExpiryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[10px] text-[#94a3b8] mt-0.5">
                    {isReleased ? 'expired on' : 'expires on'}
                  </p>
                </div>

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
              // ? <BurnRateGauge rate={drop.burnRate} goalPct={Math.min((drop.currentContributions / drop.goalAmount) * 100, 100)} />
              ? <BurnRateGauge rate={drop.burnRate} goalPct={drop.burnRate * 10} />
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





        </div>

        {/* Right: Contribute form */}
        <div className="space-y-4">


          {/* Hide contribute form when drop is expired without reaching goal */}
          {drop.status !== 'expired' && !(Date.now() > (stallExpiresAt ?? drop.expiresAt) && drop.currentContributions < drop.goalAmount) ? (
            <div data-contribute-form-anchor>
              <ContributeForm dropId={drop.id} onContributed={handleContributed} />
            </div>
          ) : (
            <div className="bg-surface-2 border border-red-500/20 rounded-2xl p-5 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
              <p className="text-sm font-semibold text-red-300">This drop has expired</p>
              <p className="text-xs text-text-muted">The goal wasn’t reached in time. Contributions have been refunded.</p>
            </div>
          )}

          {/* Contributors */}
          <ContributorList contributors={contributors} />

          {/* Share box */}
          {false && (<div className="bg-surface-2 border border-surface-3 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-brand" />
              <p className="text-sm font-semibold text-text">Share this Drop</p>
            </div>

            {/* Copy link */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-surface border border-surface-3 rounded-xl px-3 py-2 text-xs text-text-muted truncate font-mono select-all">
                {`${window.location.origin}/drop/${drop?.id ?? ''}/view`}
              </div>
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/drop/${drop?.id ?? ''}/view`;
                  try { await navigator.clipboard.writeText(url); }
                  catch { const el = document.createElement('textarea'); el.value = url; el.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); }
                  setCopiedInline(true);
                  setTimeout(() => setCopiedInline(false), 2000);
                }}
                className={[
                  'shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold transition',
                  copiedInline
                    ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                    : 'bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20',
                ].join(' ')}
              >
                {copiedInline ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copiedInline ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Social buttons */}
            {(() => {
              const url = `${window.location.origin}/drop/${drop?.id ?? ''}/view`;
              const text = `Check out "${drop?.title ?? 'this drop'}" on Drauwper 🔥`;
              return (
                <div className="grid grid-cols-2 gap-2">
                  <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-3 text-xs text-text-muted hover:bg-[#1d9bf0]/10 hover:border-[#1d9bf0]/40 hover:text-[#1d9bf0] transition">
                    <XIcon style={{ fontSize: 14 }} className="shrink-0" /> X / Twitter
                  </a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-3 text-xs text-text-muted hover:bg-[#25d366]/10 hover:border-[#25d366]/40 hover:text-[#25d366] transition">
                    <MessageCircle className="w-3.5 h-3.5 shrink-0" /> WhatsApp
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-3 text-xs text-text-muted hover:bg-[#1877f2]/10 hover:border-[#1877f2]/40 hover:text-[#1877f2] transition">
                    <FacebookIcon style={{ fontSize: 14 }} className="shrink-0" /> Facebook
                  </a>
                  <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-3 text-xs text-text-muted hover:bg-[#2aabee]/10 hover:border-[#2aabee]/40 hover:text-[#2aabee] transition">
                    <Send className="w-3.5 h-3.5 shrink-0" /> Telegram
                  </a>
                </div>
              );
            })()}
          </div>)}

          {sponsoredAd && (
            (() => {
              const target = resolveTarget(sponsoredAd.targetDropId);
              const external = /^https?:\/\//i.test(target);
              const classes = 'hidden lg:block bg-surface-2 rounded-xl border border-surface-3 overflow-hidden no-underline group';
              const media = resolveSponsoredMedia(sponsoredAd.assetPath, sponsoredAd.mediaUrl);
              const content = (
                <>
                  <div className="aspect-[16/10] overflow-hidden bg-surface-3">
                    {media.type === 'youtube' ? (
                      <iframe
                        src={media.src}
                        title={sponsoredAd.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    ) : media.type === 'video' ? (
                      <video
                        src={media.src}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={media.src}
                        alt={sponsoredAd.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-brand/80">Sponsored/AD</p>
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
                  onClick={() => { void api.post(`/api/promotions/${sponsoredAd.id}/click`, {}).catch(() => { }); }}
                >
                  {content}
                </a>
              ) : (
                <Link
                  to={target}
                  className={classes}
                  onClick={() => { void api.post(`/api/promotions/${sponsoredAd.id}/click`, {}).catch(() => { }); }}
                >
                  {content}
                </Link>
              );
            })()
          )}




        </div>
      </div>

      {/* Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#1e1e2e] border border-red-500/30 rounded-3xl w-full max-w-sm shadow-2xl shadow-red-500/10 overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-red-400 to-orange-400" />
            <div className="px-7 py-8 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-1">Drop Expired</p>
                <h2 className="text-xl font-extrabold text-white">Sorry, this drop has expired</h2>
              </div>
              <div className="bg-[#2a2a3e] border border-[#35354d] rounded-xl px-4 py-3">
                <p className="text-white font-bold text-sm line-clamp-2">"{drop.title}"</p>
              </div>
              <p className="text-sm text-[#94a3b8]">
                The goal wasn't reached before the deadline. Any credits contributed have been refunded to everyone who participated.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => setShowExpiredModal(false)}
                  className="w-full py-3 rounded-2xl bg-[#2a2a3e] hover:bg-[#35354d] text-white font-semibold text-sm transition"
                >
                  OK, got it
                </button>
                <Link
                  to="/explore"
                  className="w-full py-2.5 rounded-2xl text-center text-sm text-text-muted hover:text-text transition"
                >
                  Browse other drops
                </Link>
              </div>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-400 opacity-40" />
          </div>
        </div>
      )}

      {/* Celebration Modal */}
      {(showCelebration && drop.status !== "expired") && (
        <DropCelebrationModal
          dropId={drop.id}
          dropTitle={drop.title}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          dropTitle={drop.title}
          dropUrl={`${window.location.origin}/drop/${drop.id}/view`}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showDownloadInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="bg-[#1e1e2e] border border-surface-3 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-brand via-cyan-400 to-brand" />
            <div className="px-6 py-6 space-y-4">
              <h3 className="text-lg font-bold text-white">How to unlock this download</h3>
              <p className="text-sm text-[#cbd5e1]">
                This download should drop/unlock in <span className="font-semibold text-white">{unlockHours} hour{unlockHours === 1 ? '' : 's'}</span> after the donation goal reaches <span className="font-semibold text-white">{unlockThresholdPct}%</span>. It can be sped up by contributing more credits to speed up the countdown.
              </p>
              <p className="text-sm text-[#94a3b8]">
                Current progress: <span className="font-semibold text-white">{goalProgressPct.toFixed(1)}%</span> goal met.
              </p>

              <p className="text-sm text-[#94a3b8]">
                The Drop will expire and be canceled if the donation goal is not met within the specified time. Time remaining: <span className="font-semibold text-white">{Math.round(totalMinutesLeft * 10 / 60) / 10} hours</span>.
              </p>
              <p className="text-sm text-[#cbd5e1]">
                Become a contributor today to speed up and unlock the drop.
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDownloadInfoModal(false);
                    const contributeEl = document.querySelector('[data-contribute-form-anchor]');
                    if (contributeEl instanceof HTMLElement) {
                      contributeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-brand/20 border border-brand/40 text-brand font-semibold text-sm hover:bg-brand/30 transition"
                >
                  Contribute now
                </button>
                <button
                  type="button"
                  onClick={() => setShowDownloadInfoModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-3 border border-surface-3 text-text-muted hover:text-text transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stall Modal */}
      {showStallModal && (
        <StallModal
          dropId={drop.id}
          dropTitle={drop.title}
          totalMinutesLeft={totalMinutesLeft}
          onClose={() => setShowStallModal(false)}
          onStalled={(newExpiresAt, _creditsSpent, _newBalance, _newFuseTime) => {
            setStallExpiresAt(new Date(newExpiresAt).getTime());
            refreshDrop();
          }}
        />
      )}
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
