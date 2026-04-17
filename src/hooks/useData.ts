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
  originalFileName: string | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  tags: string | string[] | null;
  scheduledDropTime: string;
  actualDropTime: string | null;
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
  dailyPriceDecayPct: number | string;
  volumeDecayStep: number;
  volumeDecayPct: number | string;
  totalDownloads: number;
  totalRevenue: number;
  avgRating: number | string | null;
  reviewCount: number;
  likeCount: number;
  dislikeCount: number;
  status: Drop['status'];
  isPublic: number | boolean;
  created_at: string;
  updated_at?: string;
  // Joined fields from /api/dashboard
  creatorName?: string;
  creatorAvatar?: string;
  // From contributed query
  myContribution?: number;
  lastContributionTime?: string | null;
}

export function mapDrop(d: ServerDrop): Drop & { myContribution?: number } {
  const tags = typeof d.tags === 'string' ? JSON.parse(d.tags) : (d.tags || []);
  return {
    id: d.id,
    title: d.title,
    description: d.description || '',
    creatorId: d.creatorId,
    creatorName: d.creatorName || 'Unknown',
    creatorAvatar: d.creatorAvatar || `https://i.pravatar.cc/150?u=${d.creatorId}`,
    trailerUrl: d.trailerUrl || '',
    thumbnailUrl: d.thumbnailUrl || '',
    fileType: d.fileType,
    fileSize: d.fileSize ? formatBytes(d.fileSize) : '0 B',
    fileSizeBytes: d.fileSize ?? null,
    filePath: d.filePath ?? null,
    originalFileName: d.originalFileName ?? null,
    mimeType: d.mimeType ?? null,
    scheduledDropTime: new Date(d.scheduledDropTime).getTime(),
    actualDropTime: d.actualDropTime ? new Date(d.actualDropTime).getTime() : null,
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
    status: d.status,
    isPublic: Boolean(d.isPublic),
    tags,
    myContribution: d.myContribution,
    lastContributionTime: d.lastContributionTime ? new Date(d.lastContributionTime).getTime() : undefined,
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
      setData({
        myDrops: res.myDrops.map(mapDrop),
        contributed: res.contributed.map(mapDrop),
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
    credits: number;
    amountPaid: number;
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
          credits: p.credits,
          amountPaid: p.amountPaid,
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

// ── Membership history hook ────────────────────────────────

export interface MembershipEntry {
  id: string;
  plan: 'standard' | 'premium';
  amount: number;
  billingPeriod: string;
  status: string;
  timestamp: number;
}

interface MembershipsResponse {
  memberships: {
    id: string;
    plan: 'standard' | 'premium';
    amount: number;
    billingPeriod: string;
    status: string;
    created_at: string;
  }[];
  activePlan: string | null;
}

export function useMembershipHistory() {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<MembershipEntry[]>([]);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<MembershipsResponse>('/api/history/memberships');
        if (cancelled) return;
        setEntries(res.memberships.map(m => ({
          id: m.id,
          plan: m.plan,
          amount: m.amount,
          billingPeriod: m.billingPeriod,
          status: m.status,
          timestamp: new Date(m.created_at).getTime(),
        })));
        setActivePlan(res.activePlan);
      } catch {
        if (!cancelled) setError('Failed to load membership history');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  return { entries, activePlan, loading, error };
}
