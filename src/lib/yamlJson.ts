/** YAML → JSON, for the JSON to YAML page's other direction. */

import { parseAllDocuments } from 'yaml';
import { JsonNumber, stringify } from './jsonValue';

/** A small config showing what YAML has and JSON doesn't: comments, anchors, block text. */
export const EXAMPLE_YAML = `# Service settings
name: web
replicas: 3
enabled: yes        # a string in YAML 1.2
version: "1.10"
ports: [80, 443]
defaults: &defaults
  timeout: 30
  retries: 2
staging:
  <<: *defaults
  host: staging.example.com
notes: |
  First line
  Second line, with "quotes" and ünïcödé
`;

export type YamlToJsonResult =
  | {
      ok: true;
      json: string;
      value: unknown;
      /** How many YAML documents (--- separated) were read; more than one become a JSON array. */
      documents: number;
      /** Things JSON can't hold, and what was written instead. */
      warnings: string[];
    }
  | { ok: false; message: string; line: number | null; column: number | null };

/** Copies an own property, including one named __proto__, without touching the prototype. */
function setKey(obj: Record<string, unknown>, key: string, value: unknown) {
  Object.defineProperty(obj, key, { value, enumerable: true, writable: true, configurable: true });
}

/** Turns what the yaml package returns into plain JSON values, noting anything JSON can't hold. */
function toJsonValue(root: unknown, warnings: Set<string>): unknown {
  const convert = (v: unknown, depth: number): unknown => {
    if (depth > 10_000) throw new RangeError('Too deeply nested');
    if (typeof v === 'bigint') {
      // Integers are read as BigInt so long IDs keep every digit
      const n = Number(v);
      return Number.isSafeInteger(n) ? n : new JsonNumber(v.toString());
    }
    if (typeof v === 'number') {
      if (Number.isFinite(v)) return v;
      warnings.add(`JSON has no ${Number.isNaN(v) ? 'NaN' : 'infinity'}; written as null`);
      return null;
    }
    if (v === undefined) return null;
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (v instanceof Date) {
      warnings.add('Dates are written as ISO 8601 strings');
      return v.toISOString();
    }
    if (v instanceof Uint8Array) {
      warnings.add('Binary values are written as arrays of bytes');
      return Array.from(v);
    }
    if (Array.isArray(v) || v instanceof Set) return Array.from(v as Iterable<unknown>, (x) => convert(x, depth + 1));
    if (v instanceof Map) {
      const out: Record<string, unknown> = {};
      for (const [k, x] of v) setKey(out, typeof k === 'string' ? k : stringify(convert(k, depth + 1)), convert(x, depth + 1));
      return out;
    }
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v)) setKey(out, k, convert((v as Record<string, unknown>)[k], depth + 1));
      return out;
    }
    return String(v);
  };
  return convert(root, 0);
}

/** "Map keys must be unique at line 2, column 1:\n…" → "Map keys must be unique". */
const plainMessage = (m: string) => m.replace(/ at line \d+, column \d+:[\s\S]*$/, '').trim();

/**
 * Parse YAML (1.2, as the `yaml` package reads it) and write it as JSON.
 * Errors come back with their line and column instead of being thrown.
 */
export function yamlToJson(text: string, indent: number | string = 2): YamlToJsonResult {
  try {
    const docs = parseAllDocuments(text.replace(/^\uFEFF/, ''), { intAsBigInt: true, merge: true });
    const list = Array.isArray(docs) ? docs : [docs];
    for (const doc of list) {
      const err = doc.errors[0];
      if (err) {
        const pos = err.linePos?.[0];
        return { ok: false, message: plainMessage(err.message), line: pos?.line ?? null, column: pos?.col ?? null };
      }
    }
    const warnings = new Set<string>();
    // maxAliasCount stops "billion laughs" documents that expand aliases exponentially
    const values = list.map((doc) => toJsonValue(doc.toJS({ maxAliasCount: 1000 }), warnings));
    const value = values.length === 1 ? values[0] : values.length === 0 ? null : values;
    const json = stringify(value, indent) + '\n';
    return { ok: true, json, value, documents: list.length, warnings: [...warnings] };
  } catch (e) {
    const message = e instanceof RangeError ? 'This YAML is nested too deeply to convert' : e instanceof Error ? plainMessage(e.message) : 'Could not read this YAML';
    return { ok: false, message, line: null, column: null };
  }
}
