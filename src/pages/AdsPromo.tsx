import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, PlusCircle, Download, Trash2, Eye, MousePointerClick, ThumbsUp, MinusCircle, ThumbsDown, PauseCircle, PlayCircle } from 'lucide-react';
import { api } from '../lib/api';
import PromotionModal, { type SponsoredPromo } from '../components/PromotionModal';

type PromoItem = {
  id: string;
  submissionType: 'ad' | 'drop_sponsorship' | 'post_sponsorship';
  mediaType: string;
  title: string;
  description: string | null;
  targetPostId: string | null;
  target_url?: string | null;
  ctaText?: string | null;
  mediaUrl?: string | null;
  assetPath?: string | null;
  thumbnailPath?: string | null;
  thumbnailImg?: string | null;
  username?: string | null;
  status: string;
  budgetCredits: number;
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
  const [busyById, setBusyById] = useState<Record<string, boolean>>({});
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activePreviewAd, setActivePreviewAd] = useState<SponsoredPromo | null>(null);

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

  async function removeItem(item: PromoItem) {
    const confirmed = window.confirm(`Delete "${item.title}"? This action cannot be undone.`);
    if (!confirmed) return;

    setBusyById((prev) => ({ ...prev, [item.id]: true }));
    try {
      await api.delete(`/api/promo-submissions/${item.id}`);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } finally {
      setBusyById((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  function getPreviewUrl(item: PromoItem): string | null {
    const base = import.meta.env.VITE_API_URL || '';
    if (item.submissionType === 'ad') {
      const t = String(item.target_url || '').trim();
      return t || null;
    }
    const t = String(item.targetPostId || '').trim();
    if (!t) return null;
    if (/^https?:\/\//i.test(t)) return t;
    if (t.startsWith('/')) return `${base}${t}`;
    if (t.includes('/post/')) return `${base}/${t.replace(/^\/+/, '')}`;
    return `${base}/post/${encodeURIComponent(t)}`;
  }

  function resolveAssetUrl(pathOrUrl: string | null, fallbackUrl: string | null): string {
    const apiBase = import.meta.env.VITE_API_URL || '';
    const raw = (pathOrUrl || fallbackUrl || '').trim();
    if (!raw) return 'https://picsum.photos/seed/promo-preview/900/520';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return `${apiBase}${raw}`;
    return `${apiBase}/${raw}`;
  }

  function detectMediaKind(assetPath: string | null, mediaUrl: string | null, mediaType: string | null | undefined): 'image' | 'video' | 'audio' {
    if (mediaType) {
      if (/^video/i.test(mediaType)) return 'video';
      if (/^audio/i.test(mediaType)) return 'audio';
      if (/^image/i.test(mediaType)) return 'image';
    }
    const url = (assetPath || mediaUrl || '').toLowerCase().split('?')[0];
    if (!url) return 'image';
    if (/youtube\.com|youtu\.be|vimeo\.com/.test(url)) return 'video';
    if (/\.(mp4|webm|mov|avi|mkv)$/.test(url)) return 'video';
    if (/\.(mp3|wav|ogg|aac|flac|m4a)$/.test(url)) return 'audio';
    return 'image';
  }

  function toEmbedUrl(url: string): string | null {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
    if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    return null;
  }

  function mapItemToSponsoredPromo(item: PromoItem): SponsoredPromo {
    return {
      id: item.id,
      username: item.username || null,
      submissionType: item.submissionType === 'ad' ? 'ad' : 'post_sponsorship',
      title: item.title,
      description: item.description,
      targetPostId: String(item.targetPostId || ''),
      target_url: item.target_url || null,
      ctaText: item.ctaText || null,
      mediaUrl: item.mediaUrl || null,
      assetPath: item.assetPath || null,
      thumbnailPath: item.thumbnailPath || null,
      thumbnailImg: item.thumbnailImg || null,
      mediaType: item.mediaType || null,
    };
  }

  function openPreview(item: PromoItem) {
    setActivePreviewAd(mapItemToSponsoredPromo(item));
    setShowPreviewModal(true);
  }

  function closePreview() {
    setShowPreviewModal(false);
    setActivePreviewAd(null);
  }

  function handlePreviewPrimaryAction() {
    if (!activePreviewAd) return;
    const source: PromoItem = {
      id: activePreviewAd.id,
      submissionType: activePreviewAd.submissionType === 'ad' ? 'ad' : 'post_sponsorship',
      mediaType: activePreviewAd.mediaType || 'image',
      title: activePreviewAd.title,
      description: activePreviewAd.description,
      targetPostId: activePreviewAd.targetPostId || null,
      target_url: activePreviewAd.target_url || null,
      status: 'approved',
      budgetCredits: 0,
      impressions: 0,
      clicks: 0,
      likes: 0,
      neutrals: 0,
      dislikes: 0,
      tags: null,
      created_at: '',
      ctrPct: 0,
    };
    const target = getPreviewUrl(source);
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  }

  async function togglePause(item: PromoItem) {
    const status = String(item.status || '').toLowerCase();
    const shouldPause = status === 'approved';
    if (!shouldPause && status !== 'paused') return;

    setBusyById((prev) => ({ ...prev, [item.id]: true }));
    try {
      const res = await api.patch<{ success: boolean; status: string }>(`/api/promo-submissions/${item.id}/pause`, { paused: shouldPause });
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, status: res.status || x.status } : x)));
    } finally {
      setBusyById((prev) => ({ ...prev, [item.id]: false }));
    }
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
              <PlusCircle className="w-4 h-4" /> New Ad
            </Link>
            <Link to="/promo/sponsor-drop" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-2 text-text no-underline hover:bg-surface-3 border border-surface-3">
              <PlusCircle className="w-4 h-4" /> Sponsor Post
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
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button
                      onClick={() => openPreview(item)}
                      disabled={!getPreviewUrl(item) || busyById[item.id]}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-text hover:bg-surface-3 border border-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>

                    <button
                      onClick={() => void togglePause(item)}
                      disabled={!['approved', 'paused'].includes(String(item.status || '').toLowerCase()) || busyById[item.id]}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-warning/10 text-warning hover:bg-warning/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {String(item.status || '').toLowerCase() === 'paused' ? (
                        <>
                          <PlayCircle className="w-3.5 h-3.5" /> Resume
                        </>
                      ) : (
                        <>
                          <PauseCircle className="w-3.5 h-3.5" /> Pause
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => void removeItem(item)}
                      disabled={busyById[item.id]}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
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

      <PromotionModal
        open={showPreviewModal}
        ad={activePreviewAd}
        countdown={0}
        variant={activePreviewAd?.submissionType === 'ad' ? 'ad' : 'post_sponsorship'}
        onClose={closePreview}
        onPrimaryAction={handlePreviewPrimaryAction}
        resolveAssetUrl={resolveAssetUrl}
        detectMediaKind={detectMediaKind}
        toEmbedUrl={toEmbedUrl}
        primaryLabel={activePreviewAd?.ctaText || (activePreviewAd?.submissionType === 'ad' ? 'Visit Site' : 'View Post')}
        fallbackImageAlt="Promotion preview"
      />
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
