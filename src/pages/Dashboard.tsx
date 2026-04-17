import { Link } from 'react-router-dom';
import { Flame, Clock, Users, Package, CreditCard, TrendingUp, PlusCircle, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useData';
import type { Drop } from '../types';

function StatusBadge({ status }: { status: Drop['status'] }) {
  const styles: Record<Drop['status'], string> = {
    pending: 'bg-yellow-500/15 text-yellow-400',
    active: 'bg-brand/15 text-brand',
    dropped: 'bg-success/15 text-success',
    expired: 'bg-danger/15 text-danger',
    removed: 'bg-text-muted/10 text-text-muted line-through',
    draft: 'bg-text-muted/10 text-text-muted'
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

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <Package className="w-5 h-5 mx-auto mb-1 text-brand" />
          <p className="text-2xl font-bold text-text">{stats.totalMyDrops}</p>
          <p className="text-xs text-text-muted">My Drops</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <Zap className="w-5 h-5 mx-auto mb-1 text-brand" />
          <p className="text-2xl font-bold text-text">{stats.dropsContributedTo}</p>
          <p className="text-xs text-text-muted">Contributing To</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <CreditCard className="w-5 h-5 mx-auto mb-1 text-green-500" />
          {/* <p className="text-2xl font-bold text-text">{(stats.totalEarned / 1000).toFixed(0)}K</p> */}
          <p className="text-2xl font-bold text-text">{(stats.totalEarned)}</p>
          <p className="text-xs text-text-muted">Credits Earned</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <Flame className="w-5 h-5 mx-auto mb-1 text-red-400" />
          {/* <p className="text-2xl font-bold text-text">{(stats.totalContributed / 1000).toFixed(0)}K</p> */}
            <p className="text-2xl font-bold text-text">{(stats.totalContributed)}</p>
          <p className="text-xs text-text-muted">Credits Burned</p>
        </div>
      </div>

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
              <MyDropRow key={drop.id} drop={drop} />
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

              return (
                <Link
                  key={drop.id}
                  to={`/drop/${drop.id}`}
                  className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition block no-underline"
                >
                  <div className="w-11 h-11 bg-surface-3 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={`https://picsum.photos/seed/${drop.id}/88/88`}
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
    <Link
      to={linkTo}
      className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition block no-underline group"
    >
      <div className="w-11 h-11 bg-surface-3 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <img
          src={`https://picsum.photos/seed/${drop.id}/88/88`}
          alt={drop.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
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
      <div className="w-24 shrink-0">
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${goalPct}%`, background: goalPct >= 100 ? '#22c55e' : '#f97316' }}
          />
        </div>
        <p className="text-xs text-text-muted text-right mt-0.5">{goalPct.toFixed(0)}% funded</p>
      </div>
    </Link>
  );
}
