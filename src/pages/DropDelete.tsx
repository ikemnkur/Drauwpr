import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Trash2, Users, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';

interface CancelDropResponse {
  success?: boolean;
  message?: string;
  refundedContributors?: number;
  refundedCredits?: number;
  deletedCloudObjects?: number;
  creatorReversalCredits?: number;
}

function formatDuration(ms: number): string {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function DropDelete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { drops } = useApp();
  const { user } = useAuth();

  const localDrop = drops.find((d) => d.id === id);
  const [fetchedDrop, setFetchedDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(!localDrop);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  const drop = localDrop ?? fetchedDrop;

  useEffect(() => {
    if (!id || localDrop) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get<ServerDrop>(`/api/drops/${id}`)
      .then((raw) => {
        if (cancelled) return;
        setFetchedDrop(mapDrop(raw));
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load drop details.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, localDrop]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const canDelete = useMemo(() => {
    if (!drop || !user) return false;
    const validStatus = ['draft', 'pending', 'active', 'expired'].includes(drop.status);
    const typedMatch = confirmText.trim().toUpperCase() === 'DELETE';
    return user.id === drop.creatorId && validStatus && confirmRefund && typedMatch && !deleting;
  }, [drop, user, confirmRefund, confirmText, deleting]);

  async function handleDelete() {
    if (!id || !canDelete) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.delete<CancelDropResponse>(`/api/drops/${id}/cancel`);
      const details = [
        `Refunded contributors: ${res.refundedContributors ?? 0}`,
        `Credits refunded: ${res.refundedCredits ?? 0}`,
        `Cloud objects deleted: ${res.deletedCloudObjects ?? 0}`,
      ].join(' | ');
      setSuccess(res.message ? `${res.message} (${details})` : `Drop deleted. ${details}`);
      window.setTimeout(() => navigate('/dashboard', { replace: true }), 1200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete drop.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading drop details...</p>
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Drop not found.</p>
        <Link to="/dashboard" className="text-brand text-sm mt-3 inline-block no-underline hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === drop.creatorId;
  const remainingMs = Math.max(0, drop.expiresAt - nowMs);
  const contributionPct = drop.goalAmount > 0
    ? Math.min(100, (drop.currentContributions / drop.goalAmount) * 100)
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link to="/dashboard" className="text-brand text-sm no-underline hover:underline">Back to dashboard</Link>

      <div className="bg-surface-2 border border-surface-3 rounded-2xl p-5">
        <h1 className="text-xl font-bold text-text mb-4 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-red-500" />
          Review Drop Before Deletion
        </h1>

        <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
          <div className="rounded-xl overflow-hidden border border-surface-3 bg-surface-3">
            <img
              src={drop.thumbnailUrl || `https://picsum.photos/seed/${drop.id}/600/400`}
              alt={drop.title}
              className="w-full h-36 object-cover"
            />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-semibold text-text">{drop.title}</p>
            <p className="text-sm text-text-muted">{drop.description || 'No description provided.'}</p>
            <div className="flex flex-wrap gap-3 text-xs text-text-muted pt-1">
              <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{drop.contributorCount.toLocaleString()} contributors</span>
              <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" />{drop.currentContributions.toLocaleString()} / {drop.goalAmount.toLocaleString()} credits</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(remainingMs)} remaining</span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden mt-2">
              <div className="h-full bg-brand rounded-full" style={{ width: `${contributionPct}%` }} />
            </div>
            <p className="text-xs text-text-muted text-right">{contributionPct.toFixed(1)}% funded</p>
          </div>
        </div>
      </div>

      <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-300">Danger zone</p>
            <p className="text-sm text-red-100/90">
              Deleting this drop will cancel it permanently. All contributed credits will be refunded to the original contributing users.
            </p>
          </div>
        </div>

        {!isOwner && (
          <p className="text-sm text-red-200">Only the creator of this drop can perform this action.</p>
        )}

        <label className="flex items-center gap-2 text-sm text-red-100">
          <input
            type="checkbox"
            checked={confirmRefund}
            onChange={(e) => setConfirmRefund(e.target.checked)}
            className="accent-red-500"
          />
          I understand contributor credits will be refunded.
        </label>

        <div>
          <label className="block text-xs text-red-100/90 mb-1">Type DELETE to confirm</label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-red-500"
            placeholder="DELETE"
          />
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {success && <p className="text-sm text-green-300">{success}</p>}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-500 transition"
          >
            {deleting ? 'Deleting drop...' : 'Delete Drop and Refund Contributors'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/drop/${drop.id}/edit`)}
            className="px-4 py-2 rounded-lg bg-surface-3 text-text text-sm hover:bg-surface transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
