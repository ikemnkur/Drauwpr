import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

interface ContributeResponse {
  message: string;
  contribution: { id: string; amount: number; penaltyAmount: number };
  drop: { currentContributions: number; momentum: number; burnRate: number; status: string };
  newBalance: number;
}

interface Props {
  dropId: string;
  onContributed?: () => void;
}

const PRESETS = [1_000, 5_000, 10_000, 25_000];

export default function ContributeForm({ dropId, onContributed }: Props) {
  const { contribute } = useApp();
  const { user, updateBalance } = useAuth();
  const [amount, setAmount] = useState(1_000);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const balance = user?.creditBalance ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 100 || amount > balance || submitting) return;
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post<ContributeResponse>(`/api/drops/${dropId}/contribute`, { amount });
      // Update local state as well for instant UI feedback
      contribute(dropId, amount);
      // Sync credit balance directly from contribution response
      updateBalance(res.newBalance);
      setSubmitted(true);
      onContributed?.();
      setTimeout(() => setSubmitted(false), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Contribution failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-2 rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Zap className="w-4 h-4 text-brand" />
        Contribute Credits
      </h3>

      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${
              amount === p
                ? 'bg-brand text-white'
                : 'bg-surface-3 text-text-muted hover:text-text'
            }`}
          >
            {p.toLocaleString()}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={100}
          max={user?.creditBalance ?? 0}
          value={amount}
          onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
          className="flex-1 bg-surface-3 border border-surface-3 rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-brand"
        />
        <span className="text-xs text-text-muted">credits</span>
      </div>

      <p className="text-xs text-text-muted">
        Balance: <span className="text-brand font-semibold">{balance.toLocaleString()}</span> credits
        <span className="text-text-muted ml-1">(min 100)</span>
      </p>

      {error && <p className="text-xs text-danger">{error}</p>}

      <button
        type="submit"
        disabled={amount < 100 || amount > balance || submitting}
        className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed pulse-glow"
      >
        {submitting ? 'Contributing…' : submitted ? '🔥 Contributed!' : `Burn ${amount.toLocaleString()} Credits`}
      </button>
    </form>
  );
}
