/** Conversions and summaries behind the JSON tool pages. */

export type Indent = 2 | 4 | 'tab' | 'minify';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

/** Re-serialize a parsed JSON value with the chosen indentation (and optionally sorted keys). */
export function stringifyJson(value: unknown, indent: Indent, sort: boolean): string {
  const v = sort ? sortKeysDeep(value) : value;
  if (indent === 'minify') return JSON.stringify(v);
  return JSON.stringify(v, null, indent === 'tab' ? '\t' : indent) + '\n';
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

export function jsonStats(value: unknown): JsonStats {
  const s: JsonStats = { objects: 0, arrays: 0, keys: 0, values: 0, depth: 0 };
  // Iterative walk so very deep documents can't overflow the stack
  const stack: [unknown, number][] = [[value, 1]];
  while (stack.length) {
    const [v, d] = stack.pop()!;
    s.depth = Math.max(s.depth, d);
    if (Array.isArray(v)) {
      s.arrays++;
      for (const item of v) stack.push([item, d + 1]);
    } else if (v && typeof v === 'object') {
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
}

/** Flatten nested objects into "a.b.c" keys; arrays stay whole (as JSON text in one cell). */
function flatten(value: unknown, prefix: string, out: Map<string, unknown>) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0 && prefix) out.set(prefix, '{}');
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else {
    out.set(prefix || 'value', value);
  }
}

function cell(value: unknown, delimiter: Delimiter): string {
  let text: string;
  if (value === null || value === undefined) text = '';
  else if (typeof value === 'string') text = value;
  else if (typeof value === 'object') text = JSON.stringify(value);
  else text = String(value);
  // RFC 4180: quote cells containing the delimiter, quotes or line breaks; double inner quotes
  return text.includes(delimiter) || /["\r\n]/.test(text) || /^\s|\s$/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

/**
 * Convert JSON to CSV. An array of objects becomes one row per object, with the
 * union of all (flattened) keys as columns in first-seen order. A single object
 * becomes one row; an array of plain values becomes one "value" column.
 */
export function jsonToCsv(value: unknown, delimiter: Delimiter = ','): CsvResult {
  const items = Array.isArray(value) ? value : [value];
  const columns: string[] = [];
  const seen = new Set<string>();
  const rows = items.map((item) => {
    const flat = new Map<string, unknown>();
    flatten(item, '', flat);
    for (const key of flat.keys()) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
    return flat;
  });
  const lines = [columns.map((c) => cell(c, delimiter)).join(delimiter)];
  for (const row of rows) lines.push(columns.map((c) => cell(row.get(c), delimiter)).join(delimiter));
  return { csv: lines.join('\n') + '\n', rows: rows.length, columns };
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

function scalar(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  const s = String(value);
  // A JSON string literal is a valid YAML double-quoted scalar
  return isPlainSafe(s) ? s : JSON.stringify(s);
}

const isCollection = (v: unknown): v is object => v !== null && typeof v === 'object';
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
