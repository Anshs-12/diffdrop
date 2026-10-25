/** The JSON viewer's table: what the rows and columns are for any JSON value. */

import { isContainer, isJsonNumber, stringify } from './jsonValue';

export type Path = (string | number)[];

export interface TableRow {
  /** Index in the array, or key in the object. */
  key: string | number;
  path: Path;
  /** One per column; undefined where the row has no such key. */
  cells: unknown[];
}

export interface TableModel {
  /** records: an array of objects; list: an array of other values; object: key/value rows; value: one plain value. */
  kind: 'records' | 'list' | 'object' | 'value';
  /** Header of the first column ("#" or "key"). */
  keyLabel: string;
  columns: { label: string; key: string | null }[];
  rows: TableRow[];
  totalRows: number;
  totalColumns: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => isContainer(v) && !Array.isArray(v);

/**
 * Build the table for a value. An array with objects in it becomes one row per
 * item with the merged keys as columns (first seen first; items that aren't
 * objects go in a "value" column). Other arrays get one "value" column, an
 * object gets key/value rows. Rows and columns past the limits are counted but
 * not built.
 */
export function tableModel(root: unknown, { maxRows = 1000, maxColumns = 100 } = {}): TableModel {
  if (Array.isArray(root)) {
    const shown = root.slice(0, maxRows);
    if (root.some(isRecord)) {
      const keys = new Set<string>();
      let others = false;
      for (const item of root) {
        if (isRecord(item)) for (const k of Object.keys(item)) keys.add(k);
        else others = true;
      }
      const all: { label: string; key: string | null }[] = [...keys].map((k) => ({ label: k, key: k }));
      if (others) all.push({ label: 'value', key: null });
      const columns = all.slice(0, maxColumns);
      return {
        kind: 'records',
        keyLabel: '#',
        columns,
        rows: shown.map((item, i) => ({
          key: i,
          path: [i],
          cells: columns.map((c) =>
            c.key === null ? (isRecord(item) ? undefined : item) : isRecord(item) && Object.prototype.hasOwnProperty.call(item, c.key) ? item[c.key] : undefined,
          ),
        })),
        totalRows: root.length,
        totalColumns: all.length,
      };
    }
    return {
      kind: 'list',
      keyLabel: '#',
      columns: [{ label: 'value', key: null }],
      rows: shown.map((item, i) => ({ key: i, path: [i], cells: [item] })),
      totalRows: root.length,
      totalColumns: 1,
    };
  }
  if (isRecord(root)) {
    const keys = Object.keys(root);
    return {
      kind: 'object',
      keyLabel: 'key',
      columns: [{ label: 'value', key: null }],
      rows: keys.slice(0, maxRows).map((k) => ({ key: k, path: [k], cells: [root[k]] })),
      totalRows: keys.length,
      totalColumns: 1,
    };
  }
  return { kind: 'value', keyLabel: '', columns: [{ label: 'value', key: null }], rows: [{ key: '$', path: [], cells: [root] }], totalRows: 1, totalColumns: 1 };
}

/** Minified JSON, but stops once it is longer than `max` characters (so a huge nested value costs little). */
function boundedJson(root: unknown, max: number): string {
  let out = '';
  const walk = (v: unknown) => {
    if (out.length > max) return;
    if (Array.isArray(v)) {
      out += '[';
      for (let i = 0; i < v.length && out.length <= max; i++) {
        if (i) out += ',';
        walk(v[i]);
      }
      out += ']';
    } else if (isContainer(v)) {
      out += '{';
      let first = true;
      for (const k of Object.keys(v)) {
        if (out.length > max) break;
        if (!first) out += ',';
        first = false;
        out += JSON.stringify(k) + ':';
        walk((v as Record<string, unknown>)[k]);
      }
      out += '}';
    } else {
      out += stringify(v);
    }
  };
  walk(root);
  return out;
}

/** A short one-line form of a cell's value: text as is, nested values as minified JSON, cut at `max` characters. */
export function compactValue(v: unknown, max = 120): string {
  let s: string;
  if (v === undefined) return '';
  if (typeof v === 'string') s = v.length > max ? v.slice(0, max + 1) : v;
  else if (isJsonNumber(v)) s = v.source;
  else if (isContainer(v)) s = boundedJson(v, max + 1);
  else s = String(v);
  s = s.replace(/[\r\n\t]+/g, ' ');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/** CSS class for a cell's value, matching the tree's colours. */
export function valueClass(v: unknown): string {
  if (typeof v === 'string') return '';
  if (typeof v === 'number' || isJsonNumber(v)) return 'tok-number';
  if (isContainer(v)) return 'text-muted-foreground';
  return 'tok-literal';
}
