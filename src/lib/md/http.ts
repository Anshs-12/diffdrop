/**
 * Responses for the markdown versions of pages and the site files for AI
 * agents (llms.txt, llms-full.txt, ai.txt). Used by the worker.
 */

/** Every page is static, so caches may keep markdown for a day and serve it stale for a week while refreshing. */
export const MARKDOWN_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept',
  'Access-Control-Expose-Headers': 'Content-Location, Link, X-Markdown-Tokens, Last-Modified',
};

/** Rough token count (characters / 4), for X-Markdown-Tokens. */
export const approxTokens = (text: string) => Math.ceil(text.length / 4);

/** "Last updated: 2026-10-26" in a markdown body, as an HTTP date. */
function lastModified(body: string): string | null {
  const m = /^Last updated: (\d{4}-\d{2}-\d{2})$/m.exec(body);
  return m ? new Date(`${m[1]}T00:00:00Z`).toUTCString() : null;
}

/**
 * A markdown response. `canonical` is the HTML page it stands for; the
 * markdown is marked noindex so search engines keep the HTML as the page.
 * HEAD gets the same headers and no body.
 */
export function markdownResponse(
  body: string,
  { status = 200, canonical, negotiated = false, method = 'GET' }: { status?: number; canonical?: string; negotiated?: boolean; method?: string },
): Response {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'X-Markdown-Tokens': String(approxTokens(body)),
    'X-Robots-Tag': 'noindex, follow',
    'Cache-Control': status === 200 ? MARKDOWN_CACHE : 'public, max-age=300',
    ...CORS,
  });
  if (canonical) {
    headers.set('Content-Location', canonical);
    headers.set('Link', `<${canonical}>; rel="canonical"`);
  }
  if (negotiated) headers.set('Vary', 'Accept');
  const modified = lastModified(body);
  if (modified) headers.set('Last-Modified', modified);
  return new Response(method === 'HEAD' ? null : body, { status, headers });
}

/** The markdown 404: still markdown, never the HTML error page. */
export function markdownNotFound(path: string, siteUrl: string, method = 'GET'): Response {
  const body = `# Not found\n\n> There is no page at ${path}.\n\nSee the list of pages at ${siteUrl}/llms.txt, or the full catalog at ${siteUrl}/api/md/_catalog.\n`;
  return markdownResponse(body, { status: 404, method });
}

/** Preflight for cross-origin agents. */
export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Max-Age': '86400' } });
}
