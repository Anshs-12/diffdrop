/** Small helpers for writing markdown: absolute links, escaping, code fences. */
import { SITE_URL } from '../../site';

/** An absolute URL on this site for a path ("/json-formatter/" → "https://…/json-formatter/"). Other URLs pass through. */
export function absoluteUrl(href: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return href;
  return `${SITE_URL}${href.startsWith('/') ? '' : '/'}${href}`;
}

/** Text safe inside a link label or a line: brackets and backslashes escaped, whitespace collapsed. */
export function escapeText(text: string): string {
  return text.replace(/\s+/g, ' ').replace(/([\\[\]])/g, '\\$1').trim();
}

/** "[text](absolute url)". */
export function link(text: string, href: string): string {
  return `[${escapeText(text)}](${absoluteUrl(href).replace(/[()\s]/g, (c) => encodeURIComponent(c))})`;
}

/** A fenced code block whose fence is longer than any run of backticks inside the code. */
export function codeBlock(code: string, lang = ''): string {
  const longest = Math.max(2, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${lang}\n${code.replace(/\n$/, '')}\n${fence}`;
}

/** Inline code, with a fence that can hold backticks in the text. */
export function inlineCode(code: string): string {
  const longest = Math.max(0, ...[...code.matchAll(/`+/g)].map((m) => m[0].length));
  const fence = '`'.repeat(longest + 1);
  const pad = code.startsWith('`') || code.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${code}${pad}${fence}`;
}

/** Plain page text as markdown: tag names written in prose (<span>, </div>) become inline code, so they aren't read as HTML. */
export function plain(text: string): string {
  return text.replace(/<\/?[a-zA-Z][\w-]*(?:\s[^<>]*)?\/?>/g, (tag) => inlineCode(tag));
}

/** Joins blocks with one blank line between them, dropping empty ones. */
export function blocks(...parts: (string | null | undefined | false)[]): string {
  return parts
    .filter((p): p is string => !!p && !!p.trim())
    .map((p) => p.trim())
    .join('\n\n');
}
