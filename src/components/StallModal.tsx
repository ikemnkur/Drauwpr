import { useState, useEffect, useCallback } from 'react';
import { Timer, Zap, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  dropId: string;
  dropTitle: string;
  totalMinutesLeft: number; // current time left in minutes
  onClose: () => void;
  onStalled: (newExpiresAt: string, creditsSpent: number, newBalance: number, newScheduledDropTime: string) => void;
}

const STALL_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
type StallOption = (typeof STALL_OPTIONS)[number];

interface PriceResponse {
  price: number;
  stallMinutes: number;
  totalMinutesLeft: number;
}

type Phase = 'pick' | 'confirm' | 'success' | 'error';

export default function StallModal({ dropId, dropTitle, totalMinutesLeft, onClose, onStalled }: Props) {
  const [sliderVal, setSliderVal] = useState(5);
  const [priceMap, setPriceMap] = useState<Partial<Record<number, number>>>({});
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [phase, setPhase] = useState<Phase>('pick');
  const [purchasing, setPurchasing] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  // Snap slider to nearest valid option for display, but allow any 5-60 value
  const sliderMinutes = Math.min(60, Math.max(5, sliderVal));
  // Use the slider-driven minutes as the actual selection
  const minutes = sliderMinutes;
  const currentPrice = priceMap[minutes];

  const fetchPrices = useCallback(async () => {
    setLoadingPrices(true);
    try {
      const results = await Promise.all(
        STALL_OPTIONS.map((m) =>
          api.get<PriceResponse>(`/api/drops/${dropId}/stall-price?minutes=${m}`)
            .then((r) => [m, r.price] as [number, number])
            .catch(() => [m, null] as [number, null])
        )
      );
      const map: Partial<Record<number, number>> = {};
      for (const [m, p] of results) if (p !== null) map[m] = p;
      setPriceMap(map);
    } finally {
      setLoadingPrices(false);
    }
  }, [dropId]);

  // Fetch price for arbitrary slider values not in STALL_OPTIONS
  useEffect(() => {
    if (STALL_OPTIONS.includes(minutes as StallOption)) return;
    const controller = new AbortController();
    api.get<PriceResponse>(`/api/drops/${dropId}/stall-price?minutes=${minutes}`)
      .then((r) => setPriceMap((prev) => ({ ...prev, [minutes]: r.price })))
      .catch(() => {});
    return () => controller.abort();
  }, [dropId, minutes]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const handleConfirm = async () => {
    setPurchasing(true);
    setErrMsg('');
    try {
      const res = await api.post<{ success: boolean; stallMinutes: number; creditCost: number; newBalance: number; expiresAt: string; scheduledDropTime: string }>(
        `/api/drops/${dropId}/stall`,
        { minutes }
      );
      setPhase('success');
      onStalled(res.expiresAt, res.creditCost, res.newBalance, res.scheduledDropTime);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stall purchase failed';
      setErrMsg(msg);
      setPhase('error');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-surface-3 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-text">Stall the Clock</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Success state */}
          {phase === 'success' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <p className="text-lg font-semibold text-text">Clock stalled!</p>
              <p className="text-sm text-text-muted">
                Added <span className="text-brand font-bold">{minutes} minutes</span> to&nbsp;
                <span className="font-semibold">"{dropTitle}"</span>.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-5 py-2 rounded-xl bg-brand text-white font-semibold hover:bg-brand-dark transition"
              >
                Done
              </button>
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-400">{errMsg}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setPhase('pick')}
                  className="px-4 py-2 rounded-xl border border-surface-3 text-sm text-text-muted hover:text-text transition"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/25 transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Pick time */}
          {phase === 'pick' && (
            <>
              <p className="text-sm text-text-muted">
                Add time to <span className="font-semibold text-text">"{dropTitle}"</span>.
                <span className="ml-2 text-xs text-text-muted/70">
                  (~{Math.floor(totalMinutesLeft)} min left)
                </span>
              </p>

              {/* Quick-select buttons */}
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Quick Select</p>
                <div className="grid grid-cols-3 gap-2">
                  {STALL_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => { setSliderVal(m); }}
                      className={`rounded-xl border py-2.5 text-sm font-semibold transition flex flex-col items-center gap-0.5 ${
                        minutes === m
                          ? 'border-brand bg-brand/10 text-brand'
                          : 'border-surface-3 bg-surface-2 text-text-muted hover:border-brand/50 hover:text-text'
                      }`}
                    >
                      <span>{m} min</span>
                      {loadingPrices ? (
                        <span className="text-[10px] text-text-muted/60">…</span>
                      ) : priceMap[m] != null ? (
                        <span className="text-[10px] text-text-muted/80">{priceMap[m]!.toLocaleString()} ✦</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine-tune slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fine Tune</p>
                  <span className="text-sm font-bold text-brand">{minutes} min</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={1}
                  value={sliderVal}
                  onChange={(e) => { setSliderVal(+e.target.value); }}
                  className="w-full accent-brand h-2 rounded-full"
                />
                <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                  <span>5 min</span>
                  <span>1 hour</span>
                </div>
              </div>

              {/* Price summary */}
              <div className="rounded-xl border border-surface-3 bg-surface-2 px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-text-muted">Cost for {minutes} min</span>
                {loadingPrices || currentPrice == null ? (
                  <span className="text-sm text-text-muted animate-pulse">Calculating…</span>
                ) : (
                  <span className="text-xl font-bold text-brand flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    {currentPrice.toLocaleString()} credits
                  </span>
                )}
              </div>

              <button
                disabled={currentPrice == null || loadingPrices}
                onClick={() => setPhase('confirm')}
                className="w-full py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition"
              >
                Continue
              </button>
            </>
          )}

          {/* Confirm */}
          {phase === 'confirm' && (
            <>
              <div className="flex flex-col items-center gap-2 py-2 text-center">
                <Timer className="w-10 h-10 text-brand" />
                <p className="text-base font-semibold text-text">Confirm Stall Purchase</p>
                <p className="text-sm text-text-muted">
                  Add <span className="text-brand font-bold">{minutes} minutes</span> to the clock for
                </p>
                <p className="text-2xl font-bold text-text flex items-center gap-1">
                  <Zap className="w-5 h-5 text-brand" />
                  {currentPrice?.toLocaleString()} credits
                </p>
                <p className="text-xs text-text-muted mt-1">This cannot be undone.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setPhase('pick')}
                  disabled={purchasing}
                  className="flex-1 py-2.5 rounded-xl border border-surface-3 text-text-muted text-sm font-medium hover:text-text hover:border-brand/30 transition disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={purchasing}
                  className="flex-1 py-2.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand-dark disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {purchasing ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {purchasing ? 'Processing…' : 'Confirm'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
