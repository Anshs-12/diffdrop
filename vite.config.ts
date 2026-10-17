import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CSP } from './src/csp';
import { GOOGLE_SITE_VERIFICATION, PAGES, SITE_URL, type Page, type PageId } from './src/site';
import { TOOL_CONTENT } from './src/tools/content';
import { DIFF_CONTENT } from './src/components/diffContent';
import { GUIDE_META } from './src/guides/meta';

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230a0a0a'/%3E%3Crect x='8' y='9' width='10' height='3' rx='1.5' fill='%23e8908e'/%3E%3Crect x='8' y='14.5' width='16' height='3' rx='1.5' fill='%23fafafa' opacity='.55'/%3E%3Crect x='14' y='20' width='10' height='3' rx='1.5' fill='%239ccb84'/%3E%3C/svg%3E";

/** The HTML file that serves a page: "/" → index.html, "/x/" → x/index.html. */
const htmlFile = (page: Page) => (page.path === '/' ? 'index.html' : `${page.path.slice(1)}index.html`);

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

const isToolPage = (id: PageId): id is keyof typeof TOOL_CONTENT => id in TOOL_CONTENT;

/** schema.org data for search engines: the app, plus the FAQ on tool pages. */
function structuredData(page: Page): HtmlTagDescriptor {
  const url = `${SITE_URL}${page.path}`;
  const guide = GUIDE_META[page.id as keyof typeof GUIDE_META];
  if (guide) {
    const article = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: guide.h1,
      description: page.description,
      url,
      datePublished: guide.published,
      dateModified: guide.published,
      author: { '@type': 'Organization', name: 'diffdrop', url: `${SITE_URL}/` },
      publisher: { '@type': 'Organization', name: 'diffdrop', url: `${SITE_URL}/` },
      mainEntityOfPage: url,
    };
    const json = JSON.stringify(article).replace(/</g, '\\u003c');
    return { tag: 'script', attrs: { type: 'application/ld+json' }, children: json, injectTo: 'head' };
  }
  const graph: object[] = [
    {
      '@type': 'SoftwareApplication',
      name: page.id === 'home' ? 'diffdrop' : `${page.name} by diffdrop`,
      url,
      description: page.description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (runs in the browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ];
  const faq = isToolPage(page.id)
    ? TOOL_CONTENT[page.id].faq
    : page.id === 'diff-checker' || page.id === 'json-diff'
      ? DIFF_CONTENT[page.id === 'json-diff' ? 'json' : 'text'].faq
      : null;
  if (faq) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  }
  // Not executed, so the CSP doesn't apply; "<" escaped so text can't close the tag
  const json = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  return { tag: 'script', attrs: { type: 'application/ld+json' }, children: json, injectTo: 'head' };
}

/** Everything in a page's <head> after charset and viewport, from its PAGES entry. */
function headTags(page: Page): HtmlTagDescriptor[] {
  const url = `${SITE_URL}${page.path}`;
  const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: 'meta', attrs, injectTo: 'head' });
  return [
    { tag: 'title', children: page.title, injectTo: 'head' },
    meta({ name: 'description', content: page.description }),
    meta({ name: 'color-scheme', content: 'light dark' }),
    meta({ name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#ffffff' }),
    meta({ name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0a0a0a' }),
    meta({ name: 'referrer', content: 'no-referrer' }),
    ...(page.id === 'home' ? [meta({ name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION })] : []),
    { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
    meta({ property: 'og:site_name', content: 'diffdrop' }),
    meta({ property: 'og:title', content: page.title }),
    meta({ property: 'og:description', content: page.description }),
    meta({ property: 'og:url', content: url }),
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:image', content: `${SITE_URL}/og.png` }),
    meta({ property: 'og:image:width', content: '1200' }),
    meta({ property: 'og:image:height', content: '630' }),
    meta({ property: 'og:image:alt', content: 'diffdrop: Everything they paywall. Free.' }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:title', content: page.title }),
    meta({ name: 'twitter:description', content: page.description }),
    meta({ name: 'twitter:image', content: `${SITE_URL}/og.png` }),
    { tag: 'link', attrs: { rel: 'icon', href: FAVICON }, injectTo: 'head' },
    // Applies the saved theme before first paint (plain script from public/)
    { tag: 'script', attrs: { src: '/theme-init.js' }, injectTo: 'head' },
    structuredData(page),
  ];
}

/**
 * Pages and SEO files, all derived from src/site.ts: fills each page's <head>,
 * and writes robots.txt and sitemap.xml into the build.
 */
function pages(): Plugin {
  return {
    name: 'pages',
    transformIndexHtml(_html, ctx) {
      const file = ctx.path.replace(/^\//, '');
      const page = PAGES.find((p) => htmlFile(p) === file);
      if (!page) throw new Error(`No PAGES entry in src/site.ts for ${ctx.path}`);
      return headTags(page);
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
      });
      const urls = PAGES.map(
        (p) =>
          `  <url>\n    <loc>${SITE_URL}${p.path}</loc>\n    <priority>${p.priority.toFixed(1)}</priority>\n  </url>`,
      ).join('\n');
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}

/**
 * After the client build, server-renders every page (src/prerender.tsx) into its HTML, so crawlers get the heading, how-to and FAQ without running JS.
 * The browser then renders the page fresh over it.
 */
function prerender(): Plugin {
  let outDir = '';
  let ssr = false;
  return {
    name: 'prerender',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
      ssr = !!config.build.ssr;
    },
    async closeBundle() {
      if (ssr) return; // the nested build below
      const ssrDir = path.resolve(__dirname, 'node_modules/.prerender');
      await build({
        configFile: path.resolve(__dirname, 'vite.config.ts'),
        logLevel: 'warn',
        // Bundle dependencies too, so CommonJS packages like lz-string load in Node
        ssr: { noExternal: true },
        build: { ssr: path.resolve(__dirname, 'src/prerender.tsx'), outDir: ssrDir, emptyOutDir: true },
      });
      const { render } = (await import(pathToFileURL(path.join(ssrDir, 'prerender.js')).href)) as {
        render: (page: PageId) => string;
      };
      for (const page of PAGES) {
        const file = path.resolve(outDir, htmlFile(page));
        const html = fs.readFileSync(file, 'utf8');
        const empty = `<div id="root" data-page="${page.id}"></div>`;
        if (!html.includes(empty)) throw new Error(`prerender: no empty #root in ${file}`);
        fs.writeFileSync(file, html.replace(empty, `<div id="root" data-page="${page.id}">${render(page.id)}</div>`));
      }
      fs.rmSync(ssrDir, { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), contentSecurityPolicy(), pages(), prerender()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    // One HTML page per route, each with its own <head> (see pages())
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p.id, path.resolve(__dirname, htmlFile(p))])),
    },
  },
});
