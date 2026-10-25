/** CSV → JSON: an RFC 4180 reader plus the conversion options of the JSON to CSV page's other direction. */

import { isContainer, parseJson, stringify } from './jsonValue';

export type CsvDelimiter = ',' | ';' | '\t';

export const DELIMITER_NAMES: Record<CsvDelimiter, string> = { ',': 'comma', ';': 'semicolon', '\t': 'tab' };

export type CsvReadResult =
  | { ok: true; rows: string[][] }
  | { ok: false; message: string; line: number; column: number };

/**
 * Read CSV text into rows of cells (RFC 4180): fields in double quotes may hold
 * the delimiter, line breaks and "" for a quote. Rows end at \n, \r\n or \r.
 * A leading byte order mark is ignored. Quotes inside an unquoted field are
 * kept as text, as spreadsheets do.
 */
export function readCsv(input: string, delimiter: CsvDelimiter): CsvReadResult {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let i = 0;
  let line = 1;
  let lineStart = 0;
  const n = text.length;
  const endRow = () => {
    row.push(field);
    field = '';
    rows.push(row);
    row = [];
  };
  while (i < n) {
    const c = text[i]!;
    if (c === '"' && field === '') {
      // A quoted field: read to the closing quote
      const openLine = line;
      const openCol = i - lineStart + 1;
      i++;
      let start = i;
      for (;;) {
        const q = text.indexOf('"', i);
        if (q === -1) {
          return { ok: false, message: 'This quoted field is never closed (a " is missing)', line: openLine, column: openCol };
        }
        // Count line breaks inside the quotes, for error positions further on
        for (let k = i; k < q; k++) {
          const ch = text.charCodeAt(k);
          if (ch === 10 || (ch === 13 && text.charCodeAt(k + 1) !== 10)) {
            line++;
            lineStart = k + 1;
          }
        }
        if (text[q + 1] === '"') {
          field += text.slice(start, q + 1);
          i = q + 2;
          start = i;
          continue;
        }
        field += text.slice(start, q);
        i = q + 1;
        break;
      }
      // Text after the closing quote (as in "a"b) is kept, like spreadsheets do
      while (i < n && text[i] !== delimiter && text[i] !== '\n' && text[i] !== '\r') field += text[i++];
      continue;
    }
    if (c === delimiter) {
      row.push(field);
      field = '';
      i++;
    } else if (c === '\n' || c === '\r') {
      endRow();
      i += c === '\r' && text[i + 1] === '\n' ? 2 : 1;
      line++;
      lineStart = i;
    } else {
      // Plain run up to the next special character
      let j = i + 1;
      while (j < n) {
        const d = text[j]!;
        if (d === delimiter || d === '\n' || d === '\r') break;
        j++;
      }
      field += text.slice(i, j);
      i = j;
    }
  }
  // The last row, unless the text ended with a line break
  if (field !== '' || row.length) endRow();
  return { ok: true, rows };
}

/** Counts each candidate outside quotes on the first lines; picks the one that splits them most evenly. */
export function detectDelimiter(input: string): CsvDelimiter {
  const sample = input.slice(0, 64 * 1024);
  const candidates: CsvDelimiter[] = [',', ';', '\t'];
  let best: CsvDelimiter = ',';
  let bestScore = 0;
  for (const d of candidates) {
    const counts: number[] = [0];
    let quoted = false;
    for (let i = 0; i < sample.length && counts.length <= 20; i++) {
      const c = sample[i];
      if (c === '"') quoted = !quoted;
      else if (!quoted && c === d) counts[counts.length - 1]!++;
      else if (!quoted && c === '\n') counts.push(0);
    }
    const lines = counts.filter((x, k) => x > 0 || k < counts.length - 1);
    if (!lines.length || !lines[0]) continue;
    // Lines with the same count as the first one, times that count
    const same = lines.filter((x) => x === lines[0]).length;
    const score = (same / lines.length) * 1000 + lines[0];
    if (score > bestScore) {
      best = d;
      bestScore = score;
    }
  }
  return best;
}

export interface CsvToJsonOptions {
  /** 'auto' guesses from the first lines. */
  delimiter?: CsvDelimiter | 'auto';
  /** First row holds the column names (rows become objects); otherwise rows become arrays. */
  header?: boolean;
  /** Turn cells that are clearly numbers, true/false, null or JSON arrays/objects into those values. */
  types?: boolean;
  /** Rebuild nested objects from dotted column names: address.city → {"address": {"city": …}}. */
  nest?: boolean;
  indent?: number | string;
}

export type CsvToJsonResult =
  | { ok: true; json: string; value: unknown; rows: number; columns: number; delimiter: CsvDelimiter }
  | { ok: false; message: string; line: number; column: number };

const NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/;

/**
 * The typed value of a cell, or the cell as text. Numbers convert only when a
 * JavaScript number reads back as exactly the same text, so 007, 1.10, 1e5 and
 * IDs too long for a double all stay strings.
 */
export function cellValue(cell: string): unknown {
  if (cell === 'true') return true;
  if (cell === 'false') return false;
  if (cell === 'null') return null;
  if (NUMBER.test(cell)) {
    const n = Number(cell);
    return Number.isFinite(n) && String(n) === cell ? n : cell;
  }
  const first = cell[0];
  if (first === '[' || first === '{') {
    try {
      const v = parseJson(cell);
      if (isContainer(v)) return v;
    } catch {
      // Not JSON: keep the text
    }
  }
  return cell;
}

function setKey(obj: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}

/** Unique column names: blanks become "column 3", repeats get " (2)", as JSON to CSV writes them. */
function columnNames(header: string[]): string[] {
  const seen = new Set<string>();
  return header.map((raw, k) => {
    const base = raw.trim() === '' ? `column ${k + 1}` : raw;
    let name = base;
    for (let m = 2; seen.has(name); m++) name = `${base} (${m})`;
    seen.add(name);
    return name;
  });
}

/**
 * For each column, the key path to write it at. A dotted name is split only
 * when no other column needs the same spot for a plain value (a and a.b), and
 * when no part is empty (a..b); otherwise it stays one flat key.
 */
function columnPaths(names: string[], nest: boolean): string[][] {
  if (!nest) return names.map((n) => [n]);
  const split = names.map((n) => {
    const parts = n.split('.');
    return parts.length > 1 && parts.every((p) => p !== '') ? parts : [n];
  });
  const ids = split.map((p) => JSON.stringify(p));
  const conflict = split.map((parts, k) => {
    // Another column's path is a prefix of this one, or this one a prefix of another
    return split.some((other, m) => {
      if (m === k) return false;
      const len = Math.min(other.length, parts.length);
      if (other.length === parts.length) return ids[m] === ids[k];
      for (let x = 0; x < len; x++) if (other[x] !== parts[x]) return false;
      return true;
    });
  });
  return split.map((parts, k) => (conflict[k] ? [names[k]!] : parts));
}

/** Convert CSV text to JSON: an array of objects (with a header row) or of arrays (without). */
export function csvToJson(text: string, { delimiter = 'auto', header = true, types = false, nest = false, indent = 2 }: CsvToJsonOptions = {}): CsvToJsonResult {
  const d = delimiter === 'auto' ? detectDelimiter(text.replace(/^\uFEFF/, '')) : delimiter;
  const read = readCsv(text, d);
  if (!read.ok) return read;
  // Lines with nothing on them aren't rows
  const rows = read.rows.filter((r) => !(r.length === 1 && r[0] === ''));
  const convert = types ? cellValue : (c: string) => c;
  let value: unknown[];
  let columns = 0;
  if (!header) {
    value = rows.map((r) => r.map(convert));
    for (const r of rows) columns = Math.max(columns, r.length);
  } else {
    const [head = [], ...body] = rows;
    let width = head.length;
    for (const r of body) if (r.length > width) width = r.length;
    // Cells past the header's end get names too
    const names = columnNames(Array.from({ length: width }, (_, k) => head[k] ?? ''));
    const paths = columnPaths(names, nest);
    columns = names.length;
    value = body.map((r) => {
      const obj: Record<string, unknown> = {};
      for (let k = 0; k < names.length; k++) {
        // A short row gets "" for its missing columns; cells past the header appear only in rows that have them
        if (k >= r.length && k >= head.length) continue;
        const path = paths[k]!;
        let target = obj;
        for (let p = 0; p < path.length - 1; p++) {
          const key = path[p]!;
          if (!Object.prototype.hasOwnProperty.call(target, key)) setKey(target, key, {});
          target = target[key] as Record<string, unknown>;
        }
        setKey(target, path[path.length - 1]!, convert(r[k] ?? ''));
      }
      return obj;
    });
  }
  return { ok: true, json: stringify(value, indent) + '\n', value, rows: value.length, columns, delimiter: d };
}
