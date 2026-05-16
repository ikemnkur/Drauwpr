import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Flame } from 'lucide-react';

interface Props {
  dropId: string;
  dropTitle: string;
}

// Deterministic particles so no re-render jitter
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  emoji: ['🔥', '🎉', '✨', '💥', '⚡', '🌟'][i % 6],
  left: `${(i * 17 + 5) % 95}%`,
  delay: `${(i * 0.15) % 1.8}s`,
  duration: `${1.4 + (i % 5) * 0.2}s`,
  size: i % 3 === 0 ? 'text-2xl' : i % 3 === 1 ? 'text-xl' : 'text-lg',
}));

export default function DropCelebrationModal({ dropId, dropTitle }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  function handleDownload() {
    navigate(`/drop/${dropId}/download`);
  }

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 transition-opacity duration-300',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
    >
      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className={`absolute bottom-0 ${p.size} select-none`}
            style={{
              left: p.left,
              animation: `celebFloat ${p.duration} ${p.delay} ease-out forwards`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Modal card */}
      <div
        className={[
          'relative bg-[#1e1e2e] border border-orange-500/30 rounded-3xl w-full max-w-sm shadow-2xl shadow-orange-500/20 overflow-hidden transition-transform duration-300',
          visible ? 'scale-100' : 'scale-90',
        ].join(' ')}
      >
        {/* Glow rings */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 rounded-3xl animate-pulse bg-orange-500/5" />
        </div>

        {/* Top gradient band */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-red-500 to-orange-400" />

        <div className="px-7 py-8 text-center space-y-5 relative">

          {/* Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute w-24 h-24 rounded-full bg-orange-500/15 animate-ping" />
            <div className="absolute w-20 h-20 rounded-full bg-orange-500/20 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/40">
              <Flame className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Headline */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mb-1">🎉 It's Live!</p>
            <h2 className="text-3xl font-extrabold bg-gradient-to-r from-orange-400 via-red-400 to-orange-300 bg-clip-text text-transparent leading-tight">
              THE DROP
              <br />
              HAS LANDED!
            </h2>
          </div>

          {/* Drop name */}
          <div className="bg-[#2a2a3e] border border-[#35354d] rounded-xl px-4 py-3">
            <p className="text-xs text-[#94a3b8] mb-0.5">Now available</p>
            <p className="text-white font-bold text-base leading-snug line-clamp-2">"{dropTitle}"</p>
          </div>

          <p className="text-sm text-[#94a3b8]">
            The countdown hit zero — this file is now unlocked and ready to download. Go get it!
          </p>

          {/* CTA */}
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-bold text-base py-3.5 rounded-2xl transition shadow-lg shadow-orange-500/30 active:scale-95"
          >
            <Download className="w-5 h-5" />
            Download Now
          </button>

        </div>

        {/* Bottom gradient band */}
        <div className="h-1 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-400 opacity-60" />
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes celebFloat {
          0%   { transform: translateY(0) scale(1) rotate(0deg);   opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(-110vh) scale(1.3) rotate(30deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
