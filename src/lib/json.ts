/** JSON helpers for the JSON diff page. */

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

/** Line and column (1-based) of a character offset. */
function lineColumn(text: string, offset: number): { line: number; column: number } {
  let line = 1;
  let last = -1;
  for (let i = text.indexOf('\n'); i !== -1 && i < offset; i = text.indexOf('\n', i + 1)) {
    line++;
    last = i;
  }
  return { line, column: offset - last };
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
    throw new Fail(i, message ?? `Unexpected ${JSON.stringify(text[i])}`);
  };
  const literal = (word: string) => {
    for (let k = 0; k < word.length; k++) if (text[i + k] !== word[k]) { i += k; fail(); }
    i += word.length;
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
        if (text[i] !== '"') fail('Expected a "quoted" key');
        string();
        ws();
        if (text[i] !== ':') fail('Expected ":"');
        i++;
        value();
        ws();
        if (text[i] === ',') { i++; continue; }
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
        if (text[i] === ',') { i++; continue; }
        if (text[i] === ']') { i++; return; }
        fail('Expected "," or "]"');
      }
    } else if (c === '"') string();
    else if (c === 't') literal('true');
    else if (c === 'f') literal('false');
    else if (c === 'n') literal('null');
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
