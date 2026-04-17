import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Drop } from '../types';
import { applyContribution, effectiveBurnRate } from '../engine/burnRate';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';

interface AppState {
  drops: Drop[];
  dropsLoading: boolean;
  contribute: (dropId: string, amount: number) => void;
  refreshDrops: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [dropsLoading, setDropsLoading] = useState(true);

  const fetchDrops = useCallback(async () => {
    setDropsLoading(true);
    try {
      const res = await api.get<{ drops: ServerDrop[] }>('/api/drops?limit=50');
      setDrops(res.drops.map(mapDrop));
    } catch {
      // API unavailable — drops stay empty until server responds
    } finally {
      setDropsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const contribute = useCallback((dropId: string, amount: number) => {
    setDrops((prev) =>
      prev.map((d) => {
        if (d.id !== dropId) return d;
        const newContributions = d.currentContributions + amount;
        const goalMet = newContributions >= d.goalAmount;
        const newBurnRate = goalMet
          ? effectiveBurnRate(applyContribution(d.burnRate, amount, d.goalAmount))
          : 1;
        return {
          ...d,
          currentContributions: newContributions,
          contributorCount: d.contributorCount + 1,
          status: goalMet && d.status === 'pending' ? 'active' : d.status,
          burnRate: newBurnRate,
        };
      }),
    );
  }, []);

  return (
    <AppContext.Provider value={{ drops, dropsLoading, contribute, refreshDrops: fetchDrops }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
