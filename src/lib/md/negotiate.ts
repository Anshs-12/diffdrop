/**
 * Which page a request wants as markdown. Used by the worker (src/worker.ts)
 * and the build, so it imports nothing from React and only relative paths.
 *
 * A page's markdown is reachable three ways:
 *   /json-formatter.md                         the .md suffix ("/index.md" for the home page)
 *   /json-formatter/ + Accept: text/markdown    content negotiation
 *   /api/md/json-formatter                      always markdown (handy for debugging)
 * The build writes each one to /_md/<name>.md (markdownFile below).
 */

/** Accept header entries, e.g. "text/markdown;q=0.9" → { type: 'text', subtype: 'markdown', q: 0.9 }. */
export function parseAccept(header: string): { type: string; subtype: string; q: number }[] {
  const out: { type: string; subtype: string; q: number }[] = [];
  for (const part of header.split(',')) {
    const [range, ...params] = part.trim().split(';');
    const [type, subtype] = (range ?? '').trim().toLowerCase().split('/');
    if (!type || !subtype) continue;
    let q = 1;
    for (const p of params) {
      const [k, v] = p.trim().split('=');
      if (k?.trim().toLowerCase() === 'q') {
        const n = Number(v);
        q = Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
      }
    }
    out.push({ type, subtype, q });
  }
  return out;
}

/** The q-value the header gives a media type, from its most specific matching range (exact, then type/*, then *\/*). */
function qualityOf(entries: ReturnType<typeof parseAccept>, type: string, subtype: string, allowWildcards: boolean): number {
  const exact = entries.filter((e) => e.type === type && e.subtype === subtype);
  if (exact.length) return Math.max(...exact.map((e) => e.q));
  if (!allowWildcards) return 0;
  const partial = entries.filter((e) => e.type === type && e.subtype === '*');
  if (partial.length) return Math.max(...partial.map((e) => e.q));
  const any = entries.filter((e) => e.type === '*' && e.subtype === '*');
  return any.length ? Math.max(...any.map((e) => e.q)) : 0;
}

/**
 * True only when the client names text/markdown and ranks it above HTML.
 * No header, "*\/*" or "text/*" alone always means HTML, so browsers, curl and
 * link previews never get markdown by accident.
 */
export function prefersMarkdown(accept: string | null | undefined): boolean {
  if (!accept) return false;
  const entries = parseAccept(accept);
  const markdown = qualityOf(entries, 'text', 'markdown', false);
  const html = qualityOf(entries, 'text', 'html', true);
  return markdown > 0 && markdown > html;
}

/** Where the build writes a page's markdown: "/" → "/_md/index.md", "/guides/x/" → "/_md/guides/x.md". */
export function markdownFile(pagePath: string): string {
  return pagePath === '/' ? '/_md/index.md' : `/_md${pagePath.slice(0, -1)}.md`;
}

/** The public .md URL of a page: "/" → "/index.md", "/json-formatter/" → "/json-formatter.md". */
export function markdownPath(pagePath: string): string {
  return pagePath === '/' ? '/index.md' : `${pagePath.slice(0, -1)}.md`;
}

/**
 * The page path a ".md" URL stands for, or null if the URL doesn't end in .md.
 * "/index.md" → "/", "/json-formatter.md" and "/json-formatter/index.md" → "/json-formatter/".
 */
export function pageForMarkdownPath(pathname: string): string | null {
  if (!pathname.endsWith('.md')) return null;
  let base = pathname.slice(0, -3);
  if (base.startsWith('/_md/') || base === '/_md') base = base.slice(4);
  if (base === '/index' || base === '') return '/';
  if (base.endsWith('/index')) base = base.slice(0, -'/index'.length);
  return `${base}/`;
}

export const API_PREFIX = '/api/md';
export const CATALOG_PATH = `${API_PREFIX}/_catalog`;

/** The page path an /api/md/… URL asks for: "/api/md" and "/api/md/" → "/", "/api/md/guides/x" → "/guides/x/". */
export function pageForApiPath(pathname: string): string | null {
  if (pathname !== API_PREFIX && !pathname.startsWith(`${API_PREFIX}/`)) return null;
  let rest = pathname.slice(API_PREFIX.length).replace(/\/+$/, '');
  if (rest.endsWith('.md')) return pageForMarkdownPath(rest);
  if (rest.endsWith('/index')) rest = rest.slice(0, -'/index'.length);
  return rest ? `${rest}/` : '/';
}
