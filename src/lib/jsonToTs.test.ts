import { describe, expect, it } from 'vitest';
import { jsonToTs, pascalCase, propertyKey, singular } from './jsonToTs';
import { parseJson } from './jsonValue';

const ts = (json: string, o = {}) => {
  const r = jsonToTs(parseJson(json), o);
  if (!r.ok) throw new Error(r.error);
  return r.code;
};

describe('jsonToTs: TypeScript', () => {
  it('makes an interface for an object, with named nested interfaces', () => {
    expect(ts('{"id":1,"name":"Ada","active":true,"address":{"city":"Oslo"}}')).toBe(
      'export interface Root {\n  id: number;\n  name: string;\n  active: boolean;\n  address: Address;\n}\n\nexport interface Address {\n  city: string;\n}\n',
    );
  });

  it('uses the root name, type aliases, no export and readonly when asked', () => {
    expect(ts('{"a":1}', { rootName: 'user profile', format: 'type', exported: false, readonly: true })).toBe(
      'type UserProfile = {\n  readonly a: number;\n};\n',
    );
    expect(ts('{"a":1}', { rootName: '' })).toContain('interface Root {');
  });

  it('merges array elements: keys missing from some elements become optional', () => {
    expect(ts('{"users":[{"id":1,"email":"a@example.com"},{"id":2}]}')).toBe(
      'export interface Root {\n  users: User[];\n}\n\nexport interface User {\n  id: number;\n  email?: string;\n}\n',
    );
  });

  it('null alone is null; mixed with other values it is a union', () => {
    const code = ts('{"a":null,"rows":[{"b":"x"},{"b":null}]}');
    expect(code).toContain('  a: null;');
    expect(code).toContain('  b: string | null;');
  });

  it('mixed arrays become explicit unions and empty arrays unknown[]', () => {
    const code = ts('{"mixed":[1,"a",true],"empty":[],"grid":[[1],[2,3]],"maybe":[1,null]}');
    expect(code).toContain('  mixed: (string | number | boolean)[];');
    expect(code).toContain('  empty: unknown[];');
    expect(code).toContain('  grid: number[][];');
    expect(code).toContain('  maybe: (number | null)[];');
  });

  it('an empty array merged with a full one takes the full one’s type', () => {
    expect(ts('[{"t":[]},{"t":["x"]}]')).toContain('  t: string[];');
  });

  it('an empty object is Record<string, unknown>, not {}', () => {
    expect(ts('{"meta":{}}')).toContain('  meta: Record<string, unknown>;');
  });

  it('a value that is an object in one element and a string in another is a union', () => {
    expect(ts('[{"v":"x"},{"v":{"k":1}}]')).toContain('  v: V | string;');
  });

  it('quotes keys that are not identifiers, keeps unicode identifiers bare', () => {
    const code = ts('{"first-name":"a","2x":1,"日本":1,"café":1,"$ok":1,"":1,"a b":1}');
    expect(code).toContain('  "first-name": string;');
    expect(code).toContain('  "2x": number;');
    expect(code).toContain('  日本: number;');
    expect(code).toContain('  café: number;');
    expect(code).toContain('  $ok: number;');
    expect(code).toContain('  "": number;');
    expect(code).toContain('  "a b": number;');
  });

  it('de-duplicates interface names', () => {
    const code = ts('{"item":{"a":1},"other":{"item":{"b":2}}}');
    expect(code).toContain('export interface Item {\n  a: number;\n}');
    expect(code).toContain('export interface Item2 {\n  b: number;\n}');
  });

  it('roots that are arrays or primitives get a type alias', () => {
    expect(ts('[{"a":1}]')).toBe('export type Root = RootItem[];\n\nexport interface RootItem {\n  a: number;\n}\n');
    expect(ts('"x"')).toBe('export type Root = string;\n');
    expect(ts('[]')).toBe('export type Root = unknown[];\n');
    expect(ts('[1,"a"]', { readonly: true })).toBe('export type Root = readonly (string | number)[];\n');
  });

  it('treats exact numbers (1.0, big integers) as number', () => {
    expect(ts('{"a":1.0,"b":12345678901234567890}')).toContain('  a: number;\n  b: number;');
  });

  it('handles large input', () => {
    const rows = Array.from({ length: 20_000 }, (_, i) => ({ id: i, name: `n${i}`, ...(i % 2 ? { odd: true } : {}) }));
    const code = ts(JSON.stringify(rows));
    expect(code).toContain('  odd?: boolean;');
  });

  it('reports very deep nesting instead of throwing', () => {
    const deep = '['.repeat(20_000) + ']'.repeat(20_000);
    const r = jsonToTs(JSON.parse(deep));
    expect(typeof r.ok).toBe('boolean');
  });
});

describe('jsonToTs: Zod', () => {
  it('declares nested schemas before the ones that use them', () => {
    expect(ts('{"id":1,"tags":[],"user":{"email":null,"age":[1,"x"]},"rows":[{"a":1},{"b":"x"}]}', { format: 'zod' })).toBe(
      [
        "import { z } from 'zod';",
        '',
        'export const userSchema = z.object({\n  email: z.null(),\n  age: z.array(z.union([z.string(), z.number()])),\n});\nexport type User = z.infer<typeof userSchema>;',
        '',
        'export const rowSchema = z.object({\n  a: z.number().optional(),\n  b: z.string().optional(),\n});\nexport type Row = z.infer<typeof rowSchema>;',
        '',
        'export const rootSchema = z.object({\n  id: z.number(),\n  tags: z.array(z.unknown()),\n  user: userSchema,\n  rows: z.array(rowSchema),\n});\nexport type Root = z.infer<typeof rootSchema>;',
        '',
      ].join('\n'),
    );
  });

  it('uses .nullable() for a value mixed with null', () => {
    expect(ts('[{"a":"x"},{"a":null}]', { format: 'zod' })).toContain('  a: z.string().nullable(),');
    expect(ts('[1,"a",null]', { format: 'zod' })).toContain('z.array(z.union([z.string(), z.number()]).nullable())');
  });

  it('quotes awkward keys and handles empty objects', () => {
    const code = ts('{"x-y":{},"ok":true}', { format: 'zod' });
    expect(code).toContain('  "x-y": z.record(z.string(), z.unknown()),');
    expect(code).toContain('  ok: z.boolean(),');
  });
});

describe('naming helpers', () => {
  it('pascalCase', () => {
    expect(pascalCase('user_profile')).toBe('UserProfile');
    expect(pascalCase('firstName')).toBe('FirstName');
    expect(pascalCase('2fa')).toBe('T2fa');
    expect(pascalCase('!!!')).toBe('Item');
    expect(pascalCase('日本')).toBe('日本');
  });
  it('singular', () => {
    expect(singular('users')).toBe('user');
    expect(singular('categories')).toBe('category');
    expect(singular('addresses')).toBe('address');
    expect(singular('status')).toBe('status');
    expect(singular('data')).toBe('data');
  });
  it('propertyKey', () => {
    expect(propertyKey('a')).toBe('a');
    expect(propertyKey('a-b')).toBe('"a-b"');
    expect(propertyKey('say "hi"')).toBe('"say \\"hi\\""');
  });
});
