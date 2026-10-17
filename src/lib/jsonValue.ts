/**
 * Parsing for the JSON tools that keeps numbers exactly as written, plus a scan
 * of the source text for things a parsed value can't show: duplicate keys,
 * keys the browser reorders, and numbers it would round.
 */

/**
 * A number whose JSON text a JS number can't reproduce: big integers
 * (12345678901234567890), trailing zeros (1.0), exponents (1e5) and -0.
 * Write values containing these with `stringify`, which keeps the original text.
 */
export class JsonNumber {
  constructor(readonly source: string) {}
  toString() {
    return this.source;
  }
  /** Plain JSON.stringify falls back to the nearest JS number; `stringify` keeps it exact. */
  toJSON() {
    return Number(this.source);
  }
}

export const isJsonNumber = (v: unknown): v is JsonNumber => v instanceof JsonNumber;

/** Objects and arrays (not JsonNumber). */
export const isContainer = (v: unknown): v is object => v !== null && typeof v === 'object' && !(v instanceof JsonNumber);

/** Whether JSON.parse gives revivers each number's source text (ES2025); otherwise parseJson uses a fallback. */
export const SOURCE_ACCESS: boolean = (() => {
  try {
    let source: string | undefined;
    JSON.parse('1.0', (_k, v, ctx?: { source?: string }) => {
      source = ctx?.source;
      return v;
    });
    return source === '1.0';
  } catch {
    return false;
  }
})();

/** Whether a number token reads back as the same text from a JS number. */
const exact = (token: string) => String(Number(token)) === token;

/** A placeholder no real string will match: a private-use character plus a random tag. */
const placeholderTag = () => `\uE000${Math.random().toString(36).slice(2, 10)}:`;

/** JSON.parse, but numbers that would change (1.0, 1e5, big integers) become JsonNumber. */
export function parseJson(text: string): unknown {
  if (!SOURCE_ACCESS) return parseWithPlaceholders(text);
  try {
    return JSON.parse(text, (_k, v, ctx?: { source?: string }) =>
      typeof v === 'number' && ctx?.source !== undefined && ctx.source !== String(v) ? new JsonNumber(ctx.source) : v,
    );
  } catch (e) {
    // Extremely deep documents can overflow the reviver
    if (e instanceof RangeError) return parseWithPlaceholders(text);
    throw e;
  }
}

/**
 * For browsers without source access: swap each inexact number token for a
 * placeholder string, parse, then turn the placeholders into JsonNumber.
 */
export function parseWithPlaceholders(text: string): unknown {
  const tag = placeholderTag();
  const sources: string[] = [];
  let out = '';
  let last = 0;
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 0x22 /* " */) {
      i = closingQuote(text, i) + 1;
    } else if (c === 0x2d /* - */ || (c >= 0x30 && c <= 0x39)) {
      let j = i + 1;
      while (j < n && /[0-9eE.+-]/.test(text[j]!)) j++;
      const token = text.slice(i, j);
      if (!exact(token)) {
        out += `${text.slice(last, i)}"${tag}${sources.length}"`;
        sources.push(token);
        last = j;
      }
      i = j;
    } else {
      i++;
    }
  }
  const value = JSON.parse(out + text.slice(last)) as unknown;
  if (!sources.length) return value;

  const restore = (v: unknown) => (typeof v === 'string' && v.startsWith(tag) ? new JsonNumber(sources[Number(v.slice(tag.length))]!) : v);
  const stack: unknown[] = [value];
  while (stack.length) {
    const v = stack.pop();
    if (Array.isArray(v)) {
      for (let k = 0; k < v.length; k++) {
        v[k] = restore(v[k]);
        if (isContainer(v[k])) stack.push(v[k]);
      }
    } else if (isContainer(v)) {
      const o = v as Record<string, unknown>;
      for (const key of Object.keys(o)) {
        o[key] = restore(o[key]);
        if (isContainer(o[key])) stack.push(o[key]);
      }
    }
  }
  return restore(value);
}

/** JSON.stringify that writes JsonNumber values exactly as they were written. */
export function stringify(value: unknown, space?: string | number): string {
  const tag = placeholderTag();
  const sources: string[] = [];
  const out = JSON.stringify(
    value,
    function (this: Record<string, unknown>, key, v: unknown) {
      const raw = this[key];
      return raw instanceof JsonNumber ? `${tag}${sources.push(raw.source) - 1}` : v;
    },
    space,
  );
  if (!sources.length) return out;
  return out.replace(new RegExp(`"${tag}(\\d+)"`, 'g'), (_, k: string) => sources[Number(k)]!);
}

/** Index of the quote that closes the string starting at `start` (one not escaped by a backslash). */
function closingQuote(text: string, start: number): number {
  let q = start;
  for (;;) {
    q = text.indexOf('"', q + 1);
    if (q === -1) return text.length;
    let b = q - 1;
    while (text.charCodeAt(b) === 0x5c) b--;
    if ((q - 1 - b) % 2 === 0) return q;
  }
}

/** Line and column (1-based) of a character offset. */
export function lineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) {
    line++;
    last = i;
  }
  return { line, column: offset - last };
}

export interface JsonScan {
  /** The first few duplicate keys, where the repeat appears. */
  duplicates: { key: string; line: number; column: number }[];
  duplicateCount: number;
  /** Whether some object has number-like keys ("1", "20") that JS objects move to the front. */
  reorderedKeys: boolean;
}

const MAX_REPORTED = 20;
/** Array-index-like keys, which JS objects always list first, in numeric order. */
const INDEX_KEY = /^(0|[1-9]\d{0,9})$/;

/** Scan valid JSON text (call only after it parsed). */
export function scanJson(text: string): JsonScan {
  const out: JsonScan = { duplicates: [], duplicateCount: 0, reorderedKeys: false };
  // One entry per open object (null for arrays)
  const stack: ({ keys: Set<string>; lastIndex: number; sawOther: boolean } | null)[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === 0x7b /* { */) {
      stack.push({ keys: new Set(), lastIndex: -1, sawOther: false });
      i++;
    } else if (c === 0x5b /* [ */) {
      stack.push(null);
      i++;
    } else if (c === 0x7d /* } */ || c === 0x5d /* ] */) {
      stack.pop();
      i++;
    } else if (c === 0x22 /* " */) {
      const q = closingQuote(text, i);
      const top = stack[stack.length - 1];
      let j = q + 1;
      while (j < n && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n' || text[j] === '\r')) j++;
      if (top && text[j] === ':') {
        const raw = text.slice(i + 1, q);
        const key = raw.includes('\\') ? (JSON.parse(`"${raw}"`) as string) : raw;
        if (top.keys.has(key)) {
          if (out.duplicates.length < MAX_REPORTED) out.duplicates.push({ key, ...lineColumn(text, i) });
          out.duplicateCount++;
        } else {
          top.keys.add(key);
        }
        if (INDEX_KEY.test(key) && Number(key) < 4294967295) {
          const k = Number(key);
          if (top.sawOther || k < top.lastIndex) out.reorderedKeys = true;
          top.lastIndex = k;
        } else {
          top.sawOther = true;
        }
      }
      i = q + 1;
    } else if (c === 0x2d /* - */ || (c >= 0x30 && c <= 0x39)) {
      // Skip numbers whole, so their digits aren't mistaken for anything else
      let j = i + 1;
      while (j < n && /[0-9eE.+-]/.test(text[j]!)) j++;
      i = j;
    } else {
      i++;
    }
  }
  return out;
}
