self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('boycott-v1').then(cache => cache.addAll([
      './',
      './index.html',
      './database.json',
      './manifest.json'
    ]))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});