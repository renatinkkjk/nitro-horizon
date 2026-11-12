/*
 * Service worker do Nitro Horizon.
 *
 * Deixa o jogo instalável e jogável OFFLINE depois da primeira visita:
 *  - navegações caem no index.html em cache (offline)
 *  - sprites (nomes estáveis) e bundle (hash) ficam em cache-first
 *  - qualquer coisa nova entra no cache conforme é usada
 */
const BASE = '/nitro-horizon/';
const CACHE = 'nitro-horizon-v2';

const CORE = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon-192.png`,
  `${BASE}icon-512.png`,
  `${BASE}icon-maskable-512.png`,
  `${BASE}apple-touch-icon.png`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navegação: tenta a rede e cai no index.html em cache (offline).
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(`${BASE}index.html`, copy));
          return response;
        })
        .catch(() => caches.match(`${BASE}index.html`).then((hit) => hit || caches.match(BASE))),
    );
    return;
  }

  // Demais recursos: cache-first (nomes dos sprites são fixos; o bundle tem hash).
  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
    }),
  );
});
