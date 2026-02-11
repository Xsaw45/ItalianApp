const CACHE_NAME = 'italienapp-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/theory.css',
  './css/exercises.css',
  './css/progress.css',
  './css/responsive.css',
  './js/app.js',
  './js/router.js',
  './js/state.js',
  './js/data-loader.js',
  './js/utils/dom.js',
  './js/utils/normalize.js',
  './js/views/home.js',
  './js/views/scheda.js',
  './js/views/theory-renderer.js',
  './js/views/exercise-renderer.js',
  './js/views/exercises/multiple-choice.js',
  './js/views/exercises/fill-in-blank.js',
  './js/views/exercises/matching.js',
  './js/views/exercises/sentence-completion.js',
  './js/views/exercises/sentence-rewriting.js',
  './js/views/exercises/table-completion.js',
  './js/views/exercises/transformation.js',
  './js/views/exercises/open-ended.js',
  './data/manifest.json',
  './data/scheda-1.json',
  './data/scheda-2.json',
  './data/scheda-3.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
