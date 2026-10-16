/**
 * Parsing for the JSON tools that keeps numbers exactly as written, plus a scan
 * of the source text for things a parsed value can't show: duplicate keys,
 * keys the browser reorders, and numbers it would round.
 */

type RawJson = (text: string) => unknown;
const rawJSON = (JSON as unknown as { rawJSON?: RawJson }).rawJSON;

/**
 * A number whose JSON text a JS number can't reproduce: big integers
 * (12345678901234567890), trailing zeros (1.0), exponents (1e5) and -0.
 * Serializes back to its original text.
 */
export class JsonNumber {
  constructor(readonly source: string) {}
  toString() {
    return this.source;
  }
  toJSON() {
    return rawJSON ? rawJSON(this.source) : Number(this.source);
  }
}

export const isJsonNumber = (v: unknown): v is JsonNumber => v instanceof JsonNumber;

/** Objects and arrays (not JsonNumber). */
export const isContainer = (v: unknown): v is object => v !== null && typeof v === 'object' && !(v instanceof JsonNumber);

/** Whether this browser exposes each number's source text to JSON.parse and has JSON.rawJSON (ES2025). */
export const LOSSLESS: boolean = (() => {
  if (typeof rawJSON !== 'function') return false;
  try {
    let source: string | undefined;
    JSON.parse('1.0', (_k, v, ctx?: { source?: string }) => {
      source = ctx?.source;
      return v;
    });
    return source === '1.0' && JSON.stringify([rawJSON('1.0')]) === '[1.0]';
  } catch {
    return false;
  }
})();

/** JSON.parse, but numbers that would change (1.0, 1e5, big integers) become JsonNumber. */
export function parseJson(text: string): unknown {
  if (!LOSSLESS) return JSON.parse(text);
  try {
    return JSON.parse(text, (_k, v, ctx?: { source?: string }) =>
      typeof v === 'number' && ctx?.source !== undefined && ctx.source !== String(v) ? new JsonNumber(ctx.source) : v,
    );
  } catch (e) {
    // Extremely deep documents can overflow the reviver; plain parsing still works
    if (e instanceof RangeError) return JSON.parse(text);
    throw e;
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
  /** Numbers that JS numbers can't represent exactly (only counted when parsing isn't lossless). */
  roundedNumbers: number;
  /** First rounded number, as written. */
  roundedExample: string | null;
}

const MAX_REPORTED = 20;
/** Array-index-like keys, which JS objects always list first, in numeric order. */
const INDEX_KEY = /^(0|[1-9]\d{0,9})$/;

/** Scan valid JSON text (call only after it parsed). */
export function scanJson(text: string): JsonScan {
  const out: JsonScan = { duplicates: [], duplicateCount: 0, reorderedKeys: false, roundedNumbers: 0, roundedExample: null };
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
      // Find the closing quote (one not preceded by an odd number of backslashes)
      let q = i;
      for (;;) {
        q = text.indexOf('"', q + 1);
        let b = q - 1;
        while (text.charCodeAt(b) === 0x5c) b--;
        if ((q - 1 - b) % 2 === 0) break;
      }
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
      let j = i + 1;
      while (j < n && /[0-9eE.+-]/.test(text[j]!)) j++;
      if (!LOSSLESS) {
        const token = text.slice(i, j);
        if (!sameNumber(token)) {
          out.roundedNumbers++;
          out.roundedExample ??= token;
        }
      }
      i = j;
    } else {
      i++;
    }
  }
  return out;
}

/** Whether a JSON number token survives a round trip through a JS number (formatting like 1.0 vs 1 aside). */
function sameNumber(token: string): boolean {
  const value = Number(token);
  if (!Number.isFinite(value)) return false;
  // Significant digits only; toExponential() gives the shortest exact digits of a double
  const sig = (s: string) => s.replace(/[eE].*$/, '').replace(/[-.]/g, '').replace(/^0+/, '').replace(/0+$/, '') || '0';
  return sig(token) === sig(Math.abs(value).toExponential());
}
