import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import PriceDisplay from '../components/PriceDisplay';
import ContributorList from '../components/ContributorList';
import ReviewForm from '../components/ReviewForm';
import type { Drop, Contributor, Review } from '../types';
import { Download, Tag, HardDrive, ThumbsUp, ThumbsDown, Star, Check, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react';

interface ServerContributor {
  userId: string;
  username: string;
  avatar: string | null;
  totalAmount: number;
  lastContribution: string;
}

interface ServerReview {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  comment: string;
  rating: number;
  liked: boolean | null;
  created_at: string;
}

interface PricePreview {
  basePrice: number;
  contributedAmount: number;
  contributorDiscountPct: number;
  timeDecayDiscountPct: number;
  volumeDecayDiscountPct: number;
  totalDiscountPct: number;
  finalPrice: number;
  alreadyDownloaded: boolean;
  isCreator: boolean;
  isFree: boolean;
}

function toYouTubeEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|youtube\.com\/shorts\/)([-\w]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

export default function DropDownload() {
  const { id } = useParams<{ id: string }>();
  const { drops } = useApp();
  const { isAuthenticated, updateBalance } = useAuth();
  const navigate = useNavigate();
  const localDrop = drops.find((d) => d.id === id);
  const [fetchedDrop, setFetchedDrop] = useState<Drop | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [dlState, setDlState] = useState<'idle' | 'purchasing' | 'downloading' | 'done' | 'free'>('idle');
  const [dlError, setDlError] = useState<string | null>(null);
  const [showPriceDetail, setShowPriceDetail] = useState(false);

  const drop = localDrop ?? fetchedDrop;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const promises: Promise<void>[] = [];

    if (!localDrop) {
      promises.push(
        api.get<ServerDrop>(`/api/drops/${id}`)
          .then((raw) => { if (!cancelled) setFetchedDrop(mapDrop(raw)); })
          .catch(() => {})
      );
    }

    promises.push(
      api.get<ServerContributor[]>(`/api/drops/${id}/contributors`)        .then((rows) => {
          if (cancelled) return;
          setContributors(rows.map((c) => ({
            id: c.userId,
            username: c.username,
            avatar: c.avatar || '',
            amount: c.totalAmount,
            timestamp: new Date(c.lastContribution).getTime(),
          })));
        })
        .catch(() => {})
    );

    promises.push(
      api.get<ServerReview[]>(`/api/drops/${id}/reviews`)
        .then((rows) => {
          if (cancelled) return;
          setReviews(rows.map((r) => ({
            id: r.id,
            userId: r.userId,
            username: r.username,
            avatar: r.avatar || '',
            comment: r.comment,
            liked: r.liked,
            rating: r.rating,
            timestamp: new Date(r.created_at).getTime(),
          })));
        })
        .catch(() => {})
    );

    Promise.all(promises).finally(() => {
      if (!cancelled) setLoading(false);
    });

    // Price preview (soft-auth: works logged in or out)
    api.get<PricePreview>(`/api/drops/${id}/price-preview`)
      .then((p) => { if (!cancelled) setPricePreview(p); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [id, localDrop]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Drop not found.</p>
        <Link to="/" className="text-brand underline text-sm mt-2 block">Back to dashboard</Link>
      </div>
    );
  }

  async function handleDownload() {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/drop/${id}`);
      return;
    }
    if (pricePreview?.isFree || pricePreview?.isCreator) {
      setDlState('free');
    } else {
      setDlState('purchasing');
      setDlError(null);
      try {
        await api.post(`/api/drops/${id}/download`, {});
      } catch (e: any) {
        if (!e.message?.toLowerCase().includes('already')) {
          setDlError(e.message || 'Purchase failed');
          setDlState('idle');
          return;
        }
      }
    }
    setDlState('downloading');
    try {
      const { url, filename } = await api.get<{ url: string; filename: string }>(`/api/drops/${id}/download-url`);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `drop-${id}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDlState('done');
      setPricePreview((p) => p ? { ...p, alreadyDownloaded: true } : p);
      if (pricePreview?.finalPrice && !pricePreview.isFree && !pricePreview.isCreator) {
        updateBalance(-pricePreview.finalPrice);
      }
    } catch (e: any) {
      setDlError(e.message || 'Download failed');
      setDlState('idle');
    }
    
  }

  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : (drop.avgRating ?? 0);
  const likes = reviews.length > 0
    ? reviews.filter((r) => r.liked === true).length
    : drop.likeCount;
  const dislikes = reviews.length > 0
    ? reviews.filter((r) => r.liked === false).length
    : drop.dislikeCount;
  const reviewCount = reviews.length > 0 ? reviews.length : drop.reviewCount;

  const handleReviewSubmit = async (data: { comment: string; liked: boolean | null; rating: number }) => {
    try {
      const res = await api.post<{ id: string }>(`/api/drops/${id}/reviews`, data);
      setReviews((prev) => [{
        id: res.id,
        userId: 'me',
        username: 'You',
        avatar: '',
        comment: data.comment,
        liked: data.liked,
        rating: data.rating,
        timestamp: Date.now(),
      }, ...prev]);
    } catch {
      setReviews((prev) => [{
        id: `r${Date.now()}`,
        userId: 'me',
        username: 'You',
        avatar: '',
        comment: data.comment,
        liked: data.liked,
        rating: data.rating,
        timestamp: Date.now(),
      }, ...prev]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero — YouTube trailer or thumbnail fallback */}
      {drop.trailerUrl && toYouTubeEmbed(drop.trailerUrl) ? (
        <div className="aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
          <iframe
            src={toYouTubeEmbed(drop.trailerUrl)!}
            title="Product Trailer"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : drop.thumbnailUrl ? (
        <div className="aspect-video rounded-2xl overflow-hidden bg-surface-2 shadow-lg">
          <img src={drop.thumbnailUrl} alt={drop.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-surface-2 rounded-2xl flex items-center justify-center">
          <div className="text-center text-text-muted">
            <div className="text-5xl mb-2">🎬</div>
            <p className="text-sm">No trailer available</p>
          </div>
        </div>
      )}

      {/* Title + creator + tags */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-text mb-2">{drop.title}</h1>

          {/* Creator row */}
          <div className="flex items-center gap-3 flex-wrap text-sm text-text-muted mb-2">
            <Link
              to={`/user/${drop.creatorId}`}
              className="flex items-center gap-2 hover:text-brand transition no-underline"
            >
              <div className="w-8 h-8 rounded-full bg-surface-3 border border-surface-3 flex items-center justify-center text-xs font-bold text-brand overflow-hidden shrink-0">
                {drop.creatorAvatar
                  ? <img src={drop.creatorAvatar} alt={drop.creatorName} className="w-full h-full object-cover" />
                  : drop.creatorName[0].toUpperCase()
                }
              </div>
              <div>
                <p className="text-text font-semibold leading-tight">{drop.creatorName}</p>
                <p className="text-[11px] text-text-muted">Creator</p>
              </div>
            </Link>
            <span className="text-surface-3">|</span>
            <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {drop.fileSize}</span>
            <span className="flex items-center gap-1"><Tag className="w-4 h-4" /> {drop.fileType}</span>
          </div>

          <p className="text-sm text-text-muted leading-relaxed">{drop.description}</p>
        </div>

        {/* Tags */}
        {drop.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap shrink-0">
            {drop.tags.map((t) => (
              <span key={t} className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price, download & contributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <PriceDisplay
            drop={drop}
            userContribution={pricePreview?.contributedAmount ?? 0}
            pricePreview={pricePreview}
          />

          {/* Price detail toggle */}
          {pricePreview && pricePreview.totalDiscountPct > 0 && (
            <button
              onClick={() => setShowPriceDetail((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-text-muted hover:text-text transition-colors px-1"
            >
              <span>Discount breakdown</span>
              {showPriceDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {showPriceDetail && pricePreview && (
            <div className="bg-surface-2 rounded-xl p-3 space-y-1 text-xs">
              {pricePreview.contributorDiscountPct > 0 && (
                <div className="flex justify-between text-success">
                  <span>Contributor discount</span>
                  <span>-{pricePreview.contributorDiscountPct.toFixed(1)}%</span>
                </div>
              )}
              {pricePreview.timeDecayDiscountPct > 0 && (
                <div className="flex justify-between text-brand">
                  <span>Time decay discount</span>
                  <span>-{pricePreview.timeDecayDiscountPct.toFixed(1)}%</span>
                </div>
              )}
              {pricePreview.volumeDecayDiscountPct > 0 && (
                <div className="flex justify-between text-text-muted">
                  <span>Volume discount</span>
                  <span>-{pricePreview.volumeDecayDiscountPct.toFixed(1)}%</span>
                </div>
              )}
              <div className="border-t border-surface-3 pt-1 flex justify-between font-semibold text-text">
                <span>Total discount</span>
                <span>-{pricePreview.totalDiscountPct.toFixed(1)}%</span>
              </div>
            </div>
          )}

          {/* Download button */}
          {pricePreview?.alreadyDownloaded ? (
            <button
              onClick={handleDownload}
              disabled={dlState === 'downloading'}
              className="w-full py-3 rounded-xl bg-surface-3 text-text font-bold text-sm hover:bg-surface-2 transition-colors flex items-center justify-center gap-2"
            >
              {dlState === 'downloading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5 text-success" />}
              Re-download
            </button>
          ) : (
            <button
              onClick={handleDownload}
              disabled={dlState === 'purchasing' || dlState === 'downloading'}
              className="w-full py-3 rounded-xl bg-success text-white font-bold text-sm hover:bg-success/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {dlState === 'purchasing' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Purchasing…</>
              ) : dlState === 'downloading' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Preparing download…</>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {pricePreview?.isFree || pricePreview?.isCreator
                    ? 'Download Free'
                    : `Download — ${pricePreview ? pricePreview.finalPrice.toLocaleString() : drop.basePrice.toLocaleString()} credits`
                  }
                </>
              )}
            </button>
          )}
          {dlError && (
            <p className="text-danger text-xs mt-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> {dlError}
            </p>
          )}
          {!isAuthenticated && (
            <p className="text-xs text-text-muted text-center">
              <Link to="/login" className="text-brand underline">Sign in</Link> to download
            </p>
          )}
        </div>

        <ContributorList contributors={contributors} />
      </div>

      {/* ── Reviews ── */}
      <div>
        <h2 className="text-lg font-bold text-text mb-4">
          Reviews
          {reviewCount > 0 && <span className="text-text-muted font-normal text-sm ml-2">({reviewCount})</span>}
        </h2>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <Star className="w-5 h-5 text-brand mx-auto mb-1" />
            <p className="text-2xl font-bold text-brand font-mono">{avgRating}%</p>
            <p className="text-xs text-text-muted">Avg Quality</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <ThumbsUp className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-success font-mono">{likes.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Likes</p>
          </div>
          <div className="bg-surface-2 rounded-xl p-4 text-center">
            <ThumbsDown className="w-5 h-5 text-danger mx-auto mb-1" />
            <p className="text-2xl font-bold text-danger font-mono">{dislikes.toLocaleString()}</p>
            <p className="text-xs text-text-muted">Dislikes</p>
          </div>
        </div>

        {/* Review submission form */}
        <div className="mb-6">
          <ReviewForm onSubmit={handleReviewSubmit} />
        </div>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No reviews yet — be the first!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="bg-surface-2 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-brand overflow-hidden shrink-0">
                    {r.avatar
                      ? <img src={r.avatar} alt={r.username} className="w-full h-full object-cover" />
                      : r.username[0].toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{r.username}</p>
                    <p className="text-xs text-text-muted">{new Date(r.timestamp).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.liked === true && <ThumbsUp className="w-4 h-4 text-success" />}
                    {r.liked === false && <ThumbsDown className="w-4 h-4 text-danger" />}
                    <span className="text-sm font-mono font-bold text-brand">{r.rating}%</span>
                  </div>
                </div>
                {/* Quality bar */}
                {/* <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full bg-brand transition-all"
                    style={{ width: `${r.rating}%` }}
                  />
                </div> */}
                <p className="text-sm text-text-muted">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
