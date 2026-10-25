/*
 * Service worker template. The build (serviceWorker() in vite.config.ts) fills
 * in VERSION and PRECACHE and writes it to dist/sw.js.
 *
 * - Pages: network first, so a new deploy shows up at once; the saved copy is
 *   used when offline.
 * - Built files (hashed names, never change): from the cache first.
 * - The large code-formatter engines aren't downloaded up front; each is saved
 *   the first time it's used, and works offline after that.
 *
 * It only handles requests to this site. Tool input never leaves the page, so
 * there is nothing else for it to see.
 */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `toolspace-${VERSION}`;
const RUNTIME = `toolspace-runtime-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('toolspace-') && k !== CACHE && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** The saved copy of a page: "/x" and "/x/index.html" both mean "/x/". */
async function cachedPage(url) {
  let path = url.pathname.replace(/index\.html$/, '');
  if (!path.endsWith('/')) path += '/';
  return (await caches.match(path, { ignoreSearch: true, ignoreVary: true })) || caches.match('/404.html');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Keep the saved page current
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(() => cachedPage(url)),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true, ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok && url.pathname.startsWith('/assets/')) {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
