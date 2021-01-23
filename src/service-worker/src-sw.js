import { precacheAndRoute } from 'workbox-precaching';

// precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// The precaching code provided by Workbox. You don't need to change this part.
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WS-TIMEOUT-KEEPALIVE') {
    console.log('SW websoket keepalive timeout');
  }
});
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WS-RESPONCE-ERROR') {
    console.log('SW websoket error response', event.data.data);
  }
});
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .catch((err) => {
        console.log('SW No internet connection...');
        console.log('----request ', event.request);
      })
      .then(() => caches.match(event.request))
      .then((response) => {
        if (response) return response;
        event.request.headers.get('accept').includes('text/html');
        return caches.match(
          workbox.precaching.getCacheKeyForURL('/offline.html'),
        );
      }),
  );
});
