import { Zap, Clock, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useData';

export default function ActiveContributions() {
  const { data, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-danger text-center py-20">{error || 'Failed to load contributions'}</p>;
  }

  const active = data.contributed.filter((d) => d.status === 'active' || d.status === 'pending');

  return (
    <div>
      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-6">
        <Zap className="w-6 h-6 text-brand" />
        Active Contributions
      </h1>

      {active.length === 0 ? (
        <p className="text-text-muted text-center py-20">No active contributions yet.</p>
      ) : (
        <div className="space-y-4">
          {active.map((drop) => {
            const remaining = Math.max(0, (drop.scheduledDropTime - Date.now()) / 1000);
            const hours = Math.floor(remaining / 3600);
            const mins = Math.floor((remaining % 3600) / 60);
            const goalPct = Math.min((drop.currentContributions / drop.goalAmount) * 100, 100);

            return (
              <Link
                key={drop.id}
                to={`/drop/${drop.id}`}
                className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition-colors block no-underline"
              >
                <div className="w-12 h-12 bg-surface-3 rounded-lg flex items-center justify-center">
                  <Flame className="w-6 h-6 text-brand" />
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
    </div>
  );
}
