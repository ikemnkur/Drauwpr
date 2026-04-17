import { AlertTriangle, CheckCircle, Clock, Hourglass, ShieldAlert, Skull, XCircle } from 'lucide-react';

interface Props {
  createdAt: number;
  expiresAt: number;
  currentContributions: number;
  goalAmount: number;
}

type RiskTier = {
  Icon: React.ElementType;
  label: string;
  subLabel: string;
  color: string;
  glow: string;
  barGradient: string;
};

/**
 * gauge = fundPct − timePct  (−100 → +100)
 * Displayed as a 0–100 bar centered at 50 (parity).
 * bar fill = clamp(gauge/2 + 50, 0, 100)
 */
function getRiskTier(gauge: number): RiskTier {
  if (gauge >= 20) return {
    Icon: CheckCircle,
    label: 'Looking Good',
    subLabel: 'well funded for the time remaining',
    color: '#4ade80',
    glow: 'rgba(74,222,128,0.5)',
    barGradient: 'linear-gradient(90deg, #16a34a, #4ade80)',
  };
  if (gauge >= 0) return {
    Icon: Clock,
    label: 'On Track',
    subLabel: 'keeping pace with the deadline',
    color: '#facc15',
    glow: 'rgba(250,204,21,0.5)',
    barGradient: 'linear-gradient(90deg, #a16207, #facc15)',
  };
  if (gauge >= -30) return {
    Icon: AlertTriangle,
    label: 'Needs Fuel',
    subLabel: 'more contributions needed soon',
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.6)',
    barGradient: 'linear-gradient(90deg, #c2410c, #fb923c)',
  };
  if (gauge >= -60) return {
    Icon: ShieldAlert,
    label: 'At Risk',
    subLabel: 'deadline closing in fast',
    color: '#f87171',
    glow: 'rgba(248,113,113,0.7)',
    barGradient: 'linear-gradient(90deg, #b91c1c, #f87171)',
  };
  return {
    Icon: Skull,
    label: 'Critical',
    subLabel: 'drop may expire unfunded',
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.85)',
    barGradient: 'linear-gradient(90deg, #7f1d1d, #ef4444)',
  };
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Expired';
  const s = ms / 1000;
  if (s < 3600) return `${Math.floor(s / 60)}m left`;
  if (s < 86400) return `${Math.floor(s / 3600)}h left`;
  return `${Math.floor(s / 86400)}d left`;
}

export default function ExpirationGauge({ createdAt, expiresAt, currentContributions, goalAmount }: Props) {
  const now = Date.now();

  // Expired state — drop window has passed without funding
  if (now >= expiresAt && currentContributions < goalAmount) {
    return (
      <div className="bg-surface-2 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <XCircle
            className="w-9 h-9 shrink-0"
            style={{ color: '#6b7280', filter: 'drop-shadow(0 0 6px rgba(107,114,128,0.5))' }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-text-muted uppercase tracking-wider">Spark Window</p>
            <p className="text-lg font-bold font-mono leading-tight" style={{ color: '#6b7280' }}>Expired</p>
            <p className="text-[11px]" style={{ color: '#6b7280', opacity: 0.75 }}>this drop window has closed unfunded</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-text-muted">ended</p>
            <p className="text-xs font-mono text-text-muted">{new Date(expiresAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div>
          <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, (currentContributions / goalAmount) * 100))}%`,
                background: 'linear-gradient(90deg, #374151, #6b7280)',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = expiresAt - createdAt;
  const elapsed = now - createdAt;

  const timeFraction = totalDuration > 0 ? Math.min(Math.max(elapsed / totalDuration, 0), 1) : 1;
  const goalFraction = goalAmount > 0 ? Math.min(currentContributions / goalAmount, 1) : 1;

  // gauge: positive = ahead, negative = behind
  const gauge = (goalFraction - ((timeFraction)*timeFraction)) * 100;

  // Map to 0–100 bar fill centered at 50 (parity)
  const barFill = Math.min(100, Math.max(0, gauge / 2 + 50));

  const tier = getRiskTier(gauge);
  const { Icon } = tier;

  const creditsNeeded = Math.max(0, goalAmount - currentContributions);
  const timeLeftMs = Math.max(0, expiresAt - now);
  const isCritical = gauge <= -60;

  return (
    <div className="bg-surface-2 rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <Icon
          className={`w-9 h-9 shrink-0 ${isCritical ? 'animate-pulse' : ''}`}
          style={{ color: tier.color, filter: `drop-shadow(0 0 8px ${tier.glow})` }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-muted uppercase tracking-wider">Spark Window</p>
          <p className="text-lg font-bold font-mono leading-tight" style={{ color: tier.color }}>
            {tier.label}
          </p>
          <p className="text-[11px]" style={{ color: tier.color, opacity: 0.75 }}>{tier.subLabel}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1 justify-end text-text-muted mb-0.5">
            <Hourglass className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{formatTimeLeft(timeLeftMs)}</span>
          </div>
          {creditsNeeded > 0
            ? <p className="text-[10px] text-text-muted"><span className="text-brand font-semibold">{creditsNeeded.toLocaleString()}</span> credits to spark</p>
            : <p className="text-[10px] text-green-400 font-semibold">Goal met ✓</p>
          }
        </div>
      </div>

      {/* Single bar */}
      <div>
        <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${barFill}%`,
              background: tier.barGradient,
              boxShadow: `0 0 8px ${tier.glow}`,
            }}
          />
        </div>
        {/* Parity tick mark */}
        <div className="relative h-1">
          <div className="absolute top-0 w-px h-2 bg-surface-3" style={{ left: '50%' }} />
        </div>
      </div>
    </div>
  );
}
