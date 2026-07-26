import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';
import { Flame, Tag, HardDrive, Users, Star, ArrowRight, CheckCircle2, Download, Percent } from 'lucide-react';

interface PricePreview {
  basePrice: number;
  totalDiscountPct: number;
  finalPrice: number;
  isFree: boolean;
}

export default function DropPublicInfo() {
  const { id } = useParams<{ id: string }>();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [drop, setDrop] = useState<Drop | null>(null);
  const [pricePreview, setPricePreview] = useState<PricePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<ServerDrop>(`/api/drops/${id}`)
        .then((raw) => setDrop(mapDrop(raw)))
        .catch(() => setNotFound(true)),
      api.get<PricePreview>(`/api/drops/${id}/price-preview`)
        .then((p) => setPricePreview(p))
        .catch(() => { }),
    ]).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading…</p>
      </div>
    );
  }

  if (!drop || notFound) {
    return (
      <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center gap-4">
        <p className="text-[#94a3b8]">Drop not found.</p>
        <Link to="/explore" className="text-orange-400 underline text-sm">Browse drops</Link>
      </div>
    );
  }

  const thumbnailUrl = drop.thumbnailUrl
    ? (/^https?:\/\//i.test(drop.thumbnailUrl) ? drop.thumbnailUrl : `${API_BASE}${drop.thumbnailUrl}`)
    : `https://picsum.photos/seed/${drop.id}/1280/400`;

  const creatorAvatar = drop.creatorAvatar
    ? (/^https?:\/\//i.test(drop.creatorAvatar) ? drop.creatorAvatar : `${API_BASE}${drop.creatorAvatar}`)
    : null;

  const finalPrice = pricePreview?.finalPrice ?? drop.basePrice;
  const discountPct = pricePreview?.totalDiscountPct ?? 0;

  return (
    <div className="min-h-screen bg-[#111827] text-[#e2e8f0]">
      {/* Nav */}
      {/* <nav className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur border-b border-[#35354d]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-orange-500 font-bold text-xl">
            <Flame className="w-6 h-6" />
            Drauwper
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-[#94a3b8] hover:text-white transition">
              Sign In
            </Link>
            <Link
              to="/register"
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-orange-500/20"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav> */}

      {/* Banner */}
      <div className="w-full h-52 overflow-hidden relative">
        <img src={thumbnailUrl} alt={drop.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111827]/80 to-transparent" />
        <div className="absolute bottom-4 left-6">
          <span className="inline-flex items-center gap-1.5 bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" /> Available Now
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Title + creator */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">{drop.title}</h1>
            <div className="flex items-center gap-3 text-sm text-[#94a3b8] flex-wrap">
              {/* <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#2a2a3e] border border-[#35354d] flex items-center justify-center text-xs font-bold text-orange-400 overflow-hidden shrink-0">
                  {creatorAvatar
                    ? <img src={creatorAvatar} alt={drop.creatorName} className="w-full h-full object-cover" />
                    : drop.creatorName[0].toUpperCase()
                  }
                </div>
                <span className="text-white font-medium">{drop.creatorName}</span>
              </div> */}
              <Link
                to={`/user/${drop.creatorId}`}
                className="flex items-center gap-2 hover:text-brand transition no-underline"
              >
                <div className="w-7 h-7 rounded-full bg-surface-3 border border-surface-3 flex items-center justify-center text-xs font-bold text-brand overflow-hidden shrink-0">
                  {creatorAvatar
                    ? <img src={creatorAvatar}  alt={drop.creatorName} className="w-full h-full object-cover" />
                    : drop.creatorName[0].toUpperCase()
                  }
                </div>
                <span>{drop.creatorName}</span>
              </Link>
              <span className="flex items-center gap-1"><HardDrive className="w-4 h-4" /> {drop.fileSize}</span>
              <span className="flex items-center gap-1"><Tag className="w-4 h-4" /> {drop.fileType}</span>
            </div>
          </div>
          {drop.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap shrink-0">
              {drop.tags.map((t) => (
                <span key={t} className="bg-[#1e1e2e] text-[#94a3b8] text-xs px-2 py-0.5 rounded-full border border-[#35354d]">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-[#94a3b8] leading-relaxed">{drop.description}</p>

        {/* Price + stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Price card */}
          <div className="bg-[#1e1e2e] border border-[#35354d] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Download Price</h3>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-extrabold text-white font-mono">
                {finalPrice.toLocaleString()}
                <span className="text-lg text-[#94a3b8] font-normal ml-1">credits</span>
              </p>
              {discountPct > 0 && (
                <span className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold px-2 py-1 rounded-lg mb-1">
                  <Percent className="w-3 h-3" /> -{discountPct.toFixed(0)}% off
                </span>
              )}
            </div>
            {discountPct > 0 && (
              <p className="text-xs text-[#94a3b8]">
                Base price: <span className="line-through">{drop.basePrice.toLocaleString()} cr</span>
                <span className="text-[#64748b] ml-1">— discounts applied automatically when signed in</span>
              </p>
            )}
            <div className="border-t border-[#35354d] pt-4 text-xs text-[#94a3b8] space-y-1.5">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> Contributor discounts for community burners</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> Time decay — price drops daily</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> Instant secure download after purchase</div>
            </div>
          </div>

          {/* Stats card */}
          <div className="bg-[#1e1e2e] border border-[#35354d] rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wider">Drop Stats</h3>
            <div className="space-y-3">
              {[
                { icon: <Users className="w-4 h-4 text-orange-400" />, label: 'Contributors', value: drop.contributorCount.toLocaleString() },
                { icon: <Flame className="w-4 h-4 text-orange-400" />, label: 'Credits Burned', value: drop.currentContributions.toLocaleString() },
                { icon: <Star className="w-4 h-4 text-orange-400" />, label: 'Avg Rating', value: drop.avgRating ? `${drop.avgRating}%` : '—' },
                // { icon: <Download className="w-4 h-4 text-green-400" />, label: 'Downloads', value: drop.downloadCount?.toLocaleString() ?? '—' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94a3b8] text-sm">
                    {s.icon} {s.label}
                  </div>
                  <span className="text-white font-semibold font-mono text-sm">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6 text-center">
          <Download className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Ready to Download?</h2>
          <p className="text-[#94a3b8] mb-6 text-sm">
            Sign in to purchase and download <span className="font-semibold text-white">"{drop.title}"</span>.
            Your contributor discount will be applied automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to={`/login?redirect=/drop/${drop.id}/download`}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg"
            >
              Sign In to Download <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={`/register?redirect=/drop/${drop.id}/download`}
              className="flex items-center gap-2 border border-[#35354d] hover:border-green-500/40 text-[#e2e8f0] font-semibold px-6 py-3 rounded-xl transition"
            >
              Get Started Free
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
