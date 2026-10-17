/** Conversions and summaries behind the JSON tool pages. */

import { isContainer, isJsonNumber, stringify } from './jsonValue';

export type Indent = 2 | 4 | 'tab' | 'minify';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (isContainer(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Re-serialize a parsed JSON value with the chosen indentation (and optionally sorted keys). */
export function stringifyJson(value: unknown, indent: Indent, sort: boolean): string {
  const v = sort ? sortKeysDeep(value) : value;
  if (indent === 'minify') return stringify(v);
  return stringify(v, indent === 'tab' ? '\t' : indent) + '\n';
}

// ─────────────────────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────────────────────

export interface JsonStats {
  objects: number;
  arrays: number;
  keys: number;
  values: number;
  depth: number;
}

/** Counts, and depth = how many objects/arrays are nested inside each other ({"a":[1]} is 2, a plain value 0). */
export function jsonStats(value: unknown): JsonStats {
  const s: JsonStats = { objects: 0, arrays: 0, keys: 0, values: 0, depth: 0 };
  // Iterative walk so very deep documents can't overflow the stack; d = containers around v
  const stack: [unknown, number][] = [[value, 0]];
  while (stack.length) {
    const [v, d] = stack.pop()!;
    if (isContainer(v)) s.depth = Math.max(s.depth, d + 1);
    if (Array.isArray(v)) {
      s.arrays++;
      for (const item of v) stack.push([item, d + 1]);
    } else if (isContainer(v)) {
      s.objects++;
      for (const [, child] of Object.entries(v)) {
        s.keys++;
        stack.push([child, d + 1]);
      }
    } else {
      s.values++;
    }
  }
  return s;
}

// ─────────────────────────────────────────────────────────────
// JSON → CSV
// ─────────────────────────────────────────────────────────────

export type Delimiter = ',' | ';' | '\t';

export interface CsvResult {
  csv: string;
  rows: number;
  columns: string[];
  /** Key of the array that became the rows, when the input was an object wrapping one. */
  unwrapped: string | null;
}

export interface CsvOptions {
  delimiter?: Delimiter;
  /** Prefix cells starting with = + - @ tab or CR with ', so spreadsheets don't run them as formulas. */
  escapeFormulas?: boolean;
}

/** Flatten nested objects into key paths; arrays stay whole (as JSON text in one cell). */
function flatten(value: unknown, path: string[], out: [string[], unknown][]) {
  if (isContainer(value) && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && path.length) out.push([path, '{}']);
    for (const [k, v] of entries) flatten(v, [...path, k], out);
  } else {
    out.push([path, value]);
  }
}

function cell(value: unknown, delimiter: Delimiter, escapeFormulas: boolean): string {
  let text: string;
  if (value === null || value === undefined) text = '';
  else if (typeof value === 'string') text = escapeFormulas && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  else if (isJsonNumber(value)) text = value.source;
  else if (typeof value === 'object') text = stringify(value);
  else text = String(value);
  // RFC 4180: quote cells containing the delimiter, quotes or line breaks; double inner quotes
  return text.includes(delimiter) || /["\r\n]/.test(text) || /^\s|\s$/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/** The one array of objects inside an object like {"data": [...], "total": 3}, if there is exactly one. */
function wrappedArray(value: unknown): [string, unknown[]] | null {
  if (!isContainer(value) || Array.isArray(value)) return null;
  const arrays = Object.entries(value).filter(([, v]) => Array.isArray(v));
  if (arrays.length !== 1) return null;
  const [key, items] = arrays[0] as [string, unknown[]];
  return items.length > 0 && items.every((x) => isContainer(x) && !Array.isArray(x)) ? [key, items] : null;
}

/**
 * Convert JSON to CSV. An array of objects becomes one row per object, with the
 * union of all (flattened) keys as columns in first-seen order. An object that
 * wraps a single array of objects uses that array; any other object becomes one
 * row; an array of plain values becomes one "value" column. When two different
 * paths flatten to the same name ({"a.b": 1} and {"a": {"b": 2}}), the later
 * one gets a suffix: "a.b (2)".
 */
export function jsonToCsv(value: unknown, { delimiter = ',', escapeFormulas = false }: CsvOptions = {}): CsvResult {
  const wrapped = wrappedArray(value);
  const items = wrapped ? wrapped[1] : Array.isArray(value) ? value : [value];
  const columns: string[] = [];
  const columnOf = new Map<string, string>(); // path (as JSON) → column name
  const names = new Set<string>();
  const rows = items.map((item) => {
    const flat: [string[], unknown][] = [];
    flatten(item, [], flat);
    const row = new Map<string, unknown>();
    for (const [path, v] of flat) {
      const id = JSON.stringify(path);
      let name = columnOf.get(id);
      if (name === undefined) {
        const base = path.length ? path.join('.') : 'value';
        name = base;
        for (let k = 2; names.has(name); k++) name = `${base} (${k})`;
        names.add(name);
        columnOf.set(id, name);
        columns.push(name);
      }
      row.set(name, v);
    }
    return row;
  });
  const line = (cells: unknown[]) => cells.map((c) => cell(c, delimiter, escapeFormulas)).join(delimiter);
  const lines = [line(columns), ...rows.map((row) => line(columns.map((c) => row.get(c))))];
  return { csv: lines.join('\n') + '\n', rows: rows.length, columns, unwrapped: wrapped ? wrapped[0] : null };
}

// ─────────────────────────────────────────────────────────────
// JSON → YAML
// ─────────────────────────────────────────────────────────────

/** Words YAML (1.1 or 1.2) would read as booleans or null. */
const RESERVED = new Set(['y', 'yes', 'n', 'no', 'true', 'false', 'on', 'off', 'null', '~', '']);

/**
 * Whether a string can be written without quotes and still read back as the
 * same string. Deliberately conservative: anything unusual gets quoted.
 */
function isPlainSafe(s: string): boolean {
  if (RESERVED.has(s.toLowerCase())) return false;
  // Starts with a letter or underscore; then letters, digits, spaces and a few safe marks
  if (!/^[A-Za-z_][A-Za-z0-9_ ./+-]*$/.test(s)) return false;
  if (s.endsWith(' ')) return false;
  // YAML 1.1's loose float syntax reads things like "e1" or "E-5" as numbers
  if (/^[eE][-+]?[0-9]/.test(s)) return false;
  // Things like ".inf" / ".nan" can't start with a letter, so numbers are excluded already
  return true;
}

/**
 * Characters YAML won't take raw inside double quotes: C1 controls and DEL (not
 * printable), NEL/LS/PS (line breaks to YAML), and U+FFFE/FFFF. JSON.stringify
 * leaves them as they are, so they're escaped here.
 */
const YAML_UNSAFE = /[\u007f-\u009f\u2028\u2029\ufffe\uffff]/g;

function scalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (isJsonNumber(value)) return value.source;
  const s = String(value);
  if (isPlainSafe(s)) return s;
  // A JSON string literal is a valid YAML double-quoted scalar, once the characters above are escaped
  return JSON.stringify(s).replace(YAML_UNSAFE, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

const isCollection = isContainer;
const isEmpty = (v: object) => (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0);

function yamlLines(value: unknown, indent: string, out: string[]) {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isCollection(item) && !isEmpty(item)) {
        // First line of the nested block goes after "- "
        const nested: string[] = [];
        yamlLines(item, '', nested);
        out.push(`${indent}- ${nested[0]}`);
        for (const line of nested.slice(1)) out.push(`${indent}  ${line}`);
      } else {
        out.push(`${indent}- ${isCollection(item) ? (Array.isArray(item) ? '[]' : '{}') : scalar(item)}`);
      }
    }
    return;
  }
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    const k = scalar(key);
    if (isCollection(v) && !isEmpty(v)) {
      out.push(`${indent}${k}:`);
      yamlLines(v, Array.isArray(v) ? indent : `${indent}  `, out);
    } else {
      out.push(`${indent}${k}: ${isCollection(v) ? (Array.isArray(v) ? '[]' : '{}') : scalar(v)}`);
    }
  }
}

/** Convert a parsed JSON value to YAML (block style, 2-space indentation). */
export function jsonToYaml(value: unknown): string {
  if (!isCollection(value)) return scalar(value) + '\n';
  if (isEmpty(value)) return (Array.isArray(value) ? '[]' : '{}') + '\n';
  const out: string[] = [];
  yamlLines(value, '', out);
  return out.join('\n') + '\n';
}

// ─────────────────────────────────────────────────────────────
// Paths (for the viewer)
// ─────────────────────────────────────────────────────────────

/** A JavaScript-style path to a value: $.users[0].name, $["odd key"]. */
export function pathString(path: (string | number)[]): string {
  let out = '$';
  for (const part of path) {
    if (typeof part === 'number') out += `[${part}]`;
    else if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(part)) out += `.${part}`;
    else out += `[${JSON.stringify(part)}]`;
  }
  return out;
}
