export type TagProfile = Record<string, number>;

const STORAGE_KEY = 'prolifer8_tag_profile_v1';
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizeTag(tag: string): string {
  return tag.replace(/^#/, '').trim().toLowerCase();
}

export function loadTagProfile(): TagProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TagProfile;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export function saveTagProfile(profile: TagProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function decayTagProfile(profile: TagProfile, dailyFactor = 0.99): TagProfile {
  const next: TagProfile = {};
  for (const [tag, weight] of Object.entries(profile)) {
    const decayed = Number(weight) * dailyFactor;
    if (decayed >= 0.01) next[tag] = decayed;
  }
  return next;
}

export function trackTags(tags: string[], amount = 1): TagProfile {
  if (!tags.length) return loadTagProfile();

  const current = decayTagProfile(loadTagProfile());
  const cleanTags = tags.map(normalizeTag).filter(Boolean);
  if (!cleanTags.length) return current;

  const base = amount / cleanTags.length;
  for (const tag of cleanTags) {
    current[tag] = (current[tag] || 0) + base;
  }

  saveTagProfile(current);
  return current;
}

export function getTopTags(limit = 10): string[] {
  const profile = loadTagProfile();
  return Object.entries(profile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function scoreByTagAffinity(tags: string[], profile: TagProfile): number {
  if (!tags.length) return 0;
  return tags.reduce((sum, tag) => sum + (profile[normalizeTag(tag)] || 0), 0);
}

export function shouldDecaySince(lastDecayAt: number | null, now = Date.now()): boolean {
  if (!lastDecayAt) return true;
  return now - lastDecayAt >= DAY_MS;
}
