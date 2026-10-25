/**
 * TypeScript types or a Zod schema inferred from a JSON sample.
 *
 * Inference only uses what the sample shows: every element of an array is
 * merged into one shape, so a key missing from some elements becomes optional
 * and values of different types become a union. An empty array becomes
 * unknown[] and an empty object Record<string, unknown>, because the sample
 * says nothing about what they hold.
 */
import { isJsonNumber } from './jsonValue';

type Prim = 'string' | 'number' | 'boolean' | 'null';

interface ObjShape {
  /** How many objects were merged into this shape. */
  count: number;
  fields: Map<string, { type: Shape; count: number }>;
}

/** A union of what was seen at one position. */
interface Shape {
  prims: Set<Prim>;
  obj: ObjShape | null;
  /** Element shape of arrays seen here; `null` items means only empty arrays were seen. */
  arr: { items: Shape | null } | null;
}

const emptyShape = (): Shape => ({ prims: new Set(), obj: null, arr: null });

function addValue(shape: Shape, v: unknown): void {
  if (v === null) shape.prims.add('null');
  else if (typeof v === 'string') shape.prims.add('string');
  else if (typeof v === 'number' || isJsonNumber(v)) shape.prims.add('number');
  else if (typeof v === 'boolean') shape.prims.add('boolean');
  else if (Array.isArray(v)) {
    shape.arr ??= { items: null };
    for (const item of v) {
      shape.arr.items ??= emptyShape();
      addValue(shape.arr.items, item);
    }
  } else if (typeof v === 'object') {
    shape.obj ??= { count: 0, fields: new Map() };
    const obj = shape.obj;
    obj.count++;
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      let f = obj.fields.get(k);
      if (!f) {
        f = { type: emptyShape(), count: 0 };
        obj.fields.set(k, f);
      }
      f.count++;
      addValue(f.type, val);
    }
  }
}

export function inferShape(value: unknown): Shape {
  const s = emptyShape();
  addValue(s, value);
  return s;
}

// ── Names ────────────────────────────────────────────────────

const IDENT = /^[\p{ID_Start}$_][\p{ID_Continue}$‌‍]*$/u;

export const isIdentifier = (s: string) => IDENT.test(s);

/** A property key as written in TypeScript: bare when it's a valid identifier, otherwise quoted. */
export const propertyKey = (k: string) => (isIdentifier(k) ? k : JSON.stringify(k));

/** "user_profile" → "UserProfile"; falls back when nothing usable is left. */
export function pascalCase(s: string, fallback = 'Item'): string {
  const words = s.match(/[\p{L}\p{N}]+/gu) ?? [];
  const parts = words.flatMap((w) => w.split(/(?<=[\p{Ll}\p{N}])(?=\p{Lu})/u));
  let out = parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  if (!out) return fallback;
  if (!/^[\p{ID_Start}$_]/u.test(out)) out = `T${out}`;
  return isIdentifier(out) ? out : fallback;
}

/** A simple English singular for naming array items: "users" → "user", "categories" → "category". */
export function singular(s: string): string {
  if (/ies$/i.test(s) && s.length > 3) return s.slice(0, -3) + 'y';
  if (/(ss|x|ch|sh|z)es$/i.test(s)) return s.slice(0, -2);
  if (/[^su]s$/i.test(s) && s.length > 2) return s.slice(0, -1);
  return s;
}

// ── Output ───────────────────────────────────────────────────

export type JsonToTsFormat = 'interface' | 'type' | 'zod';

export interface JsonToTsOptions {
  format: JsonToTsFormat;
  rootName: string;
  exported: boolean;
  readonly: boolean;
}

export const DEFAULT_TS_OPTIONS: JsonToTsOptions = { format: 'interface', rootName: 'Root', exported: true, readonly: false };

interface Named {
  name: string;
  obj: ObjShape;
}

class Namer {
  used = new Set<string>();
  named: Named[] = [];
  take(base: string): string {
    let name = base;
    for (let i = 2; this.used.has(name); i++) name = `${base}${i}`;
    this.used.add(name);
    return name;
  }
}

const isEmptyObj = (o: ObjShape) => o.fields.size === 0;

/** Order of union members: objects, arrays, then string, number, boolean, null. */
const PRIM_ORDER: Prim[] = ['string', 'number', 'boolean', 'null'];

/**
 * Walk the shape tree and give every non-empty object a name, depth first so
 * that names read in document order. Returns the type text for this shape.
 */
function tsType(shape: Shape, nameHint: string, namer: Namer, names: Map<ObjShape, string>, ro: boolean): string {
  const parts: string[] = [];
  if (shape.obj) {
    if (isEmptyObj(shape.obj)) parts.push('Record<string, unknown>');
    else {
      let name = names.get(shape.obj);
      if (!name) {
        name = namer.take(nameHint);
        names.set(shape.obj, name);
        namer.named.push({ name, obj: shape.obj });
      }
      parts.push(name);
    }
  }
  if (shape.arr) {
    const items = shape.arr.items ? tsType(shape.arr.items, itemHint(nameHint), namer, names, ro) : 'unknown';
    const wrapped = /[|&\s]/.test(items) && !items.startsWith('Record<') ? `(${items})` : items;
    parts.push(ro ? `readonly ${wrapped}[]` : `${wrapped}[]`);
  }
  for (const p of PRIM_ORDER) if (shape.prims.has(p)) parts.push(p);
  return parts.length ? parts.join(' | ') : 'unknown';
}

/** The name hint for an array's items: "Users" → "User", otherwise "TagsItem"-style. */
function itemHint(nameHint: string): string {
  const s = pascalCase(singular(nameHint), nameHint);
  return s === nameHint ? `${nameHint}Item` : s;
}

function zodType(shape: Shape, nameHint: string, namer: Namer, names: Map<ObjShape, string>, refs: string[] = []): string {
  const parts: string[] = [];
  if (shape.obj) {
    if (isEmptyObj(shape.obj)) parts.push('z.record(z.string(), z.unknown())');
    else {
      let name = names.get(shape.obj);
      if (!name) {
        name = namer.take(nameHint);
        names.set(shape.obj, name);
        namer.named.push({ name, obj: shape.obj });
      }
      refs.push(name);
      parts.push(`${lowerFirst(name)}Schema`);
    }
  }
  if (shape.arr) {
    parts.push(`z.array(${shape.arr.items ? zodType(shape.arr.items, itemHint(nameHint), namer, names, refs) : 'z.unknown()'})`);
  }
  for (const p of PRIM_ORDER) if (p !== 'null' && shape.prims.has(p)) parts.push(`z.${p}()`);
  const nullable = shape.prims.has('null');
  if (!parts.length) return nullable ? 'z.null()' : 'z.unknown()';
  const core = parts.length === 1 ? parts[0]! : `z.union([${parts.join(', ')}])`;
  return nullable ? `${core}.nullable()` : core;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export type JsonToTsResult = { ok: true; code: string; types: number } | { ok: false; error: string };

/** Generate the code for a parsed JSON value. Never throws. */
export function jsonToTs(value: unknown, options: Partial<JsonToTsOptions> = {}): JsonToTsResult {
  const o = { ...DEFAULT_TS_OPTIONS, ...options };
  try {
    const shape = inferShape(value);
    const rootName = pascalCase(o.rootName.trim(), 'Root');
    return o.format === 'zod' ? zodCode(shape, rootName, o) : tsCode(shape, rootName, o);
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: 'The JSON is nested too deeply to turn into types' };
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function tsCode(shape: Shape, rootName: string, o: JsonToTsOptions): JsonToTsResult {
  const namer = new Namer();
  const names = new Map<ObjShape, string>();
  const exp = o.exported ? 'export ' : '';
  const blocks: string[] = [];
  const rootIsObject = shape.obj && !isEmptyObj(shape.obj) && !shape.arr && shape.prims.size === 0;
  if (!rootIsObject) {
    // The root is an array, a primitive or a union: name it with a type alias
    namer.used.add(rootName);
    const t = tsType(shape, rootName, namer, names, o.readonly);
    blocks.push(`${exp}type ${rootName} = ${t};`);
  } else {
    tsType(shape, rootName, namer, names, o.readonly);
  }
  // `named` grows while we print, as nested objects get their names
  for (let i = 0; i < namer.named.length; i++) {
    const { name, obj } = namer.named[i]!;
    const lines: string[] = [];
    for (const [key, f] of obj.fields) {
      const type = tsType(f.type, pascalCase(key, `${name}Field`), namer, names, o.readonly);
      const opt = f.count < obj.count ? '?' : '';
      lines.push(`  ${o.readonly ? 'readonly ' : ''}${propertyKey(key)}${opt}: ${type};`);
    }
    blocks.push(
      o.format === 'type' ? `${exp}type ${name} = {\n${lines.join('\n')}\n};` : `${exp}interface ${name} {\n${lines.join('\n')}\n}`,
    );
  }
  return { ok: true, code: blocks.join('\n\n') + '\n', types: blocks.length };
}

function zodCode(shape: Shape, rootName: string, o: JsonToTsOptions): JsonToTsResult {
  const namer = new Namer();
  const names = new Map<ObjShape, string>();
  const exp = o.exported ? 'export ' : '';
  const rootIsObject = shape.obj && !isEmptyObj(shape.obj) && !shape.arr && shape.prims.size === 0;
  let rootExpr: string | null = null;
  if (!rootIsObject) {
    namer.used.add(rootName);
    rootExpr = zodType(shape, rootName, namer, names);
  } else {
    zodType(shape, rootName, namer, names);
  }
  const bodies = new Map<string, string>();
  const deps = new Map<string, string[]>();
  for (let i = 0; i < namer.named.length; i++) {
    const { name, obj } = namer.named[i]!;
    const lines: string[] = [];
    const used: string[] = [];
    for (const [key, f] of obj.fields) {
      let t = zodType(f.type, pascalCase(key, `${name}Field`), namer, names, used);
      if (f.count < obj.count) t += '.optional()';
      lines.push(`  ${propertyKey(key)}: ${t},`);
    }
    bodies.set(name, `z.object({\n${lines.join('\n')}\n})`);
    deps.set(name, used);
  }
  // A schema must be declared before the ones that use it: print children first
  const order: string[] = [];
  const seen = new Set<string>();
  const visitName = (n: string) => {
    if (seen.has(n)) return;
    seen.add(n);
    for (const d of deps.get(n) ?? []) visitName(d);
    order.push(n);
  };
  for (const { name } of namer.named) visitName(name);
  const blocks = ["import { z } from 'zod';"];
  for (const n of order) {
    blocks.push(`${exp}const ${lowerFirst(n)}Schema = ${bodies.get(n)};\n${exp}type ${n} = z.infer<typeof ${lowerFirst(n)}Schema>;`);
  }
  if (rootExpr !== null) {
    blocks.push(`${exp}const ${lowerFirst(rootName)}Schema = ${rootExpr};\n${exp}type ${rootName} = z.infer<typeof ${lowerFirst(rootName)}Schema>;`);
  }
  return { ok: true, code: blocks.join('\n\n') + '\n', types: blocks.length - 1 };
}
