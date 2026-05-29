const CACHE_NAME = 'italienapp-v10';

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
  './js/i18n.js',
  './js/data-loader.js',
  './js/utils/dom.js',
  './js/utils/normalize.js',
  './js/views/home.js',
  './js/views/scheda.js',
  './js/views/theory-renderer.js',
  './js/views/exercise-renderer.js',
  './js/views/stats.js',
  './js/views/vocab.js',
  './js/views/conjugation.js',
  './js/views/translation.js',
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
  './data/scheda-3.json',
  './data/scheda-4.json',
  './data/scheda-5.json',
  './data/scheda-6.json',
  './data/scheda-7.json',
  './data/scheda-8.json',
  './data/scheda-9.json',
  './data/scheda-10.json',
  './data/scheda-11.json',
  './data/scheda-12.json',
  './data/scheda-13.json',
  './data/scheda-14.json',
  './data/scheda-15.json',
  './data/scheda-16.json',
  './data/scheda-17.json',
  './data/scheda-18.json',
  './data/scheda-19.json',
  './data/scheda-20.json',
  './data/scheda-21.json',
  './data/scheda-22.json',
  './data/scheda-23.json',
  './data/scheda-24.json',
  './data/scheda-25.json',
  './data/scheda-26.json',
  './data/scheda-27.json',
  './data/scheda-28.json',
  './data/scheda-29.json',
  './data/scheda-30.json',
  './data/scheda-31.json',
  './data/scheda-32.json',
  './data/scheda-33.json',
  './data/scheda-34.json',
  './data/scheda-35.json',
  './data/scheda-36.json',
  './data/scheda-37.json',
  './data/scheda-38.json',
  './data/scheda-39.json',
  './data/scheda-40.json',
  './data/scheda-0a.json',
  './data/scheda-19bis.json',
  './data/vocab.json',
  './data/conjugation.json',
  './data/translations.json'
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
