/** HTML meta tags for a page: title, description, canonical, Open Graph and Twitter. Pure functions. */

export interface MetaInput {
  title: string;
  description: string;
  url: string;
  siteName: string;
  image: string;
  imageAlt: string;
  type: 'website' | 'article';
  card: 'summary' | 'summary_large_image';
  twitterSite: string;
  index: boolean;
  follow: boolean;
  themeColor: string;
  charset: boolean;
  viewport: boolean;
}

export const EMPTY_META: MetaInput = {
  title: '',
  description: '',
  url: '',
  siteName: '',
  image: '',
  imageAlt: '',
  type: 'website',
  card: 'summary_large_image',
  twitterSite: '',
  index: true,
  follow: true,
  themeColor: '',
  charset: true,
  viewport: true,
};

/** Escapes text for an HTML attribute value in double quotes (and for element text). */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Newlines and tabs collapse to single spaces; meta values are one line. */
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/** "@handle" from "handle", "@handle" or a profile URL. */
export function twitterHandle(s: string): string {
  const t = oneLine(s);
  if (!t) return '';
  const fromUrl = t.match(/^(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i);
  const name = fromUrl ? fromUrl[1]! : t.replace(/^@+/, '');
  return '@' + name;
}

/** Problems worth showing next to the form (not blocking). */
export function warnings(m: MetaInput): string[] {
  const out: string[] = [];
  const abs = (u: string) => /^https?:\/\//i.test(u);
  if (oneLine(m.url) && !abs(oneLine(m.url))) out.push('The canonical URL should be absolute, starting with https://.');
  if (oneLine(m.image) && !abs(oneLine(m.image))) out.push('og:image should be an absolute URL; social sites don’t resolve relative paths.');
  if (oneLine(m.image) && !oneLine(m.imageAlt)) out.push('Add image alt text so the card image is described for screen readers.');
  if (m.themeColor && !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(m.themeColor.trim()) && oneLine(m.themeColor)) out.push('theme-color is usually a hex color like #1d4ed8.');
  if (m.twitterSite && !/^@[A-Za-z0-9_]{1,15}$/.test(twitterHandle(m.twitterSite))) out.push('An X (Twitter) handle has 1–15 letters, digits or underscores.');
  return out;
}

/** The tags, one per line, in the order they usually appear in <head>. */
export function buildMetaTags(m: MetaInput): string {
  const lines: string[] = [];
  const meta = (attr: 'name' | 'property', key: string, value: string) => {
    const v = oneLine(value);
    if (v) lines.push(`<meta ${attr}="${key}" content="${escapeHtml(v)}">`);
  };
  const title = oneLine(m.title);
  const description = oneLine(m.description);
  const url = oneLine(m.url);
  const image = oneLine(m.image);
  const imageAlt = oneLine(m.imageAlt);

  if (m.charset) lines.push('<meta charset="utf-8">');
  if (m.viewport) lines.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  if (title) lines.push(`<title>${escapeHtml(title)}</title>`);
  meta('name', 'description', description);
  if (url) lines.push(`<link rel="canonical" href="${escapeHtml(url)}">`);
  if (!m.index || !m.follow) meta('name', 'robots', `${m.index ? 'index' : 'noindex'}, ${m.follow ? 'follow' : 'nofollow'}`);
  meta('name', 'theme-color', m.themeColor);

  const og = lines.length;
  meta('property', 'og:type', title || description || url || image ? m.type : '');
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', url);
  meta('property', 'og:site_name', m.siteName);
  meta('property', 'og:image', image);
  meta('property', 'og:image:alt', image ? imageAlt : '');
  if (lines.length > og && og > 0) lines.splice(og, 0, '');

  const tw = lines.length;
  meta('name', 'twitter:card', title || description || image ? m.card : '');
  meta('name', 'twitter:site', twitterHandle(m.twitterSite));
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  meta('name', 'twitter:image', image);
  meta('name', 'twitter:image:alt', image ? imageAlt : '');
  if (lines.length > tw && tw > 0) lines.splice(tw, 0, '');

  return lines.length ? lines.join('\n') + '\n' : '';
}

/**
 * Rough lengths that search results and social cards tend to show before
 * cutting text off. They vary by device, font and site, so these are guides.
 */
export const LENGTHS = {
  title: { label: 'search results tend to show about 50–60 characters', max: 60 },
  description: { label: 'search snippets tend to show about 150–160 characters', max: 160 },
};

/** Counts user-perceived characters (an emoji is one). */
export function charCount(s: string): number {
  const t = oneLine(s);
  const Seg = (Intl as unknown as { Segmenter?: new () => { segment: (s: string) => Iterable<unknown> } }).Segmenter;
  if (Seg) {
    let n = 0;
    for (const _ of new Seg().segment(t)) n++;
    return n;
  }
  return Array.from(t).length;
}

/** Shortens to at most `max` characters at a word boundary, adding an ellipsis, for previews. */
export function truncate(s: string, max: number): string {
  const chars = Array.from(oneLine(s));
  if (chars.length <= max) return chars.join('');
  const cut = chars.slice(0, max).join('');
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, '') + '…';
}

/** "example.com › blog › post" style breadcrumb for the search preview. */
export function displayUrl(url: string): string {
  const t = oneLine(url);
  if (!t) return 'example.com';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    const parts = u.pathname.split('/').filter(Boolean).map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
    return [u.hostname.replace(/^www\./, ''), ...parts].join(' › ');
  } catch {
    return t;
  }
}

export function hostname(url: string): string {
  return displayUrl(url).split(' › ')[0]!;
}
