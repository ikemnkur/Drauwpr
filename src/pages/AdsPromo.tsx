import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, PlusCircle, Download, Trash2, Eye, MousePointerClick, ThumbsUp, MinusCircle, ThumbsDown } from 'lucide-react';
import { api } from '../lib/api';

type PromoItem = {
  id: string;
  submissionType: 'ad' | 'drop_sponsorship';
  mediaType: string;
  title: string;
  description: string | null;
  targetDropId: string | null;
  status: string;
  budgetUsd: number;
  impressions: number;
  clicks: number;
  likes: number;
  neutrals: number;
  dislikes: number;
  tags: string | null;
  created_at: string;
  ctrPct: number;
};

type Summary = {
  total: number;
  ads: number;
  sponsorships: number;
  impressions: number;
  clicks: number;
  likes: number;
  neutrals: number;
  dislikes: number;
  ctrPct: number;
};

export default function AdsPromo() {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await api.get<{ summary: Summary; items: PromoItem[] }>('/api/promo-submissions/me');
      setItems(res.items || []);
      setSummary(res.summary || null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const totals = useMemo(() => summary || {
    total: 0,
    ads: 0,
    sponsorships: 0,
    impressions: 0,
    clicks: 0,
    likes: 0,
    neutrals: 0,
    dislikes: 0,
    ctrPct: 0,
  }, [summary]);

  async function removeItem(id: string) {
    await api.delete(`/api/promo-submissions/${id}`);
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function exportStats() {
    const base = import.meta.env.VITE_API_URL || '';
    window.open(`${base}/api/promo-submissions/me/export`, '_blank');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="bg-surface border border-surface-3 rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Ads & Sponsorship Performance</h1>
              <p className="text-text-muted">Track impressions, clicks, reactions, and performance for your promo items.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/promo/create-ad" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand text-white no-underline hover:bg-brand-dark">
              <PlusCircle className="w-4 h-4" /> Create New Ad
            </Link>
            <Link to="/promo/sponsor-drop" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 text-text no-underline hover:bg-surface-3 border border-surface-3">
              <PlusCircle className="w-4 h-4" /> Sponsor Your Drop
            </Link>
            <button onClick={exportStats} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 text-text hover:bg-surface-3 border border-surface-3">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Items" value={totals.total} />
        <StatCard label="Impressions" value={totals.impressions} icon={<Eye className="w-4 h-4" />} />
        <StatCard label="Clicks" value={totals.clicks} icon={<MousePointerClick className="w-4 h-4" />} />
        <StatCard label="CTR" value={`${totals.ctrPct}%`} />
        <StatCard label="Likes" value={totals.likes} icon={<ThumbsUp className="w-4 h-4" />} />
      </section>

      <section className="bg-surface border border-surface-3 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-text-muted text-center py-10">Loading performance...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-10">No promo items submitted yet.</p>
        ) : (
          <div className="divide-y divide-surface-3">
            {items.map((item) => (
              <div key={item.id} className="p-4 md:p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">{item.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">{item.submissionType === 'ad' ? 'Ad' : 'Drop Sponsorship'} • {item.status}</p>
                    {item.description && <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.description}</p>}
                  </div>
                  <button
                    onClick={() => void removeItem(item.id)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
                  <Metric label="Impressions" value={item.impressions} />
                  <Metric label="Clicks" value={item.clicks} />
                  <Metric label="CTR" value={`${item.ctrPct}%`} />
                  <Metric label="Likes" value={item.likes} icon={<ThumbsUp className="w-3.5 h-3.5" />} />
                  <Metric label="Neutral" value={item.neutrals} icon={<MinusCircle className="w-3.5 h-3.5" />} />
                  <Metric label="Dislikes" value={item.dislikes} icon={<ThumbsDown className="w-3.5 h-3.5" />} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface border border-surface-3 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-text">{value}</p>
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-2 rounded-lg p-2">
      <div className="flex items-center gap-1 text-text-muted mb-0.5">{icon}<span>{label}</span></div>
      <p className="text-text font-semibold">{value}</p>
    </div>
  );
}
