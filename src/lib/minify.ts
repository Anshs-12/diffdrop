/**
 * Conservative minifiers for CSS and HTML. They only remove comments and
 * whitespace that can't matter; strings, url(), calc() spacing, and the
 * contents of <pre>, <textarea>, <script> and <style> are left as written.
 */

/** Whitespace after these never matters in CSS (combinators only outside parentheses). */
const CSS_TIGHT_AFTER = new Set(['{', '}', ';', ',', ':', '(']);
/** …nor before these. Not "(": "and (min-width…)" needs its space. */
const CSS_TIGHT_BEFORE = new Set(['{', '}', ';', ',', ')']);
const CSS_COMBINATOR = new Set(['>', '~', '+']);

/** Minify CSS: comments (except /*! … *\/) and needless whitespace removed. */
export function minifyCss(code: string): string {
  const out: string[] = [];
  /** The last character written, and whether a space or a ";" is waiting to be written. */
  let last: string | undefined;
  let space = false;
  let semi = false;
  let depth = 0;
  const n = code.length;
  const tightAfter = (c: string | undefined) => c === undefined || CSS_TIGHT_AFTER.has(c) || (depth === 0 && CSS_COMBINATOR.has(c));
  const tightBefore = (c: string) => CSS_TIGHT_BEFORE.has(c) || (depth === 0 && CSS_COMBINATOR.has(c));
  const emit = (s: string, first: string) => {
    // A ";" right before "}" isn't needed
    if (semi && first !== '}') {
      out.push(';');
      last = ';';
    }
    semi = false;
    if (space && !tightAfter(last) && !tightBefore(first)) out.push(' ');
    space = false;
    out.push(s);
    last = s[s.length - 1];
  };
  for (let i = 0; i < n; ) {
    const c = code[i]!;
    if (c === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      if (code[i + 2] === '!') {
        // A /*! comment */ is a licence or note meant to survive minifying
        emit(code.slice(i, stop), '/');
        last = '{'; // nothing needs a space after it
      } else space = true;
      i = stop;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f') {
      space = true;
      i++;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && code[j] !== c && code[j] !== '\n') j += code[j] === '\\' ? 2 : 1;
      emit(code.slice(i, j + 1), c);
      i = j + 1;
      continue;
    }
    if (c === '\\') {
      emit(code.slice(i, i + 2), c);
      i += 2;
      continue;
    }
    if (c === ';') {
      // Held back: it's dropped if a "}" comes next, and the space before it never matters
      if (last !== undefined) semi = true;
      space = false;
      i++;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    emit(c, c);
    i++;
  }
  if (semi) out.push(';');
  return out.join('');
}

/** Their content is kept byte for byte. */
const RAW_TEXT = new Set(['pre', 'textarea', 'script', 'style']);
/**
 * Whitespace between two of these never renders (document head, table
 * structure, select options), so it can go entirely. Between other tags it
 * becomes one space, since inline and inline-block elements show it.
 */
const SILENT = new Set([
  '!doctype', 'html', 'head', 'body', 'meta', 'link', 'title', 'base', 'script', 'style',
  'table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'select', 'option', 'optgroup',
]);

type HtmlToken = { type: 'tag'; name: string; raw: string } | { type: 'text'; raw: string } | { type: 'raw'; raw: string };

/** Collapse whitespace outside quotes in a tag, and drop it before > or />. */
function tidyTag(tag: string): string {
  let out = '';
  let quote: string | null = null;
  let space = false;
  for (let i = 0; i < tag.length; i++) {
    const c = tag[i]!;
    if (quote) {
      out += c;
      if (c === quote) quote = null;
      continue;
    }
    if (/\s/.test(c)) {
      space = true;
      continue;
    }
    if (space) {
      const closing = c === '>' || (c === '/' && tag[i + 1] === '>');
      if (!closing && !out.endsWith('=') && c !== '=') out += ' ';
      space = false;
    }
    if ((c === '"' || c === "'") && /[=\s]$/.test(out)) quote = c;
    out += c;
  }
  return out;
}

function tokenizeHtml(src: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  const n = src.length;
  let text = '';
  const flush = () => {
    if (text) tokens.push({ type: 'text', raw: text });
    text = '';
  };
  let i = 0;
  while (i < n) {
    const c = src[i];
    if (c !== '<') {
      const next = src.indexOf('<', i);
      const stop = next === -1 ? n : next;
      text += src.slice(i, stop);
      i = stop;
      continue;
    }
    if (src.startsWith('<!--', i)) {
      const end = src.indexOf('-->', i + 4);
      const stop = end === -1 ? n : end + 3;
      const comment = src.slice(i, stop);
      // Conditional comments (<!--[if IE]>) still do something; plain comments don't
      if (/^<!--\[if\b|^<!--\s*<!\[endif\]/i.test(comment) || end === -1) {
        flush();
        tokens.push({ type: 'raw', raw: comment });
      }
      i = stop;
      continue;
    }
    if (src.startsWith('<![CDATA[', i)) {
      const end = src.indexOf(']]>', i);
      const stop = end === -1 ? n : end + 3;
      flush();
      tokens.push({ type: 'raw', raw: src.slice(i, stop) });
      i = stop;
      continue;
    }
    const m = /^<(\/?)([A-Za-z][\w:-]*|!doctype\b)/i.exec(src.slice(i, i + 64));
    if (!m && !/^<[!?]/.test(src.slice(i, i + 2))) {
      text += '<';
      i++;
      continue;
    }
    // Read to the closing >, skipping quoted attribute values
    let j = i + 1;
    let quote: string | null = null;
    for (; j < n; j++) {
      const d = src[j];
      if (quote) {
        if (d === quote) quote = null;
      } else if (d === '"' || d === "'") {
        // Only a quote that starts an attribute value opens a quoted run
        if (/[=\s]/.test(src[j - 1] ?? '')) quote = d;
      } else if (d === '>') break;
    }
    const raw = src.slice(i, Math.min(j + 1, n));
    flush();
    const name = m ? (m[1] ? '/' : '') + m[2]!.toLowerCase() : '!';
    tokens.push({ type: 'tag', name, raw: tidyTag(raw) });
    i = j + 1;
    const bare = name.replace('/', '');
    if (!name.startsWith('/') && RAW_TEXT.has(bare) && !raw.endsWith('/>')) {
      const close = new RegExp(`</${bare}[\\s>/]`, 'gi');
      close.lastIndex = i;
      const found = close.exec(src);
      const stop = found ? found.index : n;
      if (stop > i) tokens.push({ type: 'raw', raw: src.slice(i, stop) });
      i = stop;
    }
  }
  flush();
  return tokens;
}

/**
 * Minify HTML conservatively: comments removed (not conditional comments),
 * runs of whitespace collapsed to one space, and whitespace dropped where it
 * never renders. <pre>, <textarea>, <script> and <style> are kept exactly.
 */
export function minifyHtml(src: string): string {
  const tokens = tokenizeHtml(src);
  const tagName = (t: HtmlToken | undefined) => (t?.type === 'tag' ? t.name.replace('/', '') : t ? null : '!doctype');
  let out = '';
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k]!;
    if (t.type !== 'text') {
      out += t.raw;
      continue;
    }
    if (/\S/.test(t.raw)) {
      let collapsed = t.raw.replace(/\s+/g, ' ');
      if (k === 0) collapsed = collapsed.trimStart();
      if (k === tokens.length - 1) collapsed = collapsed.trimEnd();
      out += collapsed;
      continue;
    }
    const before = tagName(tokens[k - 1]);
    const after = tagName(tokens[k + 1]);
    const silent = (name: string | null) => name !== null && SILENT.has(name);
    if (k === 0 || k === tokens.length - 1 || (silent(before) && silent(after))) continue;
    out += ' ';
  }
  return out;
}
