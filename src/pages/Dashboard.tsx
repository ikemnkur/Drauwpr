import { Link } from 'react-router-dom';
import { Flame, Clock, Users, Package, TrendingUp, PlusCircle, Zap, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useData';
import type { Drop } from '../types';


const API_BASE = import.meta.env.VITE_API_URL || '';
const PUBLIC_MEDIA_BASE = String(
  import.meta.env.VITE_STORAGE_PUBLIC_BASE_URL
  || import.meta.env.VITE_MEDIA_BASE_URL
  || import.meta.env.VITE_R2_PUBLIC_BASE_URL
  || ''
).replace(/\/$/, '');

function resolveDropThumbnailUrl(raw: string | null | undefined, dropId: string): string {
  const value = String(raw || '').trim();
  if (!value) return `https://picsum.photos/seed/${dropId}/400/200`;

  // Legacy API URLs from R2 S3 endpoint are not browser-public; rewrite to configured public base.
  if (/^https?:\/\//i.test(value)) {
    if (PUBLIC_MEDIA_BASE) {
      try {
        const parsed = new URL(value);
        const pathNoLead = parsed.pathname.replace(/^\/+/, '');
        const pathParts = pathNoLead.split('/');

        // /<bucket>/<objectKey...>
        if (parsed.hostname.endsWith('.r2.cloudflarestorage.com') && pathParts.length > 1) {
          const objectPath = pathParts.slice(1).join('/');
          return `${PUBLIC_MEDIA_BASE}/${encodeURI(objectPath)}`;
        }
      } catch {
        // Fall through to return original URL.
      }
    }
    return value;
  }

  // Storage object key (e.g. storage_folder/public/thumbnails/...) => public media domain.
  if (PUBLIC_MEDIA_BASE && !value.startsWith('/')) {
    return `${PUBLIC_MEDIA_BASE}/${encodeURI(value.replace(/^\/+/, ''))}`;
  }

  // Local/static path fallback.
  if (value.startsWith('/')) {
    return API_BASE ? `${API_BASE}${value}` : value;
  }

  return `https://picsum.photos/seed/${dropId}/400/200`;
}

type DashboardView = 'posts' | 'credits' | 'engagement';

function MetricRow({
  label,
  current,
  day = '--',
  week = '--',
  month = '--',
}: {
  label: string;
  current: string | number;
  day?: string | number;
  week?: string | number;
  month?: string | number;
}) {
  return (
    <tr className="border-t border-surface-3/80">
      <td className="py-3 pr-3 text-sm text-text-muted">{label}</td>
      <td className="py-3 pr-3 text-right text-sm font-semibold text-text">{current}</td>
      <td className="py-3 pr-3 text-right text-xs font-medium text-text-muted">{day}</td>
      <td className="py-3 pr-3 text-right text-xs font-medium text-text-muted">{week}</td>
      <td className="py-3 text-right text-xs font-medium text-text-muted">{month}</td>
    </tr>
  );
}

function StatusBadge({ status }: { status: Drop['status'] }) {
  const styles: Record<Drop['status'], string> = {
    pending: 'bg-yellow-500/15 text-yellow-400',
    active: 'bg-brand/15 text-brand',
    dropped: 'bg-success/15 text-success',
    expired: 'bg-danger/15 text-danger',
    removed: 'bg-text-muted/10 text-text-muted line-through',
    draft: 'bg-text-muted/10 text-text-muted',
    hidden: 'bg-slate-500/15 text-slate-300',
    boosted: 'bg-brand/20 text-brand'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useDashboard();
  const [view, setView] = useState<DashboardView>('posts');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-danger text-center py-20">{error || 'Failed to load dashboard'}</p>;
  }

  const { myDrops, contributed: contributedDrops, stats } = data;
  const myActiveDrops = myDrops.filter((d) => d.status === 'active' || d.status === 'pending');
  const myPastDrops = myDrops.filter((d) => d.status === 'dropped' || d.status === 'expired');
  const activeCount = myDrops.filter((d) => d.status === 'active').length;
  const expiredCount = myDrops.filter((d) => d.status === 'expired').length;
  const droppedCount = myDrops.filter((d) => d.status === 'dropped').length;
  const releasedDrops = myDrops.filter((drop) => drop.status === 'dropped' || drop.status === 'expired');
  const totalLikes = releasedDrops.reduce((sum, drop) => sum + (drop.likeCount || 0), 0);
  const totalDislikes = releasedDrops.reduce((sum, drop) => sum + (drop.dislikeCount || 0), 0);
  const totalComments = releasedDrops.reduce((sum, drop) => sum + (drop.reviewCount || 0), 0);
  const ratedDrops = releasedDrops.filter((drop) => drop.avgRating != null);
  const avgQualityRating = ratedDrops.length > 0
    ? ratedDrops.reduce((sum, drop) => sum + Number(drop.avgRating || 0), 0) / ratedDrops.length
    : null;

  

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-brand" />
            My Dashboard
          </h1>
          <p className="text-sm text-text-muted">Your drops, contributions, and stats at a glance.</p>
        </div>
        <Link
          to="/create"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-sm font-medium hover:bg-brand-dark transition no-underline shadow-lg shadow-brand/20"
        >
          <PlusCircle className="w-4 h-4" />
          New Drop
        </Link>
      </div>

      <div className="flex items-center justify-start gap-2 rounded-xl border border-surface-3 bg-surface-2/70 p-1.5 overflow-x-auto">
        {([
              { id: 'posts', label: 'Drops' },
          { id: 'credits', label: 'Credits' },
          { id: 'engagement', label: 'Engagement' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === item.id ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:bg-surface-3 hover:text-text'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === 'posts' && (
        <div className="rounded-2xl border border-surface-3 bg-surface-2/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Drops</h2>
              <p className="text-xs text-text-muted">Compact drop activity summary</p>
            </div>
            <div className="text-right text-xs text-text-muted">
              <p className="font-semibold text-text">{stats.totalMyDrops} total</p>
              <p>{activeCount} active</p>
            </div>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-text-muted">
                <th className="pb-2 text-left font-medium">Metric</th>
                <th className="pb-2 text-right font-medium">Current</th>
                <th className="pb-2 text-right font-medium">Day</th>
                <th className="pb-2 text-right font-medium">Week</th>
                <th className="pb-2 text-right font-medium">Month</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Total Drops" current={stats.totalMyDrops.toLocaleString()} />
              <MetricRow label="Active" current={activeCount.toLocaleString()} />
              <MetricRow label="Expired" current={expiredCount.toLocaleString()} />
              <MetricRow label="Dropped" current={droppedCount.toLocaleString()} />
            </tbody>
          </table>
        </div>
      )}

      {view === 'credits' && (
        <div className="rounded-2xl border border-surface-3 bg-surface-2/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Credits</h2>
              <p className="text-xs text-text-muted">Balance, spending, and earnings</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/buy-credits" className="text-xs font-medium text-brand hover:underline no-underline">
                Buy credits
              </Link>
              <Link to="/history" className="text-xs font-medium text-brand hover:underline no-underline">
                Credit History
              </Link>
            </div>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-text-muted">
                <th className="pb-2 text-left font-medium">Metric</th>
                <th className="pb-2 text-right font-medium">Current</th>
                <th className="pb-2 text-right font-medium">Day</th>
                <th className="pb-2 text-right font-medium">Week</th>
                <th className="pb-2 text-right font-medium">Month</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Available" current={(user?.creditBalance ?? 0).toLocaleString()} />
              <MetricRow label="Earned (Lifetime)" current={stats.totalEarned.toLocaleString()} />
              <MetricRow label="Burned (Lifetime)" current={stats.totalContributed.toLocaleString()} />
              <MetricRow label="Promo/Ad Campaign Spend" current="--" />
            </tbody>
          </table>
        </div>
      )}

      {view === 'engagement' && (
        <div className="rounded-2xl border border-surface-3 bg-surface-2/70 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Engagement</h2>
              <p className="text-xs text-text-muted">Interaction totals and quality score</p>
            </div>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-text-muted">
                <th className="pb-2 text-left font-medium">Metric</th>
                <th className="pb-2 text-right font-medium">Current</th>
                <th className="pb-2 text-right font-medium">Day</th>
                <th className="pb-2 text-right font-medium">Week</th>
                <th className="pb-2 text-right font-medium">Month</th>
              </tr>
            </thead>
            <tbody>
              <MetricRow label="Likes" current={totalLikes.toLocaleString()} />
              <MetricRow label="Dislikes" current={totalDislikes.toLocaleString()} />
              <MetricRow label="Comments" current={totalComments.toLocaleString()} />
              <MetricRow label="Favorites" current={stats.totalFavorites.toLocaleString()} />
              <MetricRow label="Avg Quality Score" current={avgQualityRating == null ? '--' : `${avgQualityRating.toFixed(1)}%`} />
            </tbody>
          </table>
        </div>
      )}

      {/* Active Drops I'm Hosting */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Flame className="w-5 h-5 text-brand" />
            My Active Drops
          </h2>
        </div>
        {myActiveDrops.length === 0 ? (
          <div className="bg-surface-2 rounded-xl p-8 text-center">
            <Package className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm mb-3">You don't have any active drops yet.</p>
            <Link to="/create" className="text-brand text-sm hover:underline no-underline">
              Create your first drop →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myActiveDrops.map((drop) => (
              <>
               <MyDropRow key={drop.id} drop={drop} />
             
              </>
             
            ))}
          </div>
        )}
      </section>

      {/* Drops I'm Contributing To */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Zap className="w-5 h-5 text-brand" />
            Contributing To
          </h2>
          <Link to="/contributions" className="text-xs text-text-muted hover:text-brand transition no-underline flex items-center gap-0.5">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {contributedDrops.length === 0 ? (
          <div className="bg-surface-2 rounded-xl p-8 text-center">
            <Zap className="w-8 h-8 text-text-muted mx-auto mb-2" />
            <p className="text-text-muted text-sm mb-3">You haven't contributed to any drops yet.</p>
            <Link to="/explore" className="text-brand text-sm hover:underline no-underline">
              Explore drops →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {contributedDrops.map((drop) => {
              const remaining = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
              const hours = Math.floor(remaining / 3600);
              const mins = Math.floor((remaining % 3600) / 60);
              const goalPct = Math.min((drop.currentContributions / drop.goalAmount) * 100, 100);

              console.log('drop:', drop);

              return (
                <Link
                  key={drop.id}
                  to={`/drop/${drop.id}`}
                  className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition block no-underline"
                >
                  <div className="w-11 h-11 bg-surface-3 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      // src={`https://picsum.photos/seed/${drop.id}/88/88`}
                      src={resolveDropThumbnailUrl(drop.thumbnailUrl, drop.id)}
                      alt={drop.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{drop.title}</p>
                    <p className="text-xs text-text-muted">{drop.creatorName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-brand">{drop.burnRate.toFixed(1)}x</p>
                    <p className="text-xs text-text-muted flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {hours}h {mins}m
                    </p>
                  </div>
                  <div className="w-20 shrink-0">
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${goalPct}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-muted text-right mt-0.5">{goalPct.toFixed(0)}%</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Past Drops */}
      {myPastDrops.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-text flex items-center gap-2 mb-3">
            <Package className="w-5 h-5 text-text-muted" />
            Past Drops
          </h2>
          <div className="space-y-3">
            {myPastDrops.map((drop) => (
              <MyDropRow key={drop.id} drop={drop} />
            ))}
          </div>
        </section>
      )}

      {/* Quick credit summary */}
      <div className="bg-surface-2/50 border border-surface-3 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p className="text-sm text-text">
            Balance: <span className="text-brand font-bold">{(user?.creditBalance ?? 0).toLocaleString()}</span> credits
          </p>
          <p className="text-xs text-text-muted">Keep your balance topped up to contribute or host drops.</p>
        </div>
        <Link
          to="/buy-credits"
          className="px-4 py-2 rounded-lg bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition no-underline"
        >
          Buy Credits
        </Link>
      </div>
    </div>
  );
}

/* ── Drop row for "My Drops" sections ── */
function MyDropRow({ drop }: { drop: Drop }) {
  const remaining = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const goalPct = Math.min((drop.currentContributions / drop.goalAmount) * 100, 100);
  const linkTo = drop.status === 'dropped' ? `/drop/${drop.id}/download` : `/drop/${drop.id}`;

  return (
    <div className="relative bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition group">
      <Link
        to={linkTo}
        className="absolute inset-0 z-0 rounded-xl"
        aria-label={`Open ${drop.title}`}
      />
      <div className="w-11 h-11 bg-surface-3 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <img
          src={resolveDropThumbnailUrl(drop.thumbnailUrl, drop.id)}
          alt={drop.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative z-10 flex-1 min-w-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-text group-hover:text-brand transition truncate">{drop.title}</p>
          <StatusBadge status={drop.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {drop.contributorCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-brand" />
            {drop.burnRate.toFixed(1)}x
          </span>
          {drop.status !== 'dropped' && remaining > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {days > 0 ? `${days}d ` : ''}{hours}h
            </span>
          )}
        </div>
      </div>
      <div className="relative z-10 w-24 shrink-0 mt-6 pointer-events-none">
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${goalPct}%`, background: goalPct >= 100 ? '#22c55e' : '#f97316' }}
          />
        </div>
        <p className="text-xs text-text-muted text-right mt-0.5">{goalPct.toFixed(0)}% funded</p>
      </div>
      {drop.status !== 'expired' && (
        <Link
          to={`/drop/${drop.id}/edit`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 z-20 text-xs text-text-muted hover:text-brand transition no-underline bg-surface-2/90 backdrop-blur px-2 py-1 rounded-full border border-surface-3"
        >
          Edit
        </Link>
      )}
    </div>
  );
}
