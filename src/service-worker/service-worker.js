import { precacheAndRoute } from 'workbox-precaching';

const swManifest = self.__WB_MANIFEST;

console.log('swManifest ', swManifest);
precacheAndRoute(swManifest);

const respond = (event, response) => {
  if (!event.ports[0]) return;
  event.ports[0].postMessage(response);
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WS_SUCCESS_RESP') {
    console.log('SW websoket success', event.data.load);
    respond(event, event.data.load);
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'WS_ERROR') {
    console.log('SW websoket error', event.data.load);
    respond(event, event.data.load);
  }
});
