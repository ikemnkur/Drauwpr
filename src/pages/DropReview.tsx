import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import ReviewForm from '../components/ReviewForm';
import type { Review, Drop } from '../types';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';

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

export default function DropReview() {
  const { id } = useParams<{ id: string }>();
  const { drops } = useApp();
  const localDrop = drops.find((d) => d.id === id);
  const [fetchedDrop, setFetchedDrop] = useState<Drop | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const drop = localDrop ?? fetchedDrop;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const promises: Promise<void>[] = [];

    // Fetch drop if not in context
    if (!localDrop) {
      promises.push(
        api.get<ServerDrop>(`/api/drops/${id}`)
          .then((raw) => { if (!cancelled) setFetchedDrop(mapDrop(raw)); })
          .catch(() => {})
      );
    }

    // Fetch reviews from API
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

    return () => { cancelled = true; };
  }, [id, localDrop]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading reviews…</p>
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

  const avgRating = reviews.length > 0
    ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0;
  const likes = reviews.filter((r) => r.liked === true).length;
  const dislikes = reviews.filter((r) => r.liked === false).length;

  const handleSubmit = async (data: { comment: string; liked: boolean | null; rating: number }) => {
    try {
      const res = await api.post<{ id: string }>(`/api/drops/${id}/reviews`, data);
      const newReview: Review = {
        id: res.id,
        userId: 'me',
        username: 'You',
        avatar: '',
        comment: data.comment,
        liked: data.liked,
        rating: data.rating,
        timestamp: Date.now(),
      };
      setReviews([newReview, ...reviews]);
    } catch {
      // Fallback: add locally
      const newReview: Review = {
        id: `r${Date.now()}`,
        userId: 'u1',
        username: 'ikem',
        avatar: '',
        comment: data.comment,
        liked: data.liked,
        rating: data.rating,
        timestamp: Date.now(),
      };
      setReviews([newReview, ...reviews]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Link to={`/drop/${drop.id}/download`} className="text-brand text-sm mb-4 block no-underline hover:underline">
        ← Back to {drop.title}
      </Link>

      <h1 className="text-2xl font-bold text-text mb-1">Reviews</h1>
      <p className="text-sm text-text-muted mb-6">{drop.title}</p>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <Star className="w-5 h-5 text-brand mx-auto mb-1" />
          <p className="text-2xl font-bold text-brand font-mono">{avgRating}%</p>
          <p className="text-xs text-text-muted">Avg Quality</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <ThumbsUp className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-2xl font-bold text-success font-mono">{likes}</p>
          <p className="text-xs text-text-muted">Likes</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <ThumbsDown className="w-5 h-5 text-danger mx-auto mb-1" />
          <p className="text-2xl font-bold text-danger font-mono">{dislikes}</p>
          <p className="text-xs text-text-muted">Dislikes</p>
        </div>
      </div>

      {/* Form */}
      <div className="mb-8">
        <ReviewForm onSubmit={handleSubmit} />
      </div>

      {/* Reviews list */}
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.id} className="bg-surface-2 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-brand">
                {r.username[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text">{r.username}</p>
                <p className="text-xs text-text-muted">
                  {new Date(r.timestamp).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.liked === true && <ThumbsUp className="w-4 h-4 text-success" />}
                {r.liked === false && <ThumbsDown className="w-4 h-4 text-danger" />}
                <span className="text-sm font-mono text-brand">{r.rating}%</span>
              </div>
            </div>
            <p className="text-sm text-text-muted">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
