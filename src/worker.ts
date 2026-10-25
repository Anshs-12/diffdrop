/**
 * Cloudflare Worker in front of the static site (see wrangler.jsonc). Requests
 * to the site's old workers.dev address are sent to the same path and query on
 * the current domain with a permanent (301) redirect; everything else is served
 * from the built files, plus the markdown versions of pages for AI agents:
 *   /json-formatter.md, /index.md                 markdown by URL
 *   /json-formatter/ with Accept: text/markdown   markdown by content negotiation
 *   /api/md/json-formatter, /api/md/_catalog      always markdown (or the JSON catalog)
 * The markdown files themselves are written by the build into /_md/ (see
 * src/lib/md/siteFiles.ts).
 */
import { OLD_HOST, PAGES, SITE_URL } from './site';
import { CATALOG_PATH, markdownFile, pageForApiPath, pageForMarkdownPath, prefersMarkdown } from './lib/md/negotiate';
import { CORS, MARKDOWN_CACHE, markdownNotFound, markdownResponse, optionsResponse } from './lib/md/http';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

/** Pages that can be negotiated to markdown: an explicit list, so nothing else is ever rewritten. */
const PAGE_PATHS = new Set(PAGES.map((p) => p.path));

/** The site files for agents, served as plain text with long caching and open CORS. */
const AGENT_FILES = new Set(['/llms.txt', '/llms-full.txt', '/ai.txt']);

/** On every HTML page: where the agent files are. */
const DESCRIBED_BY = ['/llms.txt', '/llms-full.txt', '/ai.txt'].map((f) => `<${SITE_URL}${f}>; rel="describedby"`).join(', ');

/** A page's markdown from the build output, or the markdown 404. */
async function serveMarkdown(env: Env, request: Request, pagePath: string, negotiated: boolean): Promise<Response> {
  if (!PAGE_PATHS.has(pagePath)) return markdownNotFound(pagePath, SITE_URL, request.method);
  const res = await env.ASSETS.fetch(new Request(new URL(markdownFile(pagePath), request.url)));
  if (!res.ok) return markdownNotFound(pagePath, SITE_URL, request.method);
  return markdownResponse(await res.text(), { canonical: `${SITE_URL}${pagePath}`, negotiated, method: request.method });
}

/** Copies a response so its headers can be changed. */
function withHeaders(res: Response, headers: Record<string, string>): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(headers)) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === OLD_HOST) {
      return Response.redirect(`${SITE_URL}${url.pathname}${url.search}`, 301);
    }
    const { pathname } = url;
    const read = request.method === 'GET' || request.method === 'HEAD';

    // Markdown: /api/md/…, then anything ending in .md (the site has no real .md files)
    const apiPage = pageForApiPath(pathname);
    const mdPage = apiPage ?? pageForMarkdownPath(pathname);
    if (mdPage !== null || pathname === CATALOG_PATH) {
      if (request.method === 'OPTIONS') return optionsResponse();
      if (!read) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD, OPTIONS', ...CORS } });
      if (pathname === CATALOG_PATH) {
        const res = await env.ASSETS.fetch(new Request(new URL('/_md/_catalog.json', request.url)));
        return withHeaders(res, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': MARKDOWN_CACHE, 'X-Robots-Tag': 'noindex', ...CORS });
      }
      return serveMarkdown(env, request, mdPage!, false);
    }

    // The same page as markdown, when the client asks for it by Accept
    if (read && PAGE_PATHS.has(pathname) && prefersMarkdown(request.headers.get('Accept'))) {
      return serveMarkdown(env, request, pathname, true);
    }

    const res = await env.ASSETS.fetch(request);
    if (AGENT_FILES.has(pathname)) {
      if (request.method === 'OPTIONS') return optionsResponse();
      return withHeaders(res, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': MARKDOWN_CACHE, ...CORS });
    }
    if (res.headers.get('Content-Type')?.includes('text/html')) {
      const headers: Record<string, string> = { Link: DESCRIBED_BY };
      // The same URL can also answer with markdown, so caches must key on Accept
      if (PAGE_PATHS.has(pathname)) headers.Vary = 'Accept';
      return withHeaders(res, headers);
    }
    return res;
  },
};
