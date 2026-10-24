// Runs before first paint: resolve the saved (or OS) theme so the page never flashes.
(function () {
  var t = null;
  try {
    t = localStorage.getItem('toolspace-theme') || localStorage.getItem('diffdrop-theme');
  } catch (e) {}
  if (t !== 'light' && t !== 'dark') {
    t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', t);
})();
