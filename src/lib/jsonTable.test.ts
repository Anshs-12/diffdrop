import { describe, expect, it } from 'vitest';
import { compactValue, tableModel, valueClass } from './jsonTable';
import { parseJson } from './jsonValue';

describe('tableModel', () => {
  it('makes columns from the merged keys of an array of objects, first seen first', () => {
    const m = tableModel([{ a: 1, b: 2 }, { c: 3, a: 4 }]);
    expect(m.kind).toBe('records');
    expect(m.columns.map((c) => c.label)).toEqual(['a', 'b', 'c']);
    expect(m.rows.map((r) => r.cells)).toEqual([[1, 2, undefined], [4, undefined, 3]]);
    expect(m.rows[1]!.path).toEqual([1]);
  });

  it('puts items that are not objects in a value column', () => {
    const m = tableModel([{ a: 1 }, 'x', null]);
    expect(m.columns.map((c) => c.label)).toEqual(['a', 'value']);
    expect(m.rows.map((r) => r.cells)).toEqual([[1, undefined], [undefined, 'x'], [undefined, null]]);
  });

  it('lists arrays of plain values, objects as key/value rows, and single values', () => {
    expect(tableModel([1, 'two']).rows.map((r) => [r.key, r.cells])).toEqual([[0, [1]], [1, ['two']]]);
    const o = tableModel({ name: 'Ada', tags: ['x'] });
    expect([o.kind, o.keyLabel]).toEqual(['object', 'key']);
    expect(o.rows.map((r) => [r.key, r.path, r.cells])).toEqual([['name', ['name'], ['Ada']], ['tags', ['tags'], [['x']]]]);
    expect(tableModel(42).rows[0]!.cells).toEqual([42]);
    expect(tableModel([]).rows).toEqual([]);
  });

  it('caps rows and columns but counts them all', () => {
    const big = Array.from({ length: 100_000 }, (_, i) => ({ id: i, [`k${i % 300}`]: true }));
    const t = performance.now();
    const m = tableModel(big, { maxRows: 500, maxColumns: 50 });
    expect(performance.now() - t).toBeLessThan(1000);
    expect([m.rows.length, m.totalRows, m.columns.length, m.totalColumns]).toEqual([500, 100_000, 50, 301]);
  });

  it('does not read inherited properties', () => {
    const m = tableModel([{ a: 1 }, { toString: 2 }]);
    expect(m.rows[0]!.cells).toEqual([1, undefined]);
  });
});

describe('compactValue', () => {
  it('writes text as is and nested values as minified JSON', () => {
    expect(compactValue('Zoë 😀')).toBe('Zoë 😀');
    expect(compactValue({ city: 'London', n: [1, 2] })).toBe('{"city":"London","n":[1,2]}');
    expect(compactValue(parseJson('[1.10, 12345678901234567890]'))).toBe('[1.10,12345678901234567890]');
    expect(compactValue(null)).toBe('null');
    expect(compactValue(undefined)).toBe('');
    expect(compactValue('a\nb')).toBe('a b');
  });

  it('cuts long values short, quickly', () => {
    expect(compactValue('x'.repeat(500), 10)).toBe('xxxxxxxxx…');
    const huge = Array.from({ length: 1_000_000 }, (_, i) => ({ i }));
    const t = performance.now();
    expect(compactValue(huge, 20)).toHaveLength(20);
    expect(performance.now() - t).toBeLessThan(50);
  });

  it('gives value classes like the tree', () => {
    expect([valueClass('a'), valueClass(1), valueClass(true), valueClass([])]).toEqual(['', 'tok-number', 'tok-literal', 'text-muted-foreground']);
  });
});
