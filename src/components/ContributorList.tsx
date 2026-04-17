import type { Contributor } from '../types';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  contributors: Contributor[];
  limit?: number;
}

export default function ContributorList({ contributors, limit = 10 }: Props) {
  const sorted = [...contributors].sort((a, b) => b.amount - a.amount);
  const shown = sorted.slice(0, limit);

  return (
    <div className="bg-surface-2 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-brand" />
        <h3 className="text-sm font-semibold text-text">Top Contributors</h3>
        <span className="ml-auto text-xs text-text-muted">{contributors.length} total</span>
      </div>
      <ul className="space-y-2">
        {shown.map((c, i) => (
          <li key={c.id}>
            <Link to={`/user/${c.id}`} className="flex items-center gap-3 text-sm hover:bg-surface-3/50 rounded-lg px-1 py-0.5 -mx-1 transition no-underline">
              <span className="w-5 text-right text-text-muted font-mono text-xs">#{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center text-xs font-bold text-brand">
                {c.username[0].toUpperCase()}
              </div>
              <span className="flex-1 text-text truncate">{c.username}</span>
              <span className="text-brand font-mono font-semibold">
                {c.amount.toLocaleString()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
