import { Flame, Snowflake, Droplets, Wind, Thermometer, Zap, Rocket } from 'lucide-react';
{/* <WavesVertical /> */ }

// import { WavesVertical } from 'lucide-react';
let WavesVerticalIcon = (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-waves-vertical-icon lucide-waves-vertical"><path d="M12 2q2 2.5 0 5t0 5 0 5 0 5" /><path d="M19 2q2 2.5 0 5t0 5 0 5 0 5" /><path d="M5 2q2 2.5 0 5t0 5 0 5 0 5" /></svg>
);
{/* <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-waves-vertical-icon lucide-waves-vertical"><path d="M12 2q2 2.5 0 5t0 5 0 5 0 5"/><path d="M19 2q2 2.5 0 5t0 5 0 5 0 5"/><path d="M5 2q2 2.5 0 5t0 5 0 5 0 5"/></svg> */ }

interface Props {
  rate: number;
  goalPct?: number; // 0-100, how much of the spark threshold is met
}

type Tier = {
  Icon: React.ElementType;
  label: string;
  color: string;         // icon / text color (CSS)
  glow: string;          // drop-shadow color
  barGradient: string;   // mini-bar gradient
  subLabel: string;
};

function getTier(pct: number): Tier {
  if (pct < 15) return {
    Icon: Snowflake,
    label: 'Frozen',
    color: '#bae6fd',          // sky-200
    glow: 'rgba(186,230,253,0.7)',
    barGradient: 'linear-gradient(90deg, #0ea5e9, #bae6fd)',
    subLabel: 'ice cold',
  };
  if (pct < 25) return {
    Icon: Droplets,
    label: 'Thawing',
    color: '#60a5fa',          // blue-400
    glow: 'rgba(96,165,250,0.6)',
    barGradient: 'linear-gradient(90deg, #2563eb, #60a5fa)',
    subLabel: 'melting slowly',
  };

  if (pct < 50) return {
    Icon: () => WavesVerticalIcon,
    label: 'Evaporating',
    color: '#9098a4',          // slate-400
    glow: 'rgba(148,163,184,0.5)',
    barGradient: 'linear-gradient(90deg, #475569, #cbd5e1)',
    subLabel: 'lukewarm',
  };

  if (pct < 70) return {
    Icon: Wind,
    label: 'Steaming',
    color: '#94a3b8',          // slate-400
    glow: 'rgba(148,163,184,0.5)',
    barGradient: 'linear-gradient(90deg, #475569, #cbd5e1)',
    subLabel: 'heating up',
  };
  if (pct < 80) return {
    Icon: Thermometer,
    label: 'Smoldering',
    color: '#f87171',          // red-400
    glow: 'rgba(248,113,113,0.7)',
    barGradient: 'linear-gradient(90deg, #dc2626, #fca5a5)',
    subLabel: 'Glowing Hot',
  };
  if (pct < 90) return {
    Icon: Zap,
    label: 'Sparking',
    color: '#fde047',          // yellow-300
    glow: 'rgba(253,224,71,0.8)',
    barGradient: 'linear-gradient(90deg, #ca8a04, #fde047)',
    subLabel: 'Igniting',
  };

  if (pct <= 99) return {
    Icon: Flame,
    label: 'Ignited',
    color: '#f97316',          // orange-500
    glow: 'rgba(249,115,22,0.9)',
    barGradient: 'linear-gradient(90deg, #f97316, #ef4444)',
    subLabel: 'On Fire 🔥',
  };

  if (pct > 100) return {
    Icon: Rocket,
    label: 'Blast Off',
    color: '#f97316',          // orange-500
    glow: 'rgba(249,115,22,0.9)',
    barGradient: 'linear-gradient(90deg, #f97316, #ef4444)',
    subLabel: '🔥 Kaboom... To The Moon 🔥',
  };
  //  if (pct <= 10) return {
  return {
    Icon: Snowflake,
    label: 'Dead',
    color: '#9dacb4',          // sky-200
    glow: 'rgba(186,230,253,0.7)',
    barGradient: 'linear-gradient(90deg, #0ea5e9, #bae6fd)',
    subLabel: 'completely frozen',
  };
}

export default function BurnRateGauge({ rate, goalPct = 100 }: Props) {
  const tier = getTier(goalPct);
  const { Icon } = tier;
  const isAnimated = goalPct >= 95;

  return (
    <div className="flex items-center gap-3 bg-surface-2 rounded-xl px-4 py-3">
      <div className="relative shrink-0">
        <Icon
          className={`w-10 h-10 ${isAnimated ? 'flame-flicker' : ''}`}
          style={{
            color: tier.color,
            filter: `drop-shadow(0 0 8px ${tier.glow})`,
          }}
        />
        {/* extra flicker icon at 100% */}
        {goalPct >= 100 && (
          <Flame
            className="w-6 h-6 absolute -top-2 left-2 flame-flicker"
            style={{ color: '#fbbf24', animationDelay: '0.15s' }}
          />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-text-muted uppercase tracking-wider">Burn Rate</p>
        <p className="text-2xl font-bold font-mono" style={{ color: tier.color }}>
          {rate.toFixed(2)}x
        </p>
        <p className="text-[10px] mt-0.5" style={{ color: tier.color, opacity: 0.75 }}>
          {tier.subLabel}
        </p>
      </div>

      {/* Mini bar */}
      <div className="flex-1 ml-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: tier.color }}>
            {tier.label}
          </span>
          <span className="text-[9px] text-text-muted">{rate.toFixed(2)}x</span>
        </div>
        <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(rate * 10, 100)}%`,
              background: tier.barGradient,
              boxShadow: `0 0 6px ${tier.glow}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
