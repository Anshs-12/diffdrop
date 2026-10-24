// Puts the tools sidebar back where it was on the previous page, before the
// first paint. Runs at the end of <body>, once the prerendered sidebar exists.
try {
  var sidebar = document.querySelector('.tool-sidebar');
  var y = Number(sessionStorage.getItem('toolspace-sidebar-scroll'));
  if (sidebar && y && location.pathname !== '/') sidebar.scrollTop = y;
} catch (e) {
  // Storage blocked: the sidebar starts at the top
}
