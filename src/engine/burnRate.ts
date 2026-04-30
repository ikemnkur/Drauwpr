/**
 * Burn-rate engine — Simple Direct Formula.
 *
 * Initialization:
 *   Burn Rate  = 1
 *   Sensitivity S = (now − expiresAt) / (createdAt − expiresAt)  → 1 at creation, 0 at expiry
 *   Constant   C = 0.999  (admin-configurable)
 *   Loop interval K = 5 minutes (admin-configurable)
 *
 * Loop (every K minutes):
 *   Decay     = 2 − C^(BurnRate / S)     — always ≥ 1
 *   Burn Rate = max(1, BurnRate / Decay)
 *
 * On Contribution:
 *   Burn Rate += contribution / goalAmount
 */

export const DEFAULT_C = 0.999;   // Decay constant — admin-configurable
export const DEFAULT_K = 5;       // Loop interval in minutes — admin-configurable

/**
 * Sensitivity: 1 at creation, approaches 0 at expiry.
 * Floored at 0.01 to prevent division-by-zero near deadline.
 */
export function currentSensitivity(
  now: number,        // unix ms
  createdAt: number,  // unix ms
  expiresAt: number,  // unix ms
): number {
  const s = (now - expiresAt) / (createdAt - expiresAt);
  return Math.max(s, 0.01);
}

/**
 * Decay factor for one loop tick.
 * decay = 2 − C^(burnRate / S)  — always in (1, 2) when C < 1.
 */
export function computeDecay(
  burnRate: number,
  sensitivity: number,
  C: number = DEFAULT_C,
): number {
  return 2 - Math.pow(C, burnRate / sensitivity);
}

/**
 * Apply one decay tick: BurnRate = max(1, BurnRate / decay).
 */
export function tickDecay(
  burnRate: number,
  sensitivity: number,
  C: number = DEFAULT_C,
): number {
  return Math.max(1, burnRate / computeDecay(burnRate, sensitivity, C));
}

/**
 * Apply a contribution boost: BurnRate += contribution / goalAmount.
 */
export function applyContribution(
  burnRate: number,
  contribution: number,
  goalAmount: number,
): number {
  const boost = goalAmount > 0 ? contribution / goalAmount : 0;
  return burnRate + boost;
}

/** Effective burn rate — floored at 1. */
export function effectiveBurnRate(burnRate: number): number {
  return Math.max(1, burnRate);
}

/**
 * Estimate real seconds remaining until `remainingClockSeconds` are burned through.
 * Simulates K-minute decay ticks, updating sensitivity as simulated time advances.
 */
export function estimateRealSecondsRemaining(
  remainingClockSeconds: number,
  burnRate: number,
  now: number,
  createdAt: number,
  expiresAt: number,
  C: number = DEFAULT_C,
  K: number = DEFAULT_K,
): number {
  if (remainingClockSeconds <= 0) return 0;
  const tickReal = K * 60; // real seconds per decay tick
  let remaining = remainingClockSeconds;
  let br = Math.max(1, burnRate);
  let t = now;
  let realSeconds = 0;
  const ONE_YEAR = 31_536_000;

  while (remaining > 0 && realSeconds < ONE_YEAR) {
    const burned = br * tickReal;
    if (burned >= remaining) {
      realSeconds += remaining / br; // interpolate within tick
      remaining = 0;
    } else {
      remaining -= burned;
      realSeconds += tickReal;
      t += tickReal * 1000;
      br = tickDecay(br, currentSensitivity(t, createdAt, expiresAt), C);
    }
  }
  return Math.max(0, realSeconds);
}

/** Contributor discount: Price = BasePrice × (1 − (userContribution / totalGoal)^1.5) */
export function contributorDiscount(
  basePrice: number,
  userContribution: number,
  totalGoal: number,
): number {
  const ratio = totalGoal > 0 ? Math.max(0, userContribution / totalGoal) : 0;
  const discount = Math.pow(ratio, 0.75);
  return Math.max(0, basePrice * (1 - Math.min(discount, 0.95)));
}

/** Time-based decay: price drops X% per 24h post-release */
export function timeDecayPrice(basePrice: number, hoursSinceRelease: number, dailyDecayPct: number = 5): number {
  const days = hoursSinceRelease / 24;
  return Math.max(basePrice * 0.1, basePrice * Math.pow(1 - dailyDecayPct / 100, days));
}

/** Volume-based decay: price drops after every volumeStep downloads */
export function volumeDecayPrice(basePrice: number, downloads: number, volumeStep: number = 1000, dropPct: number = 5): number {
  const steps = Math.floor(downloads / volumeStep);
  return Math.max(basePrice * 0.1, basePrice * Math.pow(1 - dropPct / 100, steps));
}



