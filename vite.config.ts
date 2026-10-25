import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CSP } from './src/csp';
import { CONTACT_EMAIL, GOOGLE_SITE_VERIFICATION, PAGES, REPO_URL, SITE_NAME, SITE_URL, type Page, type PageId } from './src/site';
import { markdownPath } from './src/lib/md/negotiate';
import { TOOL_CONTENT } from './src/tools/content';
import { DIFF_CONTENT } from './src/components/diffContent';
import { GUIDE_META } from './src/guides/meta';

/** The HTML file that serves a page: "/" → index.html, "/x/" → x/index.html. */
const htmlFile = (page: Page) => (page.path === '/' ? 'index.html' : `${page.path.slice(1)}index.html`);

/**
 * `import x from 'file.wasm?inline'` gives the module as a base64 data URL, so
 * it ships inside its (lazily loaded) script and is never fetched: the page's
 * Content Security Policy blocks fetches (connect-src 'none').
 */
function wasmInline(): Plugin {
  return {
    name: 'wasm-inline',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.wasm?inline')) return null;
      const base64 = fs.readFileSync(id.slice(0, -'?inline'.length)).toString('base64');
      return `export default ${JSON.stringify(`data:application/wasm;base64,${base64}`)};`;
    },
  };
}

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

/** The site as an organization, with the square logo search results can show. */
const ORGANIZATION = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
  email: CONTACT_EMAIL,
  sameAs: [REPO_URL],
};

/** Home → page, for the breadcrumb search results show under the title. */
function breadcrumb(page: Page): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'toolspace', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: page.name, item: `${SITE_URL}${page.path}` },
    ],
  };
}

/** schema.org data for search engines: the app or article, its FAQ, and a breadcrumb. */
function structuredData(page: Page): HtmlTagDescriptor {
  const url = `${SITE_URL}${page.path}`;
  const graph: object[] = [];
  const guide = GUIDE_META[page.id as keyof typeof GUIDE_META];
  if (guide) {
    graph.push({
      '@type': { guide: 'TechArticle', about: 'AboutPage', contact: 'ContactPage' }[guide.kind],
      [guide.kind === 'guide' ? 'headline' : 'name']: guide.h1,
      description: page.description,
      url,
      datePublished: guide.published,
      dateModified: guide.published,
      author: ORGANIZATION,
      publisher: ORGANIZATION,
      mainEntityOfPage: url,
    });
  } else {
    graph.push({
      '@type': 'SoftwareApplication',
      name: page.id === 'home' ? 'toolspace' : `${page.name} by toolspace`,
      url,
      description: page.description,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (runs in the browser)',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  }
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
  if (page.id === 'home') {
    graph.push({ ...ORGANIZATION, '@id': `${SITE_URL}/#organization` });
    graph.push({ '@type': 'WebSite', name: 'toolspace', url: `${SITE_URL}/`, publisher: { '@id': `${SITE_URL}/#organization` } });
  } else {
    graph.push(breadcrumb(page));
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
    meta({ name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#fcfcfa' }),
    meta({ name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0a0a0a' }),
    meta({ name: 'referrer', content: 'no-referrer' }),
    // For AI agents: what the page is, and where its markdown version is (served by src/worker.ts)
    meta({ name: 'ai-summary', content: page.aiSummary ?? page.description }),
    { tag: 'link', attrs: { rel: 'alternate', type: 'text/markdown', href: `${SITE_URL}${markdownPath(page.path)}` }, injectTo: 'head' },
    ...(page.id === 'home' ? [meta({ name: 'google-site-verification', content: GOOGLE_SITE_VERIFICATION })] : []),
    { tag: 'link', attrs: { rel: 'canonical', href: url }, injectTo: 'head' },
    meta({ property: 'og:site_name', content: 'toolspace' }),
    meta({ property: 'og:title', content: page.title }),
    meta({ property: 'og:description', content: page.description }),
    meta({ property: 'og:url', content: url }),
    meta({ property: 'og:type', content: 'website' }),
    meta({ property: 'og:image', content: `${SITE_URL}/og.png` }),
    meta({ property: 'og:image:width', content: '1200' }),
    meta({ property: 'og:image:height', content: '630' }),
    meta({ property: 'og:image:alt', content: 'toolspace: Every developer tool they paywall. Free.' }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:title', content: page.title }),
    meta({ name: 'twitter:description', content: page.description }),
    meta({ name: 'twitter:image', content: `${SITE_URL}/og.png` }),
    // Real icon files (public/): search engines and link previews need a URL they can fetch
    { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: '48x48' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }, injectTo: 'head' },
    { tag: 'link', attrs: { rel: 'manifest', href: '/site.webmanifest' }, injectTo: 'head' },
    // Applies the saved theme before first paint (plain script from public/)
    { tag: 'script', attrs: { src: '/theme-init.js' }, injectTo: 'head' },
    // Registers the service worker that makes the site work offline (plain script from public/)
    { tag: 'script', attrs: { src: '/sw-register.js', defer: true }, injectTo: 'head' },
    // Restores the sidebar's scroll position before the first paint (plain script from public/)
    { tag: 'script', attrs: { src: '/sidebar-scroll.js' }, injectTo: 'body' },
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
      // robots.txt, llms.txt and ai.txt are written by prerender(), from src/lib/md/siteFiles.ts
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

/** Files bigger than this are cached on first use instead of at install (the code-formatter engines). */
const PRECACHE_MAX_BYTES = 400 * 1024;

/**
 * Writes dist/sw.js from scripts/sw.js: every page, the files every page loads,
 * and the smaller lazily loaded chunks are cached at install, so the site works
 * offline after one visit. The version is a hash of those files, so each deploy
 * replaces the old cache.
 */
function writeServiceWorker(outDir: string) {
  const files = new Set<string>(['/404.html']);
  for (const page of PAGES) {
    files.add(page.path);
    const html = fs.readFileSync(path.resolve(outDir, htmlFile(page)), 'utf8');
    for (const m of html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)) {
      if (fs.existsSync(path.join(outDir, m[1]!))) files.add(m[1]!);
    }
  }
  for (const name of fs.readdirSync(path.join(outDir, 'assets'))) {
    const size = fs.statSync(path.join(outDir, 'assets', name)).size;
    if (/\.(js|css|woff2)$/.test(name) && size <= PRECACHE_MAX_BYTES) files.add(`/assets/${name}`);
  }
  const list = [...files].sort();
  const hash = crypto.createHash('sha256');
  for (const f of list) hash.update(f).update(fs.readFileSync(path.join(outDir, f.endsWith('/') ? `${f}index.html` : f)));
  const template = fs.readFileSync(path.resolve(__dirname, 'scripts/sw.js'), 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'sw.js'),
    template.replace("'__VERSION__'", JSON.stringify(hash.digest('hex').slice(0, 12))).replace('__PRECACHE__', JSON.stringify(list)),
  );
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
      const { render, siteFiles, LLMS_FULL_LIMIT } = (await import(pathToFileURL(path.join(ssrDir, 'prerender.js')).href)) as {
        render: (page: PageId) => string;
        siteFiles: (today: string) => Record<string, string>;
        LLMS_FULL_LIMIT: number;
      };
      // Markdown of every page, llms.txt, llms-full.txt, ai.txt and robots.txt, from the same content as the pages
      const files = siteFiles(new Date().toISOString().slice(0, 10));
      for (const [name, content] of Object.entries(files)) {
        const file = path.resolve(outDir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
      }
      const full = files['llms-full.txt']!.length;
      if (full > LLMS_FULL_LIMIT) this.warn(`llms-full.txt is ${full} characters, over the ${LLMS_FULL_LIMIT} agents handle well`);
      for (const page of PAGES) {
        const file = path.resolve(outDir, htmlFile(page));
        const html = fs.readFileSync(file, 'utf8');
        const empty = `<div id="root" data-page="${page.id}"></div>`;
        if (!html.includes(empty)) throw new Error(`prerender: no empty #root in ${file}`);
        fs.writeFileSync(file, html.replace(empty, `<div id="root" data-page="${page.id}">${render(page.id)}</div>`));
      }
      fs.rmSync(ssrDir, { recursive: true, force: true });
      writeServiceWorker(outDir);
    },
  };
}

export default defineConfig({
  plugins: [wasmInline(), react(), tailwindcss(), contentSecurityPolicy(), pages(), prerender()],
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
