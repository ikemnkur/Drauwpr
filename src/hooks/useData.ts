import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { Drop } from '../types';

// ── Server → Frontend mappers ──────────────────────────────

export interface ServerDrop {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  fileType: Drop['fileType'];
  fileSize: number | null;
  filePath: string | null;
  link?: string | null;
  originalFileName: string | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  tags: string | string[] | null;
  scheduledDropTime: string;
  actualDropTime: string | null;
  fusetime?: number | string | null;
  expiresAt: string;
  goalAmount: number;
  currentContributions: number;
  contributorCount: number;
  momentum: number;
  burnRate: number;
  lastMomentumUpdate: string | null;
  sensitivity: number;
  decayConstant: number;
  basePrice: number;
  dailyPriceDecayPct?: number | string;
  volumeDecayStep?: number;
  volumeDecayPct?: number | string;
  totalDownloads: number;
  totalRevenue: number;
  avgRating: number | string | null;
  reviewCount: number;
  flagCount: number;
  likeCount: number;
  dislikeCount: number;
  views?: number;
  status: Drop['status'];
  isPublic: number | boolean;
  mature?: number | boolean;
  created_at: string;
  updated_at?: string;
  expiry_behaviour?: 'refund' | 'keep';
  expiry_threshold?: number | null;
  // Joined fields from /api/dashboard
  creatorName?: string;
  creatorAvatar?: string;
  // From contributed query
  myContribution?: number;
  lastContributionTime?: string | null;
}

export function mapDrop(d: ServerDrop): Drop & { myContribution?: number } {
  const tags = typeof d.tags === 'string' ? JSON.parse(d.tags) : (d.tags || []);
  const creatorName = String(d.creatorName || '').trim() || String(d.creatorId || '').trim() || 'Unknown';
  return {
    id: d.id,
    title: d.title,
    description: d.description || '',
    creatorId: d.creatorId,
    creatorName: d.creatorName || creatorName,
    creatorAvatar: d.creatorAvatar || `https://i.pravatar.cc/150?u=${d.creatorId}`,
    trailerUrl: d.trailerUrl || '',
    thumbnailUrl: d.thumbnailUrl || '',
    fileType: d.fileType,
    fileSize: d.fileSize ? formatBytes(d.fileSize) : '0 B',
    fileSizeBytes: d.fileSize ?? null,
    filePath: d.filePath ?? null,
    originalFileName: d.originalFileName ?? null,
    mimeType: d.mimeType ?? null,
    link: d.link ?? null,
    scheduledDropTime: new Date(d.scheduledDropTime).getTime(),
    actualDropTime: d.actualDropTime ? new Date(d.actualDropTime).getTime() : null,
    fuseTime: d.fusetime != null
      ? Number(d.fusetime)
      : Math.max(0, new Date(d.scheduledDropTime).getTime() - new Date(d.created_at).getTime()),
    createdAt: new Date(d.created_at).getTime(),
    expiresAt: new Date(d.expiresAt).getTime(),
    goalAmount: d.goalAmount,
    currentContributions: d.currentContributions,
    contributorCount: d.contributorCount,
    momentum: d.momentum,
    burnRate: d.burnRate,
    lastMomentumUpdate: d.lastMomentumUpdate ?? null,
    sensitivity: d.sensitivity ?? 5,
    decayConstant: d.decayConstant ?? 0.0003,
    basePrice: d.basePrice,
    dailyPriceDecayPct: Number(d.dailyPriceDecayPct ?? 5),
    volumeDecayStep: d.volumeDecayStep ?? 1000,
    volumeDecayPct: Number(d.volumeDecayPct ?? 5),
    totalDownloads: d.totalDownloads,
    totalRevenue: d.totalRevenue ?? 0,
    avgRating: d.avgRating != null ? Number(d.avgRating) : null,
    reviewCount: d.reviewCount ?? 0,
    likeCount: d.likeCount ?? 0,
    dislikeCount: d.dislikeCount ?? 0,
    views: d.views ?? 0,
    flagCount: d.flagCount ?? 0,
    mature: Boolean(d.mature ?? 0),
    status: d.status,
    isPublic: Boolean(d.isPublic),
    tags,
    myContribution: d.myContribution,
    lastContributionTime: d.lastContributionTime ? new Date(d.lastContributionTime).getTime() : undefined,
    expiryBehaviour: d.expiry_behaviour ?? 'refund',
    expiryThreshold: d.expiry_threshold ?? null,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// ── Dashboard hook ─────────────────────────────────────────

interface DashboardStats {
  totalContributed: number;
  dropsContributedTo: number;
  totalEarned: number;
  totalMyDrops: number;
  totalFavorites: number;
}

interface DashboardData {
  myDrops: Drop[];
  contributed: (Drop & { myContribution?: number })[];
  stats: DashboardStats;
}

interface DashboardResponse {
  user: { id: string; username: string; email: string; credits: number; profilePicture: string; accountType: string };
  myDrops: ServerDrop[];
  contributed: ServerDrop[];
  stats: DashboardStats;
}

interface DashboardCreatorProfile {
  id: string;
  username?: string;
  profilePicture?: string;
}

export function useDashboard() {
  const { isAuthenticated, updateBalance } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Keep a stable ref to updateBalance so it doesn't need to be a useCallback dep
  const updateBalanceRef = useRef(updateBalance);
  useEffect(() => { updateBalanceRef.current = updateBalance; });

  const fetch = useCallback(async () => {
    if (!isAuthenticated) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardResponse>('/api/dashboard');

      const allDrops = [...(res.myDrops || []), ...(res.contributed || [])];
      const missingCreatorIds = Array.from(new Set(
        allDrops
          .filter((drop) => {
            const rawName = String(drop.creatorName || '').trim();
            const creatorId = String(drop.creatorId || '').trim();
            return !rawName || rawName === creatorId;
          })
          .map((drop) => String(drop.creatorId || '').trim())
          .filter(Boolean)
      ));

      const creatorById = new Map<string, { username?: string; profilePicture?: string }>();
      if (missingCreatorIds.length) {
        const creatorLookups = await Promise.all(
          missingCreatorIds.map(async (creatorId) => {
            try {
              const profile = await api.get<DashboardCreatorProfile>(`/api/users/${encodeURIComponent(creatorId)}`);
              return [creatorId, profile] as const;
            } catch {
              return [creatorId, null] as const;
            }
          })
        );

        creatorLookups.forEach(([creatorId, profile]) => {
          if (!profile) return;
          creatorById.set(creatorId, {
            username: String(profile.username || '').trim() || undefined,
            profilePicture: String(profile.profilePicture || '').trim() || undefined,
          });
        });
      }

      const withCreatorProfile = (drop: ServerDrop): ServerDrop => {
        const creatorId = String(drop.creatorId || '').trim();
        const creator = creatorById.get(creatorId);
        const currentName = String(drop.creatorName || '').trim();
        const currentAvatar = String(drop.creatorAvatar || '').trim();
        return {
          ...drop,
          creatorName: currentName && currentName !== creatorId
            ? currentName
            : (creator?.username || currentName || creatorId),
          creatorAvatar: currentAvatar || creator?.profilePicture || drop.creatorAvatar,
        };
      };

      setData({
        myDrops: res.myDrops.map(withCreatorProfile).map(mapDrop),
        contributed: res.contributed.map(withCreatorProfile).map(mapDrop),
        stats: res.stats,
      });
      // Sync credit balance from dashboard response without triggering a re-fetch loop
      if (res.user?.credits != null) {
        updateBalanceRef.current(res.user.credits);
      }
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]); // refreshUser intentionally excluded — would cause infinite loop

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Contribution history hook ──────────────────────────────

export interface HistoryEntry {
  id: string;
  dropId: string;
  dropTitle: string;
  dropStatus: string;
  amount: number;
  penaltyAmount: number;
  isRefunded: boolean;
  timestamp: number;
  kind: 'contribution' | 'stall';
  stallMinutes?: number;
}

interface HistoryResponse {
  history: {
    id: string;
    dropId: string;
    amount: number;
    penaltyAmount: number;
    isRefunded: number;
    created_at: string;
    dropTitle: string;
    dropStatus: string;
  }[];
  total: number;
  totalSpent: number;
}

export function useContributionHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await api.get<HistoryResponse>('/api/contributions/history');
        if (cancelled) return;
        setEntries(res.history.map(h => ({
          id: h.id,
          dropId: h.dropId,
          dropTitle: h.dropTitle,
          dropStatus: h.dropStatus,
          amount: h.amount,
          penaltyAmount: h.penaltyAmount,
          isRefunded: !!h.isRefunded,
          timestamp: new Date(h.created_at).getTime(),
          kind: 'contribution' as const,
        })));
        setTotalSpent(res.totalSpent);
      } catch {
        if (!cancelled) setError('Failed to load history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, totalSpent, loading, error };
}

// ── Stall action history hook ──────────────────────────────

interface StallHistoryResponse {
  history: {
    id: string;
    dropId: string;
    stallMinutes: number;
    creditCost: number;
    balanceAfter: number;
    created_at: string;
    dropTitle: string;
    dropStatus: string;
  }[];
  total: number;
}

export function useStallHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<StallHistoryResponse>('/api/stall-actions/history');
        if (cancelled) return;
        setEntries(res.history.map(h => ({
          id: h.id,
          dropId: h.dropId,
          dropTitle: h.dropTitle,
          dropStatus: h.dropStatus,
          amount: h.creditCost,
          penaltyAmount: 0,
          isRefunded: false,
          timestamp: new Date(h.created_at).getTime(),
          kind: 'stall' as const,
          stallMinutes: h.stallMinutes,
        })));
      } catch { /* table may not exist yet */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, loading };
}

// ── Credit purchase history hook ───────────────────────────

export interface PurchaseEntry {
  id: string;
  credits: number;
  amountPaid: number;
  currency: string;
  paymentMethod: string;
  status: string;
  txHash: string | null;
  timestamp: number;
}

interface PurchasesResponse {
  purchases: {
    id: string;
    credits: number | string | null;
    amountPaid: number | string | null;
    currency: string;
    paymentMethod: string;
    status: string;
    txHash: string | null;
    created_at: string;
  }[];
}

export function usePurchaseHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<PurchaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<PurchasesResponse>('/api/history/purchases');
        if (cancelled) return;
        setEntries(res.purchases.map(p => ({
          id: p.id,
          credits: Number.isFinite(Number(p.credits)) ? Number(p.credits) : 0,
          amountPaid: Number.isFinite(Number(p.amountPaid)) ? Number(p.amountPaid) : 0,
          currency: p.currency || 'USD',
          paymentMethod: p.paymentMethod,
          status: p.status,
          txHash: p.txHash,
          timestamp: new Date(p.created_at).getTime(),
        })));
      } catch {
        if (!cancelled) setError('Failed to load purchase history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, loading, error };
}

// ── Download history hook ──────────────────────────────────

export interface DownloadEntry {
  id: string;
  dropId: string;
  dropTitle: string;
  pricePaid: number;
  basePrice: number;
  contributorDiscount: number;
  timeDecayDiscount: number;
  volumeDecayDiscount: number;
  downloadNumber: number;
  timestamp: number;
}

interface DownloadsResponse {
  downloads: {
    id: string;
    dropId: string;
    dropTitle: string;
    pricePaid: number;
    basePrice: number;
    contributorDiscount: number;
    timeDecayDiscount: number;
    volumeDecayDiscount: number;
    downloadNumber: number;
    created_at: string;
  }[];
}

export function useDownloadHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<DownloadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<DownloadsResponse>('/api/history/downloads');
        if (cancelled) return;
        setEntries(res.downloads.map(d => ({
          id: d.id,
          dropId: d.dropId,
          dropTitle: d.dropTitle,
          pricePaid: d.pricePaid,
          basePrice: d.basePrice,
          contributorDiscount: d.contributorDiscount,
          timeDecayDiscount: d.timeDecayDiscount,
          volumeDecayDiscount: d.volumeDecayDiscount,
          downloadNumber: d.downloadNumber,
          timestamp: new Date(d.created_at).getTime(),
        })));
      } catch {
        if (!cancelled) setError('Failed to load download history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, loading, error };
}

// ── Subscription history hook ────────────────────────────────

export interface SubscriptionEntry {
  id: string;
  plan: string;
  planName: string;
  amount: number;
  billingPeriod: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  timestamp: number;
}

interface SubscriptionsResponse {
  subscriptions: {
    id: string;
    plan: string;
    current_period_start: string | null;
    current_period_end: string | null;
    status: string;
    created_at: string;
  }[];
  activePlan: string | null;
}

export function useSubscriptionHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<SubscriptionEntry[]>([]);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<SubscriptionsResponse>('/api/history/subscriptions');
        if (cancelled) return;
        setEntries(res.subscriptions.map(m => {
          const planLower = (m.plan || '').toLowerCase();
          const amount = planLower === 'standard' ? 10000 : planLower === 'premium' ? 20000 : 0;
          const periodStart = m.current_period_start ? new Date(m.current_period_start).getTime() : 0;
          const periodEnd = m.current_period_end ? new Date(m.current_period_end).getTime() : 0;
          const billingPeriod = periodStart && periodEnd
            ? `${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}`
            : 'N/A';
          
          return {
            id: m.id,
            plan: planLower,
            planName: m.plan || 'Unknown',
            amount,
            billingPeriod,
            status: m.status,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            timestamp: new Date(m.created_at).getTime(),
          };
        }));
        setActivePlan(res.activePlan);
      } catch {
        if (!cancelled) setError('Failed to load subscription history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, activePlan, loading, error };
}

// ── Earnings history hook ──────────────────────────────────

export interface EarningsEntry {
  id: string;
  dropId: string | null;
  dropTitle: string | null;
  amount: number;
  balanceAfter: number;
  description: string | null;
  timestamp: number;
}

interface EarningsResponse {
  earnings: {
    id: string;
    relatedDropId: string | null;
    dropTitle: string | null;
    amount: number;
    balanceAfter: number;
    description: string | null;
    created_at: string;
  }[];
  totalEarned: number;
}

export interface PromoChargeEntry {
  id: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  timestamp: number;
}

interface PromoChargesResponse {
  charges: {
    id: string;
    amount: number;
    balanceAfter: number;
    description: string | null;
    created_at: string;
  }[];
  totalCharged: number;
}

export function useEarningsHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<EarningsEntry[]>([]);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<EarningsResponse>('/api/history/earnings');
        if (cancelled) return;
        setEntries(res.earnings.map(e => ({
          id: e.id,
          dropId: e.relatedDropId,
          dropTitle: e.dropTitle || 'Unknown Drop',
          amount: e.amount,
          balanceAfter: e.balanceAfter,
          description: e.description,
          timestamp: new Date(e.created_at).getTime(),
        })));
        setTotalEarned(res.totalEarned);
      } catch {
        if (!cancelled) setError('Failed to load earnings history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, totalEarned, loading, error };
}

export function usePromoChargeHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<PromoChargeEntry[]>([]);
  const [totalCharged, setTotalCharged] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<PromoChargesResponse>('/api/history/promo-charges');
        if (cancelled) return;
        setEntries(res.charges.map(c => ({
          id: c.id,
          amount: c.amount,
          balanceAfter: c.balanceAfter,
          description: c.description,
          timestamp: new Date(c.created_at).getTime(),
        })));
        setTotalCharged(res.totalCharged);
      } catch {
        if (!cancelled) setError('Failed to load promo charge history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, totalCharged, loading, error };
}
