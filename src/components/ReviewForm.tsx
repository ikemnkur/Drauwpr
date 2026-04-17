import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';

interface Props {
  onSubmit: (review: { comment: string; liked: boolean | null; rating: number }) => void;
}

export default function ReviewForm({ onSubmit }: Props) {
  const [comment, setComment] = useState('');
  const [liked, setLiked] = useState<boolean | null>(null);
  const [rating, setRating] = useState(75);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSubmit({ comment: comment.trim(), liked, rating });
    setComment('');
    setLiked(null);
    setRating(75);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-2 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold text-text">Leave a Review</h3>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your thoughts…"
        rows={3}
        className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brand resize-none"
      />

      {/* Like / Dislike */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Verdict:</span>
        <button
          type="button"
          onClick={() => setLiked(liked === true ? null : true)}
          className={`p-2 rounded-lg transition-colors ${
            liked === true ? 'bg-success/20 text-success' : 'bg-surface-3 text-text-muted hover:text-success'
          }`}
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setLiked(liked === false ? null : false)}
          className={`p-2 rounded-lg transition-colors ${
            liked === false ? 'bg-danger/20 text-danger' : 'bg-surface-3 text-text-muted hover:text-danger'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>

      {/* Rating slider */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-text-muted">Quality Rating</span>
          <span className="text-brand font-mono font-bold">{rating}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-full accent-brand"
        />
      </div>

      <button
        type="submit"
        disabled={!comment.trim()}
        className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" />
        Submit Review
      </button>
    </form>
  );
}
