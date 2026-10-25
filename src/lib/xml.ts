/**
 * XML well-formedness checking, formatting and minifying, without a DOM.
 *
 * The parser follows the XML 1.0 well-formedness rules that matter in
 * practice: one root element, matching and properly nested tags, quoted and
 * unique attributes, no raw < or stray & in text, closed comments, CDATA and
 * processing instructions. Errors carry a 1-based line and column.
 *
 * Formatting and minifying only touch whitespace that sits between tags in
 * element-only content. Text, CDATA, attribute values and anything inside
 * xml:space="preserve" or mixed content (text next to tags) are kept exactly.
 */

export interface XmlElement {
  kind: 'element';
  name: string;
  /** Attributes as written, `name="value"`, in order. */
  attrs: string[];
  /** xml:space on this element, if set. */
  space: 'preserve' | 'default' | null;
  selfClosing: boolean;
  /** Source offsets: the '<' of the start tag, just after the start tag, just after the end tag. */
  start: number;
  inner: number;
  end: number;
  children: XmlNode[];
}

export type XmlNode =
  | XmlElement
  | { kind: 'text' | 'cdata' | 'comment' | 'pi' | 'decl' | 'doctype'; raw: string };

export type XmlParse =
  | { ok: true; prolog: XmlNode[]; root: XmlElement; epilog: XmlNode[] }
  | { ok: false; message: string; line: number; column: number };

export type XmlResult = { ok: true; text: string } | { ok: false; message: string; line: number | null; column: number | null };

const NAME = /[A-Za-z_:À-￿][\w.\-:·-￿]*/y;
const REF = /&(?:#[0-9]+|#x[0-9a-fA-F]+|([A-Za-z_:À-￿][\w.\-:·-￿]*));/y;
const PREDEFINED = new Set(['amp', 'lt', 'gt', 'quot', 'apos']);

class XmlError extends Error {
  constructor(
    message: string,
    readonly pos: number,
  ) {
    super(message);
  }
}

/** 1-based line and column of a source offset. */
export function position(src: string, pos: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = src.indexOf('\n'); i !== -1 && i < pos; i = src.indexOf('\n', i + 1)) {
    line++;
    lineStart = i + 1;
  }
  return { line, column: pos - lineStart + 1 };
}

function nameAt(src: string, pos: number): string | null {
  NAME.lastIndex = pos;
  const m = NAME.exec(src);
  return m ? m[0] : null;
}

const isSpace = (c: string | undefined) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

export function parseXml(src: string): XmlParse {
  try {
    return parse(src);
  } catch (e) {
    if (e instanceof XmlError) return { ok: false, message: e.message, ...position(src, e.pos) };
    return { ok: false, message: e instanceof Error ? e.message : String(e), line: 1, column: 1 };
  }
}

function parse(src: string): XmlParse {
  const n = src.length;
  const prolog: XmlNode[] = [];
  const epilog: XmlNode[] = [];
  const stack: XmlElement[] = [];
  let root: XmlElement | null = null;
  let hasDoctype = false;
  let i = src.charCodeAt(0) === 0xfeff ? 1 : 0;

  const add = (node: XmlNode) => {
    if (stack.length) stack[stack.length - 1]!.children.push(node);
    else if (node.kind !== 'element') (root ? epilog : prolog).push(node);
  };

  /** Every & must start a character or entity reference. */
  const checkRefs = (text: string, base: number) => {
    for (let k = text.indexOf('&'); k !== -1; k = text.indexOf('&', k + 1)) {
      REF.lastIndex = k;
      const m = REF.exec(text);
      if (!m) throw new XmlError('A bare & must be written &amp;', base + k);
      if (m[1] && !PREDEFINED.has(m[1]) && !hasDoctype) {
        throw new XmlError(`Unknown entity &${m[1]}; (without a DOCTYPE, XML only knows &amp; &lt; &gt; &quot; &apos;)`, base + k);
      }
    }
  };

  const skipSpace = (j: number) => {
    while (j < n && isSpace(src[j])) j++;
    return j;
  };

  while (i < n) {
    const lt = src.indexOf('<', i);
    const stop = lt === -1 ? n : lt;
    if (stop > i) {
      const seg = src.slice(i, stop);
      if (!stack.length) {
        const k = seg.search(/\S/);
        if (k !== -1) throw new XmlError(root ? 'Text after the root element' : 'XML must start with a tag, like <root>', i + k);
      } else {
        const bad = seg.indexOf(']]>');
        if (bad !== -1) throw new XmlError(']]> is not allowed in text', i + bad);
        checkRefs(seg, i);
        add({ kind: 'text', raw: seg });
      }
      i = stop;
    }
    if (lt === -1) break;

    if (src.startsWith('<!--', i)) {
      const close = src.indexOf('-->', i + 4);
      if (close === -1) throw new XmlError('Comment is never closed (missing -->)', i);
      const body = src.slice(i + 4, close);
      const dash = body.indexOf('--');
      if (dash !== -1) throw new XmlError('"--" is not allowed inside a comment', i + 4 + dash);
      if (body.endsWith('-')) throw new XmlError('A comment can’t end with --->', close - 1);
      add({ kind: 'comment', raw: src.slice(i, close + 3) });
      i = close + 3;
      continue;
    }
    if (src.startsWith('<![CDATA[', i)) {
      if (!stack.length) throw new XmlError('CDATA must be inside the root element', i);
      const close = src.indexOf(']]>', i + 9);
      if (close === -1) throw new XmlError('CDATA section is never closed (missing ]]>)', i);
      add({ kind: 'cdata', raw: src.slice(i, close + 3) });
      i = close + 3;
      continue;
    }
    if (src.startsWith('<!DOCTYPE', i)) {
      if (root) throw new XmlError('The DOCTYPE must come before the root element', i);
      if (hasDoctype) throw new XmlError('Only one DOCTYPE is allowed', i);
      let j = i + 9;
      let quote: string | null = null;
      let subset = false;
      for (; j < n; j++) {
        const c = src[j];
        if (quote) {
          if (c === quote) quote = null;
        } else if (c === '"' || c === "'") quote = c;
        else if (c === '[') subset = true;
        else if (c === ']') subset = false;
        else if (c === '>' && !subset) break;
      }
      if (j >= n) throw new XmlError('DOCTYPE is never closed (missing >)', i);
      hasDoctype = true;
      add({ kind: 'doctype', raw: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (src.startsWith('<!', i)) throw new XmlError('Unexpected <!: expected a comment <!-- -->, a CDATA section or a DOCTYPE', i);

    if (src.startsWith('<?', i)) {
      const target = nameAt(src, i + 2);
      if (!target) throw new XmlError('Expected a name after <?', i + 2);
      const close = src.indexOf('?>', i + 2);
      if (close === -1) throw new XmlError(`<?${target} is never closed (missing ?>)`, i);
      const decl = target.toLowerCase() === 'xml';
      if (decl && (root || prolog.length || stack.length)) throw new XmlError('The <?xml …?> declaration must come first', i);
      add({ kind: decl ? 'decl' : 'pi', raw: src.slice(i, close + 2) });
      i = close + 2;
      continue;
    }

    if (src[i + 1] === '/') {
      const name = nameAt(src, i + 2);
      if (!name) throw new XmlError('Expected a tag name after </', i + 2);
      const j = skipSpace(i + 2 + name.length);
      if (src[j] !== '>') throw new XmlError(`Expected > to end </${name}`, j);
      const open = stack.pop();
      if (!open) throw new XmlError(`Closing tag </${name}> has no opening tag`, i);
      if (open.name !== name) {
        throw new XmlError(`Closing tag </${name}> doesn’t match <${open.name}> from line ${position(src, open.start).line}`, i);
      }
      open.end = j + 1;
      i = j + 1;
      continue;
    }

    // A start tag
    const name = nameAt(src, i + 1);
    if (!name) throw new XmlError('A < in text must be written &lt;', i);
    if (root && !stack.length) throw new XmlError('Only one root element is allowed; wrap these elements in one parent', i);
    let j = i + 1 + name.length;
    const attrs: string[] = [];
    const seen = new Set<string>();
    let space: XmlElement['space'] = null;
    let selfClosing = false;
    for (;;) {
      const before = j;
      j = skipSpace(j);
      if (j >= n) throw new XmlError(`<${name}> is never closed (missing >)`, i);
      if (src[j] === '>') {
        j++;
        break;
      }
      if (src[j] === '/') {
        if (src[j + 1] !== '>') throw new XmlError(`Expected /> in <${name}>`, j);
        j += 2;
        selfClosing = true;
        break;
      }
      const attr = nameAt(src, j);
      if (!attr) throw new XmlError(`Unexpected ${JSON.stringify(src[j])} in <${name}>`, j);
      if (j === before) throw new XmlError(`Attributes in <${name}> must be separated by a space`, j);
      const attrStart = j;
      j = skipSpace(j + attr.length);
      if (src[j] !== '=') throw new XmlError(`Attribute ${attr} needs a value, like ${attr}="…"`, j);
      j = skipSpace(j + 1);
      const q = src[j];
      if (q !== '"' && q !== "'") throw new XmlError(`The value of ${attr} must be in quotes`, j);
      const close = src.indexOf(q, j + 1);
      if (close === -1) throw new XmlError(`The value of ${attr} is never closed`, j);
      const value = src.slice(j + 1, close);
      const lt2 = value.indexOf('<');
      if (lt2 !== -1) throw new XmlError('A < in an attribute value must be written &lt;', j + 1 + lt2);
      checkRefs(value, j + 1);
      if (seen.has(attr)) throw new XmlError(`Attribute ${attr} appears twice in <${name}>`, attrStart);
      seen.add(attr);
      if (attr === 'xml:space') space = value === 'preserve' ? 'preserve' : 'default';
      attrs.push(`${attr}=${q}${value}${q}`);
      j = close + 1;
    }
    const el: XmlElement = { kind: 'element', name, attrs, space, selfClosing, start: i, inner: j, end: j, children: [] };
    add(el);
    if (!root) root = el;
    if (!selfClosing) stack.push(el);
    i = j;
  }

  if (stack.length) {
    const open = stack[stack.length - 1]!;
    throw new XmlError(`<${open.name}> is never closed (expected </${open.name}>)`, open.start);
  }
  if (!root) throw new XmlError('No root element: XML needs one element that contains everything, like <root>…</root>', n);
  return { ok: true, prolog, root, epilog };
}

/** Well-formed or not, with the first error's line and column. */
export function checkXml(src: string): XmlResult {
  const p = parseXml(src);
  return p.ok ? { ok: true, text: src } : p;
}

/** Text or CDATA next to tags: whitespace there is part of the content. */
const isMixed = (el: XmlElement) => el.children.some((c) => c.kind === 'cdata' || (c.kind === 'text' && /\S/.test(c.raw)));
const hasMarkup = (el: XmlElement) => el.children.some((c) => c.kind !== 'text');

const startTag = (el: XmlElement) => `<${el.name}${el.attrs.map((a) => ' ' + a).join('')}${el.selfClosing ? '/' : ''}>`;

function tooDeep(e: unknown): XmlResult {
  if (e instanceof RangeError) return { ok: false, message: 'The XML is nested too deeply to process', line: null, column: null };
  return { ok: false, message: e instanceof Error ? e.message : String(e), line: null, column: null };
}

/** Pretty-print XML: one element per line in element-only content, everything else kept as written. */
export function formatXml(src: string, indent: string): XmlResult {
  const p = parseXml(src);
  if (!p.ok) return p;
  try {
    const out: string[] = [];
    const walk = (el: XmlElement, depth: number, preserve: boolean) => {
      const pad = indent.repeat(depth);
      const keep = el.space ? el.space === 'preserve' : preserve;
      if (el.selfClosing) {
        out.push(pad + startTag(el));
      } else if (keep || isMixed(el) || !hasMarkup(el)) {
        // Content exactly as written (text, mixed content, preserved space)
        out.push(pad + startTag(el) + src.slice(el.inner, el.end));
      } else {
        out.push(pad + startTag(el));
        for (const c of el.children) {
          if (c.kind === 'element') walk(c, depth + 1, keep);
          else if (c.kind !== 'text') out.push(indent.repeat(depth + 1) + c.raw);
        }
        out.push(`${pad}</${el.name}>`);
      }
    };
    for (const node of p.prolog) if (node.kind !== 'element') out.push(node.raw);
    walk(p.root, 0, false);
    for (const node of p.epilog) if (node.kind !== 'element') out.push(node.raw);
    return { ok: true, text: out.join('\n') + '\n' };
  } catch (e) {
    return tooDeep(e);
  }
}

/**
 * Minify XML: comments and the whitespace between tags removed, attributes
 * separated by single spaces. Text content, CDATA, xml:space="preserve" and
 * mixed content keep their whitespace.
 */
export function minifyXml(src: string): XmlResult {
  const p = parseXml(src);
  if (!p.ok) return p;
  try {
    let out = '';
    const walk = (el: XmlElement, preserve: boolean) => {
      out += startTag(el);
      if (el.selfClosing) return;
      const keep = el.space ? el.space === 'preserve' : preserve;
      const keepSpace = keep || isMixed(el) || !hasMarkup(el);
      for (const c of el.children) {
        if (c.kind === 'element') walk(c, keep);
        else if (c.kind === 'comment') continue;
        else if (c.kind === 'text') {
          if (keepSpace) out += c.raw;
        } else out += c.raw;
      }
      out += `</${el.name}>`;
    };
    for (const node of p.prolog) if (node.kind !== 'comment' && node.kind !== 'element') out += node.raw;
    walk(p.root, false);
    for (const node of p.epilog) if (node.kind === 'pi') out += node.raw;
    return { ok: true, text: out };
  } catch (e) {
    return tooDeep(e);
  }
}
