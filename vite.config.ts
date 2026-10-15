import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CSP } from './src/csp';
import { PAGES, SITE_URL } from './src/site';

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

/**
 * SEO files and URLs, all derived from src/site.ts: fills in __SITE_URL__ in the
 * HTML pages and writes robots.txt and sitemap.xml into the build.
 */
function seo(): Plugin {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: 'seo',
    transformIndexHtml(html) {
      return html.replaceAll('__SITE_URL__', SITE_URL);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      const urls = PAGES.map(
        (p) =>
          `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), seo()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    // One HTML page per route (each with its own title, description and canonical URL)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        json: path.resolve(__dirname, 'json-diff/index.html'),
      },
    },
  },
});
