/**
 * Production Content Security Policy, injected into index.html at build time and
 * quoted on the page. `connect-src 'none'` stops the page from making
 * fetch/XHR/WebSocket requests, so pasted text cannot leave the browser.
 */
export const CSP_DIRECTIVES = [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
];

export const CSP = CSP_DIRECTIVES.join('; ');
