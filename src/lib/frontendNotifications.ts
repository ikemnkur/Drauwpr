import type { Drop } from '../types';

export type NotificationPriority = 'success' | 'info' | 'warning' | 'error';

export interface BackendNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  category: string;
  actionUrl: string | null;
  isRead: number;
  createdAt: string;
}

export interface NotificationItem extends BackendNotification {
  source: 'backend' | 'frontend';
}

type DropSnapshot = {
  dropId: string;
  title: string;
  likeCount: number;
  commentCount: number;
  tips: number;
  reviewCount: number;
  views: number;
  avgRating: number;
  capturedAt: number;
};

type FrontendNotificationStored = NotificationItem & {
  source: 'frontend';
  eventKey: string;
};

const SNAPSHOT_KEY_PREFIX = 'drauwper_post_metrics_snapshot_v1';
const FRONTEND_NOTIF_KEY_PREFIX = 'drauwper_frontend_notifications_v1';
const MAX_FRONTEND_NOTIFICATIONS = 200;
const ONE_HOUR_MS = 60 * 60 * 1000;

const VIEW_MILESTONES: number[] = (() => {
  const values: number[] = [];
  for (let v = 100; v < 1_000; v += 100) values.push(v);
  for (let v = 1_000; v < 10_000; v += 1_000) values.push(v);
  for (let v = 10_000; v < 100_000; v += 10_000) values.push(v);
  for (let v = 100_000; v <= 1_000_000; v += 100_000) values.push(v);
  return values;
})();

function snapshotKey(userId: string): string {
  return `${SNAPSHOT_KEY_PREFIX}:${userId}`;
}

function frontendNotifKey(userId: string): string {
  return `${FRONTEND_NOTIF_KEY_PREFIX}:${userId}`;
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getDropCommentCount(drop: Drop): number {
  return Number((drop as Drop & { commentCount?: number }).commentCount ?? drop.reviewCount ?? 0);
}

function toSnapshotMap(drops: Drop[], now: number): Record<string, DropSnapshot> {
  const map: Record<string, DropSnapshot> = {};
  for (const drop of drops) {
    map[drop.id] = {
      dropId: drop.id,
      title: drop.title,
      likeCount: Number(drop.likeCount || 0),
      commentCount: getDropCommentCount(drop),
      tips: Number(drop.currentContributions || 0),
      reviewCount: Number(drop.reviewCount || 0),
      views: Number(drop.views || 0),
      avgRating: Number(drop.avgRating || 0),
      capturedAt: now,
    };
  }
  return map;
}

function loadSnapshot(userId: string): { at: number; drops: Record<string, DropSnapshot> } | null {
  return safeJsonParse<{ at: number; drops: Record<string, DropSnapshot> } | null>(
    localStorage.getItem(snapshotKey(userId)),
    null,
  );
}

function saveSnapshot(userId: string, at: number, drops: Record<string, DropSnapshot>): void {
  localStorage.setItem(snapshotKey(userId), JSON.stringify({ at, drops }));
}

function loadStoredFrontendNotifications(userId: string): FrontendNotificationStored[] {
  const parsed = safeJsonParse<FrontendNotificationStored[]>(localStorage.getItem(frontendNotifKey(userId)), []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveStoredFrontendNotifications(userId: string, items: FrontendNotificationStored[]): void {
  localStorage.setItem(frontendNotifKey(userId), JSON.stringify(items.slice(0, MAX_FRONTEND_NOTIFICATIONS)));
}

function crossedViewMilestones(previousViews: number, currentViews: number): number[] {
  if (currentViews <= previousViews) return [];
  return VIEW_MILESTONES.filter((m) => m > previousViews && m <= currentViews);
}

function createFrontendNotification(args: {
  drop: DropSnapshot;
  eventKey: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  nowIso: string;
}): FrontendNotificationStored {
  const { drop, eventKey, title, message, priority, nowIso } = args;
  return {
    id: `fe-${drop.dropId}-${eventKey}`,
    source: 'frontend',
    title,
    message,
    priority,
    category: 'post_updates',
    actionUrl: `/post/${drop.dropId}`,
    isRead: 0,
    createdAt: nowIso,
    eventKey,
  };
}

function diffPostMetrics(previous: DropSnapshot, current: DropSnapshot, nowIso: string): FrontendNotificationStored[] {
  const generated: FrontendNotificationStored[] = [];

  if (current.likeCount > previous.likeCount) {
    const delta = current.likeCount - previous.likeCount;
    generated.push(
      createFrontendNotification({
        drop: current,
        eventKey: `likes-${previous.likeCount}-${current.likeCount}`,
        title: 'New likes on your drop',
        message: `"${current.title}" received ${delta} new like${delta === 1 ? '' : 's'}.`,
        priority: 'success',
        nowIso,
      }),
    );
  }

  if (current.commentCount > previous.commentCount) {
    const delta = current.commentCount - previous.commentCount;
    generated.push(
      createFrontendNotification({
        drop: current,
        eventKey: `comments-${previous.commentCount}-${current.commentCount}`,
        title: 'New comments on your drop',
        message: `"${current.title}" received ${delta} new comment${delta === 1 ? '' : 's'}.`,
        priority: 'info',
        nowIso,
      }),
    );
  }

  if (current.tips > previous.tips) {
    const delta = current.tips - previous.tips;
    generated.push(
      createFrontendNotification({
        drop: current,
        eventKey: `tips-${previous.tips}-${current.tips}`,
        title: 'New tips received',
        message: `"${current.title}" received ${delta.toLocaleString()} new tip credit${delta === 1 ? '' : 's'}.`,
        priority: 'success',
        nowIso,
      }),
    );
  }

  if (current.reviewCount > previous.reviewCount) {
    const delta = current.reviewCount - previous.reviewCount;
    const ratingChanged = current.avgRating !== previous.avgRating;
    generated.push(
      createFrontendNotification({
        drop: current,
        eventKey: `reviews-${previous.reviewCount}-${current.reviewCount}-${previous.avgRating}-${current.avgRating}`,
        title: 'New rating/review received',
        message: ratingChanged
          ? `"${current.title}" received ${delta} new review${delta === 1 ? '' : 's'} and its rating moved from ${Math.round(previous.avgRating)} to ${Math.round(current.avgRating)}.`
          : `"${current.title}" received ${delta} new review${delta === 1 ? '' : 's'}.`,
        priority: 'info',
        nowIso,
      }),
    );
  }

  for (const milestone of crossedViewMilestones(previous.views, current.views)) {
    generated.push(
      createFrontendNotification({
        drop: current,
        eventKey: `views-milestone-${milestone}`,
        title: 'View milestone reached',
        message: `"${current.title}" just crossed ${milestone.toLocaleString()} total views.`,
        priority: 'info',
        nowIso,
      }),
    );
  }

  return generated;
}

export function getFrontendNotifications(userId: string): NotificationItem[] {
  return loadStoredFrontendNotifications(userId).map(({ eventKey: _eventKey, ...notif }) => notif);
}

export function markFrontendNotificationRead(userId: string, notificationId: string): void {
  const next = loadStoredFrontendNotifications(userId).map((n) =>
    n.id === notificationId ? { ...n, isRead: 1 } : n,
  );
  saveStoredFrontendNotifications(userId, next);
}

export function markAllFrontendNotificationsRead(userId: string): void {
  const next = loadStoredFrontendNotifications(userId).map((n) => ({ ...n, isRead: 1 }));
  saveStoredFrontendNotifications(userId, next);
}

export function deleteFrontendNotification(userId: string, notificationId: string): void {
  const next = loadStoredFrontendNotifications(userId).filter((n) => n.id !== notificationId);
  saveStoredFrontendNotifications(userId, next);
}

export function mergeNotifications(
  backend: BackendNotification[],
  frontend: NotificationItem[],
): NotificationItem[] {
  const backendWithSource: NotificationItem[] = backend.map((n) => ({ ...n, source: 'backend' }));
  return [...frontend, ...backendWithSource].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function runFrontendDropDetectionSync(args: {
  userId: string;
  drops: Drop[];
  now?: number;
}): { created: NotificationItem[]; ran: boolean } {
  const { userId, drops } = args;
  const now = args.now ?? Date.now();
  const nowIso = new Date(now).toISOString();
  const current = toSnapshotMap(drops, now);

  const previousEnvelope = loadSnapshot(userId);

  if (!previousEnvelope) {
    saveSnapshot(userId, now, current);
    return { created: [], ran: true };
  }

  const elapsed = now - Number(previousEnvelope.at || 0);
  if (elapsed < ONE_HOUR_MS) {
    return { created: [], ran: false };
  }

  const existing = loadStoredFrontendNotifications(userId);
  const existingEventKeys = new Set(existing.map((n) => n.eventKey));
  const createdStored: FrontendNotificationStored[] = [];

  for (const postId of Object.keys(current)) {
    const previous = previousEnvelope.drops[postId];
    const curr = current[postId];
    if (!previous) continue;

    const diffs = diffPostMetrics(previous, curr, nowIso);
    for (const notif of diffs) {
      const dedupeKey = `${postId}:${notif.eventKey}:${previousEnvelope.at}`;
      if (existingEventKeys.has(dedupeKey)) continue;
      existingEventKeys.add(dedupeKey);
      createdStored.push({ ...notif, eventKey: dedupeKey });
    }
  }

  if (createdStored.length > 0) {
    const next = [...createdStored, ...existing].slice(0, MAX_FRONTEND_NOTIFICATIONS);
    saveStoredFrontendNotifications(userId, next);
  }

  saveSnapshot(userId, now, current);

  return {
    created: createdStored.map(({ eventKey: _eventKey, ...notif }) => notif),
    ran: true,
  };
}
