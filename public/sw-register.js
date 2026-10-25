// Registers the service worker (sw.js, written by the build), which caches the
// site so it works offline. Production builds only: the dev server has no sw.js.
// Automated browsers (navigator.webdriver) skip it so test timings aren't skewed
// by the background download; the offline test registers it itself.
if ('serviceWorker' in navigator && !navigator.webdriver && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {
      // No service worker (dev server, private mode): the site still works online
    });
  });
}
