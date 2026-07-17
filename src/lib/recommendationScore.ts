import type { Drop } from '../types';
import { recommendationConfig as cfg } from '../config/recommendation';

const DAY_MS = 24 * 60 * 60 * 1000;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getPrimaryRecommendationScore(post: Drop, tagAffinity: number, now = Date.now()): number {
  const ageMs = Math.max(0, now - post.createdAt);
  const views = Math.max(0, Number(post.views || 0));
  const likes = Math.max(0, Number(post.likeCount || 0));
  const dislikes = Math.max(0, Number(post.dislikeCount || 0));
  const comments = Math.max(0, Number((post as Drop & { commentCount?: number }).commentCount ?? post.reviewCount ?? 0));
  const creatorActivity = Math.max(0, Number(post.creatorActivityScore || 0));
  const quality = clamp(Number(post.avgRating ?? 0), 0, 100);
  const effort = clamp(Number(post.avgEffortRating ?? 50), 0, 100);
  const dislikeRate = dislikes / Math.max(views, 1);

  const creatorActivityScore = Math.log1p(creatorActivity) * cfg.creatorActivityMultiplier;
  const qualityScore = quality >= cfg.qualityThreshold
    ? cfg.qualityBaseBonus + (quality - cfg.qualityThreshold) * cfg.qualityAboveThresholdMultiplier
    : quality * cfg.qualityBelowThresholdMultiplier;
  const effortScore = effort >= cfg.effortThreshold
    ? cfg.effortBaseBonus + (effort - cfg.effortThreshold) * cfg.effortAboveThresholdMultiplier
    : effort * cfg.effortBelowThresholdMultiplier;
  const participationScore = Math.log1p(likes + comments) * cfg.participationMultiplier;
  const tagScore = tagAffinity * cfg.tagAffinityMultiplier;

  const targetViewBoost = views < cfg.targetViews ? (cfg.targetViews - views) * cfg.targetViewBoostMultiplier : 0;
  const overexposedPenalty = views > cfg.deprioritizeAfterViews ? (views - cfg.deprioritizeAfterViews) * cfg.overexposedPenaltyMultiplier : 0;
  const deprioritizeAfterMs = cfg.deprioritizeAfterDays * DAY_MS;
  const hardAgeCapMs = cfg.hardAgeCapDays * DAY_MS;
  const stalePenalty = ageMs > deprioritizeAfterMs ? ((ageMs - deprioritizeAfterMs) / DAY_MS) * cfg.stalePenaltyPerDay : 0;
  const expiredPenalty = ageMs > hardAgeCapMs ? cfg.hardAgePenalty : 0;
  const dislikePenalty = dislikeRate * cfg.dislikeRatePenaltyMultiplier + dislikes * cfg.dislikeCountPenaltyMultiplier;
  const boostBonus = post.status === 'boosted' ? cfg.boostBonus : 0;

  return boostBonus
    + creatorActivityScore
    + qualityScore
    + effortScore
    + participationScore
    + tagScore
    + targetViewBoost
    - dislikePenalty
    - overexposedPenalty
    - stalePenalty
    - expiredPenalty;
}