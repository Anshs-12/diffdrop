/**
 * Markdown from the site's own static markup: the guides, about and contact
 * pages are written as JSX, rendered with renderToStaticMarkup, and converted
 * here. It handles the elements those pages use (headings, paragraphs, lists,
 * links, code, emphasis, details/summary); controls (buttons, SVG icons) are
 * left out because they do nothing in a text version.
 */
import { absoluteUrl, codeBlock, escapeText, inlineCode } from './format';

interface Node {
  tag: string;
  attrs: Record<string, string>;
  children: (Node | string)[];
}

const VOID = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr']);
const SKIP = new Set(['button', 'svg', 'script', 'style', 'input', 'select', 'textarea', 'img']);

function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** A tree from well-formed markup (React's output always is). */
function parse(html: string): Node {
  const root: Node = { tag: 'root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>|([^<]+)/g;
  for (const m of html.matchAll(re)) {
    const top = stack[stack.length - 1]!;
    if (m[5] != null) top.children.push(decode(m[5]));
    else if (m[1]) {
      const i = stack.map((n) => n.tag).lastIndexOf(m[1].toLowerCase());
      if (i > 0) stack.length = i;
    } else if (m[2]) {
      const attrs: Record<string, string> = {};
      for (const a of (m[3] ?? '').matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[a[1]!.toLowerCase()] = decode(a[2] ?? '');
      const node: Node = { tag: m[2].toLowerCase(), attrs, children: [] };
      top.children.push(node);
      if (!m[4] && !VOID.has(node.tag)) stack.push(node);
    }
  }
  return root;
}

const text = (n: Node | string): string => (typeof n === 'string' ? n : SKIP.has(n.tag) ? '' : n.children.map(text).join(''));

/** Markdown for inline content (inside a paragraph, heading or list item). */
function inline(nodes: (Node | string)[]): string {
  return nodes
    .map((n) => {
      if (typeof n === 'string') return n.replace(/\s+/g, ' ');
      if (SKIP.has(n.tag)) return '';
      const inner = inline(n.children);
      switch (n.tag) {
        case 'a': {
          const label = inner.trim();
          return n.attrs.href && label ? `[${escapeText(label)}](${absoluteUrl(n.attrs.href)})` : inner;
        }
        case 'code':
          return inlineCode(text(n));
        case 'strong':
        case 'b':
          return inner.trim() ? `**${inner.trim()}**` : '';
        case 'em':
        case 'i':
          return inner.trim() ? `*${inner.trim()}*` : '';
        case 'br':
          return '  \n';
        default:
          return inner;
      }
    })
    .join('');
}

const BLOCK = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'pre', 'details', 'summary', 'div', 'section', 'blockquote', 'table', 'figure', 'dl']);
const isBlock = (n: Node | string) => typeof n !== 'string' && BLOCK.has(n.tag);

/** Markdown blocks for a list of nodes; runs of inline content become paragraphs. */
function blockList(nodes: (Node | string)[], depth: number): string[] {
  const out: string[] = [];
  let run: (Node | string)[] = [];
  const flush = () => {
    const t = inline(run).trim();
    if (t) out.push(t);
    run = [];
  };
  for (const n of nodes) {
    if (!isBlock(n)) {
      run.push(n);
      continue;
    }
    flush();
    out.push(...block(n as Node, depth));
  }
  flush();
  return out;
}

function block(n: Node, depth: number): string[] {
  switch (n.tag) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4': {
      const level = Number(n.tag[1]);
      const t = inline(n.children).trim();
      return t ? [`${'#'.repeat(level)} ${t}`] : [];
    }
    case 'p': {
      const t = inline(n.children).trim();
      return t ? [t] : [];
    }
    case 'pre':
      return [codeBlock(text(n))];
    case 'summary': {
      const t = inline(n.children).trim();
      return t ? [`### ${t}`] : [];
    }
    case 'ul':
    case 'ol': {
      const items = n.children.filter((c): c is Node => typeof c !== 'string' && c.tag === 'li');
      const lines = items.map((li, i) => {
        const marker = n.tag === 'ol' ? `${i + 1}.` : '-';
        const [first = '', ...rest] = blockList(li.children, depth + 1);
        const indent = ' '.repeat(marker.length + 1);
        const more = rest.map((r) => `\n\n${r.replace(/^/gm, indent)}`).join('');
        return `${marker} ${first.replace(/\n/g, `\n${indent}`)}${more}`;
      });
      return lines.length ? [lines.join('\n')] : [];
    }
    case 'blockquote':
      return blockList(n.children, depth).map((b) => b.replace(/^/gm, '> '));
    default:
      return blockList(n.children, depth);
  }
}

/** Markdown for a fragment of the site's static markup. */
export function htmlToMarkdown(html: string): string {
  return blockList(parse(html).children, 0).join('\n\n');
}
