/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<import('workbox-build').ManifestEntry>;
};

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event: PushEvent) => {
  let payload: {
    title?: string;
    body?: string;
    icon?: string;
    badge?: string;
    image?: string;
    url?: string;
    tag?: string;
  } = {};

  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {
      body: event.data?.text() || 'You have a new update on Drauwper.',
    };
  }

  const title = payload.title || 'Drauwper Update';
  const options: NotificationOptions = {
    body: payload.body || 'Open Drauwper to view details.',
    icon: payload.icon || '/DrauwperIcon.png',
    badge: payload.badge || '/DrauwperIcon.png',
    tag: payload.tag || 'drauwper-update',
    data: {
      url: payload.url || '/',
      image: payload.image || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = String(event.notification.data?.url || '/');

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      if ('focus' in client) {
        await (client as WindowClient).focus();
        if ('navigate' in client) {
          await (client as WindowClient).navigate(targetUrl);
        }
        return;
      }
    }

    await self.clients.openWindow(targetUrl);
  })());
});
