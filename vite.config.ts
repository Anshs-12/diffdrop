import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CSP } from './src/csp';

/** Only applied to builds — the dev server needs a WebSocket for hot reload. */
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  worker: {
    format: 'es',
  },
});
