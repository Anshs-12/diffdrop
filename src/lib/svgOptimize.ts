/**
 * A small SVG minifier that runs in the browser: parse with DOMParser, drop
 * what doesn’t affect rendering, round numbers, serialize with XMLSerializer.
 * The number and path helpers are pure; `optimizeSvg` needs DOMParser.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const XMLNS_NS = 'http://www.w3.org/2000/xmlns/';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

/** Namespaces of editor data that browsers ignore. */
const EDITOR_NS = [
  'http://www.inkscape.org/namespaces/inkscape',
  'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
  'http://inkscape.sourceforge.net/DTD/sodipodi-0.dtd',
  'http://www.bohemiancoding.com/sketch/ns',
  'http://ns.adobe.com/AdobeIllustrator/10.0/',
  'http://ns.adobe.com/Graphs/1.0/',
  'http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/',
  'http://ns.adobe.com/Variables/1.0/',
  'http://ns.adobe.com/SaveForWeb/1.0/',
  'http://ns.adobe.com/Extensibility/1.0/',
  'http://ns.adobe.com/Flows/1.0/',
  'http://ns.adobe.com/ImageReplacement/1.0/',
  'http://ns.adobe.com/GenericCustomNamespace/1.0/',
  'http://ns.adobe.com/XPath/1.0/',
  'http://www.figma.com/figma/ns',
  'http://www.serif.com/',
  'http://www.vector.evaxdesign.sk',
  'http://creativecommons.org/ns#',
  'http://purl.org/dc/elements/1.1/',
  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
];
const EDITOR_PREFIXES = ['inkscape', 'sodipodi', 'sketch', 'i', 'x', 'graph', 'a', 'figma', 'serif', 'vectornator', 'cc', 'dc', 'rdf'];

/** Attributes editors add that have no effect on rendering. */
const EDITOR_ATTRS = new Set(['data-name', 'enable-background']);

export function isEditorNamespace(ns: string | null): boolean {
  return !!ns && EDITOR_NS.includes(ns);
}

/** An attribute an editor wrote for itself (inkscape:label, sketch:type, data-name…). */
export function isEditorAttribute(name: string, ns: string | null): boolean {
  if (isEditorNamespace(ns)) return true;
  if (EDITOR_ATTRS.has(name)) return true;
  const prefix = name.includes(':') ? name.slice(0, name.indexOf(':')) : '';
  return prefix !== '' && prefix !== 'xlink' && prefix !== 'xml' && prefix !== 'xmlns' && EDITOR_PREFIXES.includes(prefix) && ns !== SVG_NS;
}

/** A URL that runs code: javascript:, vbscript: or data:text/html (ignoring the spaces and control characters browsers skip). */
export function isUnsafeUrl(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  const v = value.replace(/[\u0000- \u007f-\u009f]+/g, '').toLowerCase();
  return v.startsWith('javascript:') || v.startsWith('vbscript:') || v.startsWith('data:text/html');
}

/** A number written as short as possible after rounding: 0.50 → .5, -0.25 → -.25, 3.000 → 3. */
export function formatNumber(n: number, decimals: number): string {
  let v = Number(n.toFixed(decimals));
  if (Object.is(v, -0)) v = 0;
  let s = String(v);
  if (/e/i.test(s)) return s;
  if (s.startsWith('0.')) s = s.slice(1);
  else if (s.startsWith('-0.')) s = `-${s.slice(2)}`;
  return s;
}

const NUM = /[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/y;

/** Joins numbers, adding a space only where the next one would otherwise run into the last. */
function joinNumbers(parts: string[]): string {
  let out = '';
  let prev = '';
  for (const p of parts) {
    if (!out) out = p;
    else if (p.startsWith('-') || (p.startsWith('.') && /[.eE]/.test(prev))) out += p;
    else out += ` ${p}`;
    prev = p;
  }
  return out;
}

const ARITY: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, c: 6, s: 4, q: 4, t: 2, a: 7, z: 0 };

/**
 * Path data with numbers rounded and separators trimmed. Command letters and
 * their grouping are kept as written; arc flags are read as single digits.
 * Returns null for path data it can’t read, so the caller can keep the original.
 */
export function roundPath(d: string, decimals: number): string | null {
  const segs: { cmd: string; args: string[] }[] = [];
  let i = 0;
  const skip = () => {
    while (i < d.length && /[\s,]/.test(d[i]!)) i++;
  };
  skip();
  while (i < d.length) {
    const cmd = d[i]!;
    const arity = ARITY[cmd.toLowerCase()];
    if (arity === undefined) return null;
    if (!segs.length && cmd.toLowerCase() !== 'm') return null;
    i++;
    const args: string[] = [];
    skip();
    if (arity === 0) {
      segs.push({ cmd, args });
      continue;
    }
    while (i < d.length && !/[a-df-zA-DF-Z]/.test(d[i]!)) {
      const pos = args.length % arity;
      if (cmd.toLowerCase() === 'a' && (pos === 3 || pos === 4)) {
        const flag = d[i];
        if (flag !== '0' && flag !== '1') return null;
        args.push(flag);
        i++;
      } else {
        NUM.lastIndex = i;
        const m = NUM.exec(d);
        if (!m) return null;
        const raw = m[0];
        i += raw.length;
        args.push(/[.eE]/.test(raw) ? formatNumber(Number(raw), decimals) : formatNumber(Number(raw), 0));
      }
      skip();
    }
    if (!args.length || args.length % arity !== 0) return null;
    segs.push({ cmd, args });
  }
  return segs.map((s) => s.cmd + joinNumbers(s.args)).join('');
}

/** A list of numbers (points, viewBox, stroke-dasharray) rounded and joined with single spaces or signs. */
export function roundList(value: string, decimals: number): string | null {
  const parts = value.trim().split(/[\s,]+/).filter(Boolean);
  if (!parts.length) return null;
  const out: string[] = [];
  for (const p of parts) {
    if (!/^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?$/.test(p)) return null;
    out.push(formatNumber(Number(p), decimals));
  }
  return joinNumbers(out);
}

/** One number with an optional unit ("12.3456px"), rounded; null if it isn’t that. */
export function roundLength(value: string, decimals: number): string | null {
  const m = /^\s*([-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?)(px|%|em|ex|pt|pc|cm|mm|in)?\s*$/.exec(value);
  if (!m) return null;
  return formatNumber(Number(m[1]), decimals) + (m[2] ?? '');
}

/** transform="translate(10.12345, 20) rotate(45.0)" with each function’s numbers rounded. */
export function roundTransform(value: string, decimals: number): string | null {
  const fns = [...value.matchAll(/([a-zA-Z]+)\s*\(([^)]*)\)/g)];
  if (!fns.length) return null;
  const rest = value.replace(/([a-zA-Z]+)\s*\(([^)]*)\)/g, '').replace(/[\s,]/g, '');
  if (rest) return null;
  const out: string[] = [];
  for (const [, name, args] of fns) {
    const list = roundList(args!, decimals);
    if (list == null) return null;
    out.push(`${name}(${list})`);
  }
  return out.join(' ');
}

const LENGTH_ATTRS = new Set([
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'stroke-width', 'stroke-dashoffset', 'font-size', 'dx', 'dy', 'refX', 'refY', 'markerWidth', 'markerHeight', 'offset',
]);
const LIST_ATTRS = new Set(['points', 'viewBox', 'stroke-dasharray']);
const TRANSFORM_ATTRS = new Set(['transform', 'gradientTransform', 'patternTransform']);

/** Presentation attributes that are inherited, with their initial values. */
const INHERITED_DEFAULTS: Record<string, string[]> = {
  'fill-opacity': ['1'],
  'stroke-opacity': ['1'],
  'stroke-width': ['1', '1px'],
  'stroke-linecap': ['butt'],
  'stroke-linejoin': ['miter'],
  'stroke-miterlimit': ['4'],
  'stroke-dashoffset': ['0'],
  'stroke-dasharray': ['none'],
  'fill-rule': ['nonzero'],
  'clip-rule': ['nonzero'],
  stroke: ['none'],
  fill: ['#000', '#000000', 'black'],
  visibility: ['visible'],
};
/** Attributes whose default is zero on these elements and that nothing inherits. */
const ZERO_DEFAULTS: Record<string, string[]> = {
  rect: ['x', 'y'],
  image: ['x', 'y'],
  use: ['x', 'y'],
  circle: ['cx', 'cy'],
  ellipse: ['cx', 'cy'],
  line: ['x1', 'y1', 'x2', 'y2'],
};

export interface SvgOptions {
  /** Decimal places for numbers, or -1 to leave numbers as written. */
  decimals: number;
  removeTitle: boolean;
}

export interface SvgReport {
  comments: number;
  metadata: number;
  editorItems: number;
  emptyItems: number;
  defaults: number;
  scripts: number;
  eventHandlers: number;
  unsafeLinks: number;
  titles: number;
  addedNamespace: boolean;
}

export type SvgResult = { ok: true; output: string; report: SvgReport } | { ok: false; message: string };

/** The parser’s complaint, trimmed to the useful part. */
function parseError(doc: Document): string | null {
  const err = doc.getElementsByTagName('parsererror')[0];
  if (!err) return null;
  const text = (err.textContent ?? '').replace(/\s+/g, ' ').trim();
  const m = /error on line \d+ at column \d+: [^.]*(\.|$)/i.exec(text) ?? /XML Parsing Error:.*?(Location|$)/i.exec(text);
  return (m ? m[0].replace(/Location$/, '') : text).trim() || 'This isn’t valid SVG (XML)';
}

const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'data']);
/** HTML that can run or load code, found inside <foreignObject>. */
const EMBEDS = new Set(['iframe', 'frame', 'embed', 'object', 'applet', 'base', 'meta', 'link']);

const TEXT_ELEMENTS = new Set(['text', 'tspan', 'textPath', 'style', 'script', 'title', 'desc']);

export function optimizeSvg(input: string, opts: SvgOptions, Parser: typeof DOMParser = DOMParser, Serializer: typeof XMLSerializer = XMLSerializer): SvgResult {
  if (!input.trim()) return { ok: false, message: 'empty' };
  let source = input;
  let doc = new Parser().parseFromString(source, 'image/svg+xml');
  const err = parseError(doc);
  if (err) return { ok: false, message: err };
  let root = doc.documentElement;
  if (root.localName !== 'svg') return { ok: false, message: `The top element is <${root.localName}>, not <svg>` };
  let addedNamespace = false;
  if (root.namespaceURI !== SVG_NS) {
    // Without xmlns the file isn’t SVG to a browser; add it and read it again
    source = source.replace(/<svg\b/, `<svg xmlns="${SVG_NS}"`);
    doc = new Parser().parseFromString(source, 'image/svg+xml');
    const err2 = parseError(doc);
    if (err2) return { ok: false, message: err2 };
    root = doc.documentElement;
    if (root.namespaceURI !== SVG_NS) return { ok: false, message: 'The <svg> element has a different namespace' };
    addedNamespace = true;
  }

  const report: SvgReport = { comments: 0, metadata: 0, editorItems: 0, emptyItems: 0, defaults: 0, scripts: 0, eventHandlers: 0, unsafeLinks: 0, titles: 0, addedNamespace };
  const hasStyleSheet = root.getElementsByTagNameNS(SVG_NS, 'style').length > 0;
  // IDs something points at (href="#id", url(#id)); elements with other IDs are treated like any other
  const referenced = new Set([...input.matchAll(/(?:href\s*=\s*["']\s*#|url\(\s*["']?#)([^"')\s]+)/g)].map((m) => m[1]!));
  /** True when this element or one around it can be drawn by a <use>, which would pass on its own fill and stroke. */
  const isReferenced = (el: Element) => {
    for (let e: Element | null = el; e; e = e.parentElement) if (e.hasAttribute('id') && referenced.has(e.getAttribute('id')!)) return true;
    return false;
  };

  const walk = (el: Element, inReusable: boolean) => {
    const name = el.localName;
    const reusable = inReusable || name === 'defs' || name === 'symbol' || name === 'pattern' || name === 'marker' || name === 'mask' || name === 'clipPath';
    // Whitespace between elements never renders; only text content elements keep theirs
    const keepSpace = TEXT_ELEMENTS.has(name);

    for (const attr of [...el.attributes]) {
      const an = attr.name;
      const local = attr.localName;
      if (attr.namespaceURI === XMLNS_NS) {
        const redundantSvg = an !== 'xmlns' && attr.value === SVG_NS && !hasPrefix(root, local);
        if (redundantSvg || isEditorNamespace(attr.value) || (an !== 'xmlns' && EDITOR_PREFIXES.includes(local) && attr.value !== XLINK_NS && attr.value !== SVG_NS)) {
          el.removeAttributeNode(attr);
          report.editorItems++;
        }
        continue;
      }
      if (/^on/i.test(local)) {
        el.removeAttributeNode(attr);
        report.eventHandlers++;
        continue;
      }
      if (URL_ATTRS.has(local) && isUnsafeUrl(attr.value)) {
        el.removeAttributeNode(attr);
        report.unsafeLinks++;
        continue;
      }
      if (isEditorAttribute(an, attr.namespaceURI)) {
        el.removeAttributeNode(attr);
        report.editorItems++;
        continue;
      }
      if (!attr.value.trim() && an !== 'xmlns') {
        el.removeAttributeNode(attr);
        report.emptyItems++;
        continue;
      }
      const v = attr.value.trim();
      if (an === 'opacity' && (v === '1' || v === '1.0')) {
        el.removeAttributeNode(attr);
        report.defaults++;
        continue;
      }
      if (ZERO_DEFAULTS[name]?.includes(an) && /^[-+]?(0+\.?0*|\.0+)(px)?$/.test(v)) {
        el.removeAttributeNode(attr);
        report.defaults++;
        continue;
      }
      // Inherited defaults are only safe to drop when nothing above could change them
      if (!hasStyleSheet && !reusable && !isReferenced(el) && INHERITED_DEFAULTS[an]?.includes(v.toLowerCase()) && !ancestorSets(el, an)) {
        el.removeAttributeNode(attr);
        report.defaults++;
        continue;
      }
      if (opts.decimals >= 0) {
        let next: string | null = null;
        if (an === 'd' && name === 'path') next = roundPath(v, opts.decimals);
        else if (LIST_ATTRS.has(an)) next = roundList(v, opts.decimals);
        else if (TRANSFORM_ATTRS.has(an)) next = roundTransform(v, opts.decimals);
        else if (LENGTH_ATTRS.has(an)) next = roundLength(v, opts.decimals);
        if (next != null && next !== attr.value) attr.value = next;
      }
    }

    for (const child of [...el.childNodes]) {
      if (child.nodeType === 8) {
        el.removeChild(child);
        report.comments++;
      } else if (child.nodeType === 7) {
        el.removeChild(child);
      } else if (child.nodeType === 3 || child.nodeType === 4) {
        if (!keepSpace && !(child.nodeValue ?? '').trim()) el.removeChild(child);
      } else if (child.nodeType === 1) {
        const c = child as Element;
        const cn = c.localName;
        if (cn === 'script' || (c.namespaceURI !== SVG_NS && EMBEDS.has(cn))) {
          el.removeChild(c);
          report.scripts++;
        } else if ((cn === 'set' || cn === 'animate') && ['to', 'from', 'values'].some((a) => isUnsafeUrl(c.getAttribute(a) ?? '') || /javascript:/i.test(c.getAttribute(a) ?? ''))) {
          el.removeChild(c);
          report.unsafeLinks++;
        } else if (isEditorNamespace(c.namespaceURI) || (c.prefix && EDITOR_PREFIXES.includes(c.prefix))) {
          el.removeChild(c);
          report.editorItems++;
        } else if (cn === 'metadata') {
          el.removeChild(c);
          report.metadata++;
        } else if ((cn === 'title' || cn === 'desc') && opts.removeTitle) {
          el.removeChild(c);
          report.titles++;
        } else {
          walk(c, reusable);
          if ((cn === 'g' || cn === 'defs' || cn === 'style') && !c.hasChildNodes()) {
            el.removeChild(c);
            report.emptyItems++;
          }
        }
      }
    }
  };

  // Comments and processing instructions outside <svg> go too
  for (const n of [...doc.childNodes]) {
    if (n.nodeType === 8) {
      doc.removeChild(n);
      report.comments++;
    }
  }
  walk(root, false);

  // xmlns:xlink is only needed while something still uses it
  if (root.hasAttribute('xmlns:xlink') && !usesXlink(root)) root.removeAttribute('xmlns:xlink');

  const output = new Serializer().serializeToString(root);
  return { ok: true, output, report };
}

function ancestorSets(el: Element, attr: string): boolean {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (p.hasAttribute(attr)) return true;
    if ((p.getAttribute('style') ?? '').includes(attr)) return true;
  }
  return (el.getAttribute('style') ?? '').includes(attr);
}

function hasPrefix(root: Element, prefix: string): boolean {
  return [root, ...root.getElementsByTagName('*')].some((e) => e.prefix === prefix);
}

function usesXlink(root: Element): boolean {
  const all = [root, ...root.getElementsByTagName('*')];
  return all.some((e) => [...e.attributes].some((a) => a.namespaceURI === XLINK_NS));
}

/** What was removed, in words, for the status line. */
export function describeReport(r: SvgReport): string[] {
  const out: string[] = [];
  const n = (count: number, one: string, many = `${one}s`) => (count ? `${count} ${count === 1 ? one : many}` : '');
  const items = [
    n(r.comments, 'comment'),
    n(r.metadata, 'metadata block'),
    n(r.editorItems, 'editor attribute or element', 'editor attributes and elements'),
    n(r.emptyItems, 'empty group or attribute', 'empty groups and attributes'),
    n(r.defaults, 'default value'),
    n(r.titles, 'title or description', 'titles and descriptions'),
  ].filter(Boolean);
  if (items.length) out.push(`Removed ${items.join(', ')}.`);
  const unsafe = [n(r.scripts, 'script'), n(r.eventHandlers, 'event handler attribute', 'event handler attributes'), n(r.unsafeLinks, 'javascript: link')].filter(Boolean);
  if (unsafe.length) out.push(`Stripped ${unsafe.join(', ')}: scripts don’t belong in an image.`);
  if (r.addedNamespace) out.push('Added the missing xmlns="http://www.w3.org/2000/svg".');
  return out;
}
