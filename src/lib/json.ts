/** JSON helpers for the JSON diff page. */

import { lineColumn } from './jsonValue';

export type JsonCheck =
  | { status: 'empty' }
  | { status: 'valid' }
  | { status: 'invalid'; message: string; line: number | null; column: number | null };

/** Sort object keys recursively so key order never shows up as a change. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

const INVISIBLE: Record<number, string> = {
  0x00a0: 'no-break space',
  0x200b: 'zero-width space',
  0x200c: 'zero-width non-joiner',
  0x200d: 'zero-width joiner',
  0x2028: 'line separator',
  0x2029: 'paragraph separator',
  0x2060: 'word joiner',
  0xfeff: 'byte order mark',
};

/** A character as it should appear in an error message: visible, with its code if it isn't. */
function describeChar(c: string): string {
  const code = c.codePointAt(0)!;
  const hex = `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;
  if (INVISIBLE[code]) return `invisible character ${hex} (${INVISIBLE[code]})`;
  if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || /\s/.test(c)) return `invisible character ${hex}`;
  return JSON.stringify(c);
}

/** Messages for words that aren't JSON values. */
function wordMessage(word: string): string {
  const lower = word.toLowerCase();
  if (word !== lower && (lower === 'true' || lower === 'false' || lower === 'null')) return `"${word}" should be lowercase: ${lower}`;
  if (word === 'None' || word === 'nil') return `"${word}" isn't JSON; use null`;
  if (word === 'undefined' || word === 'NaN' || word === 'Infinity') return `${word} isn't allowed in JSON`;
  for (const literal of ['true', 'false', 'null']) {
    if (literal.startsWith(word) || word.startsWith(literal)) return `Invalid value "${word}" (did you mean ${literal}?)`;
  }
  return `Unexpected word "${word}" (strings need "double quotes")`;
}

/**
 * Offset and description of the first JSON syntax error, or null if the text is
 * valid. Browsers' JSON.parse errors don't say where the problem is, so this is
 * a small strict JSON scanner just for locating it.
 */
function findJsonError(text: string): { offset: number; message: string } | null {
  let i = 0;
  const n = text.length;
  const ws = () => {
    while (i < n && (text[i] === ' ' || text[i] === '\t' || text[i] === '\n' || text[i] === '\r')) i++;
  };
  class Fail {
    constructor(readonly offset: number, readonly message: string) {}
  }
  const fail = (message?: string): never => {
    if (i >= n) throw new Fail(n, 'Unexpected end of input');
    if (text[i] === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) throw new Fail(i, "Comments aren't allowed in JSON");
    if (message) throw new Fail(i, message);
    const c = String.fromCodePoint(text.codePointAt(i)!);
    if (c === '\uFEFF' && i === 0) throw new Fail(i, 'The text starts with an invisible byte order mark (BOM, U+FEFF); remove it');
    if (c === "'") throw new Fail(i, 'JSON needs "double quotes", not single quotes');
    throw new Fail(i, `Unexpected ${describeChar(c)}`);
  };
  /** A bare word: true, false or null, or an error at its first letter. */
  const word = () => {
    const w = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 64))![0];
    if (w === 'true' || w === 'false' || w === 'null') i += w.length;
    else fail(wordMessage(w));
  };
  const string = () => {
    i++; // opening quote
    while (i < n && text[i] !== '"') {
      const c = text.charCodeAt(i);
      if (c < 0x20) fail('Unescaped control character in string');
      if (text[i] === '\\') {
        i++;
        if (text[i] === 'u') {
          if (!/^[0-9a-fA-F]{4}$/.test(text.slice(i + 1, i + 5))) fail('Invalid \\u escape');
          i += 5;
        } else if ('"\\/bfnrt'.includes(text[i] ?? '')) i++;
        else fail('Invalid escape');
      } else i++;
    }
    if (i >= n) fail('Unterminated string');
    i++;
  };
  const number = () => {
    const m = /^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/.exec(text.slice(i, i + 400));
    if (!m || !m[0] || m[0] === '-') fail();
    i += m![0].length;
  };
  const value = (): void => {
    ws();
    const c = text[i];
    if (c === '{') {
      i++;
      ws();
      if (text[i] === '}') { i++; return; }
      for (;;) {
        ws();
        if (text[i] !== '"') fail(text[i] === "'" ? 'Keys need "double quotes", not single quotes' : 'Expected a "quoted" key');
        string();
        ws();
        if (text[i] !== ':') fail('Expected ":"');
        i++;
        value();
        ws();
        if (text[i] === ',') {
          i++;
          ws();
          if (text[i] === '}') fail('Trailing comma before "}"');
          continue;
        }
        if (text[i] === '}') { i++; return; }
        fail('Expected "," or "}"');
      }
    } else if (c === '[') {
      i++;
      ws();
      if (text[i] === ']') { i++; return; }
      for (;;) {
        value();
        ws();
        if (text[i] === ',') {
          i++;
          ws();
          if (text[i] === ']') fail('Trailing comma before "]"');
          continue;
        }
        if (text[i] === ']') { i++; return; }
        fail('Expected "," or "]"');
      }
    } else if (c === '"') string();
    else if (c !== undefined && /[A-Za-z_$]/.test(c)) word();
    else if (c === '-' || (c !== undefined && c >= '0' && c <= '9')) number();
    else fail();
  };
  try {
    value();
    ws();
    if (i < n) fail('Unexpected text after the JSON value');
    return null;
  } catch (e) {
    if (e instanceof Fail) return { offset: e.offset, message: e.message };
    throw e;
  }
}

/** Whether the text parses as JSON, and where it breaks if it doesn't. */
export function checkJson(text: string): JsonCheck {
  if (!text.trim()) return { status: 'empty' };
  try {
    JSON.parse(text);
    return { status: 'valid' };
  } catch (e) {
    const found = findJsonError(text);
    if (!found) return { status: 'invalid', message: e instanceof Error ? e.message : String(e), line: null, column: null };
    return { status: 'invalid', message: found.message, ...lineColumn(text, found.offset) };
  }
}

/**
 * Pretty-print JSON with 2-space indentation and (optionally) sorted keys.
 * Returns null when the text isn't valid JSON. Keeps a final newline.
 */
export function formatJson(text: string, sort = true): string | null {
  if (!text.trim()) return null;
  try {
    const value = JSON.parse(text) as unknown;
    return JSON.stringify(sort ? sortKeys(value) : value, null, 2) + '\n';
  } catch {
    return null;
  }
}
