import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';
import { Flame, Tag, HardDrive, ArrowRight, CheckCircle2 } from 'lucide-react';
import AnalogClock from '../components/AnalogClock';
import { useFuseCountdown } from '../hooks/useFuseCountdown';

export default function DropPublicView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_URL || '';
  const [drop, setDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<ServerDrop>(`/api/drops/${id}`)
      .then((raw) => setDrop(mapDrop(raw)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const fuseTimeMs = useFuseCountdown(
    drop?.fuseTime ?? (drop ? Math.max(0, drop.scheduledDropTime - drop.createdAt) : 0),
    drop?.burnRate ?? 1,
    Boolean(drop && drop.status !== 'dropped')
  );
  const goalNotMet = drop ? drop.currentContributions < drop.goalAmount : false;
  const remainingSeconds = drop
    ? (goalNotMet
      ? Math.max(0, (drop.expiresAt - Date.now()) / 1000)
      : fuseTimeMs / 1000)
    : 0;

  useEffect(() => {
    if (!drop || redirectedRef.current) return;
    // console.log('Checking if drop is already released:', drop," fuseTimeMs:", fuseTimeMs);
    const alreadyReleased = drop.status === 'dropped' || drop.fuseTime === 0;
    if (alreadyReleased) {
      redirectedRef.current = true;
      navigate(`/drop/${id}/info`, { replace: true });
    }
  }, [drop, fuseTimeMs, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111827] flex items-center justify-center">
        <p className="text-[#94a3b8]">Loading drop…</p>
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

  const isReleased = drop.status === 'dropped' || fuseTimeMs <= 0;
  const goalPct = Math.min(100, (drop.currentContributions / drop.goalAmount) * 100);
  const dropDate = new Date(drop.scheduledDropTime);
  const dropExpiryDate = new Date(drop.expiresAt);
  const calYear = dropDate.getFullYear();
  const calMonth = dropDate.getMonth();
  const calDropDay = dropDate.getDate();
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDays = new Date(calYear, calMonth + 1, 0).getDate();
  const calMonthLabel = dropDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayDate = new Date();
  const isSameMonth = todayDate.getMonth() === calMonth && todayDate.getFullYear() === calYear;
  const todayDay = isSameMonth ? todayDate.getDate() : -1;

  const thumbnailUrl = drop.thumbnailUrl
    ? (/^https?:\/\//i.test(drop.thumbnailUrl) ? drop.thumbnailUrl : `${API_BASE}${drop.thumbnailUrl}`)
    : `https://picsum.photos/seed/${drop.id}/1280/400`;

  return (
    <div className="min-h-screen bg-[#111827] text-[#e2e8f0]">
      <div className="w-full h-52 overflow-hidden">
        <img src={thumbnailUrl} alt={drop.title} className="w-full h-full object-cover" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            {isReleased ? (
              <span className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" /> Released — Available to Download
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                <Flame className="w-3.5 h-3.5" /> Drop in Progress
              </span>
            )}
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
                  {drop.creatorAvatar
                    ? <img src={drop.creatorAvatar} alt={drop.creatorName} className="w-full h-full object-cover" />
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

        <p className="text-[#94a3b8] leading-relaxed">{drop.description}</p>

        <div className="bg-[#1e1e2e] border border-[#35354d] rounded-2xl p-5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#94a3b8]">Community Progress</span>
            <span className="text-white font-semibold">{goalPct.toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-[#2a2a3e] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-xs text-[#94a3b8] mt-2">
            {drop.currentContributions.toLocaleString()} / {drop.goalAmount.toLocaleString()} credits burned
          </p>
        </div>

        <div className="bg-[#1e1e2e] border border-[#35354d] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <AnalogClock
              remainingSeconds={remainingSeconds}
              size={180}
              label={goalNotMet ? 'Countdown to expiry' : 'Time left (to burn) until drop'}
              notice={goalNotMet ? 'Countdown for the Drop starts after the goal is 100% met' : undefined}
            />
            {isReleased && (
              <span className="text-xs text-green-400 font-semibold bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full">
                🎉 Dropped!
              </span>
            )}
          </div>

          <div className="flex flex-col items-center shrink-0 gap-1 border-2 border-[#35354d] rounded-2xl p-3">
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-widest mb-1">{calMonthLabel}</p>
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="w-6 h-6 flex items-center justify-center text-[9px] font-bold text-[#94a3b8]">{d}</div>
              ))}
              {Array.from({ length: calFirstDay }).map((_, i) => (
                <div key={`blank-${i}`} className="w-6 h-6" />
              ))}
              {Array.from({ length: calDays }, (_, i) => i + 1).map((day) => {
                const isDropDay = day === calDropDay;
                const isToday = day === todayDay;
                return (
                  <div
                    key={day}
                    className={[
                      'w-6 h-6 flex items-center justify-center rounded-lg text-[11px] font-mono transition',
                      isDropDay
                        ? 'bg-orange-500 text-white font-bold ring-2 ring-orange-500/40 scale-110'
                        : isToday
                          ? 'bg-[#2a2a3e] text-white font-semibold'
                          : 'text-[#94a3b8]',
                    ].join(' ')}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "1rem" }}>

              <div className="mt-2 text-center border-2 border-orange-500/40 rounded-xl px-3 py-1.5">
                <p className="text-xs font-bold text-orange-400">
                  🔥 {dropDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">
                  {isReleased ? 'drop date' : 'possible drop on'}
                </p>
              </div>
              <div className="mt-2 text-center border-2 border-red-500/40 rounded-xl px-3 py-1.5">
                <p className="text-xs font-bold text-red-400">
                  💀 {dropExpiryDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <p className="text-[10px] text-[#94a3b8] mt-0.5">
                  {isReleased ? 'expired on' : 'possible deadline'}
                </p>
              </div>
            </div>

          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/20 rounded-2xl p-6 text-center">
          {isReleased ? (
            <>
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">This Drop is Now Available!</h2>
              <p className="text-[#94a3b8] mb-6 text-sm">
                Sign in to download <span className="font-semibold text-white">"{drop.title}"</span> and see your contributor discount.
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
                  className="flex items-center gap-2 border border-[#35354d] hover:border-orange-500/50 text-[#e2e8f0] font-semibold px-6 py-3 rounded-xl transition"
                >
                  Get Started Free
                </Link>
              </div>
            </>
          ) : (
            <>
              <Flame className="w-10 h-10 text-orange-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Join the Burn — Speed Up the Drop!</h2>
              <p className="text-[#94a3b8] mb-6 text-sm">
                Contribute credits to accelerate the countdown. The more the community burns, the faster{' '}
                <span className="font-semibold text-white">"{drop.title}"</span> drops — and top contributors get discounted downloads.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to={`/login?redirect=/drop/${drop.id}`}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl transition shadow-xl shadow-orange-500/25"
                >
                  Sign In to Contribute <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={`/register?redirect=/drop/${drop.id}`}
                  className="flex items-center gap-2 border border-[#35354d] hover:border-orange-500/50 text-[#e2e8f0] font-semibold px-6 py-3 rounded-xl transition"
                >
                  Get Started Free
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
