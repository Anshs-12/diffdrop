import { describe, expect, it } from 'vitest';
import { DEFAULT_FIELDS, FIELD_TYPES, MAX_ROWS, duplicateKeys, formatRows, generateRows, isFieldList, seedFromText, type MockField } from './mockData';

const NOW = Date.UTC(2026, 9, 25);
const ALL: MockField[] = FIELD_TYPES.map((t) => ({ key: t.type, type: t.type }));

describe('generateRows', () => {
  it('is reproducible with a seed', () => {
    const a = generateRows(ALL, { rows: 20, seed: 7, now: NOW });
    const b = generateRows(ALL, { rows: 20, seed: 7, now: NOW });
    const c = generateRows(ALL, { rows: 20, seed: 8, now: NOW });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('makes values of the right shape', () => {
    for (const row of generateRows(ALL, { rows: 200, seed: 1, now: NOW })) {
      expect(row.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      expect(row.email).toMatch(/^[a-z]+\.[a-z]+\d+@example\.(com|org|net)$/);
      expect(row.phone).toMatch(/^\+1-\d{3}-555-01\d\d$/);
      expect(row.ip).toMatch(/^(192\.0\.2|198\.51\.100|203\.0\.113)\.(\d+)$/);
      expect(Number(String(row.ip).split('.')[3])).toBeGreaterThanOrEqual(1);
      expect(row.url).toMatch(/^https:\/\/example\.com\//);
      expect(row.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(row.date).toMatch(/^\d{4}-\d\d-\d\d$/);
      expect(new Date(String(row.datetime)).toISOString()).toBe(row.datetime);
      expect(Date.parse(String(row.pastDate))).toBeLessThan(NOW);
      expect(Date.parse(String(row.pastDate))).toBeGreaterThan(NOW - 731 * 86_400_000);
      expect(typeof row.boolean).toBe('boolean');
      expect(Number.isInteger(row.integer)).toBe(true);
      expect(row.integer).toBeGreaterThanOrEqual(1);
      expect(row.integer).toBeLessThanOrEqual(100);
      expect(['active', 'pending', 'inactive']).toContain(row.status);
      expect(String(row.sentence)).toMatch(/^[A-Z][a-z ]+\.$/);
    }
  });

  it('ids count up from 1, and names, email and username match within a row', () => {
    const rows = generateRows(
      [
        { key: 'id', type: 'id' },
        { key: 'first', type: 'firstName' },
        { key: 'last', type: 'lastName' },
        { key: 'full', type: 'fullName' },
        { key: 'email', type: 'email' },
        { key: 'user', type: 'username' },
      ],
      { rows: 50, seed: 3, now: NOW },
    );
    rows.forEach((r, i) => {
      expect(r.id).toBe(i + 1);
      expect(r.full).toBe(`${r.first} ${r.last}`);
      expect(String(r.email).startsWith(`${String(r.first).toLowerCase()}.${String(r.last).toLowerCase()}`)).toBe(true);
      expect(String(r.user).startsWith(`${String(r.first).toLowerCase()}_`)).toBe(true);
    });
  });

  it('respects ranges and choices (and swaps a reversed range)', () => {
    const rows = generateRows(
      [
        { key: 'n', type: 'integer', min: 10, max: 5 },
        { key: 'p', type: 'price', min: 1, max: 2 },
        { key: 'f', type: 'float', min: -1, max: 1 },
        { key: 's', type: 'status', choices: 'red, green ,, blue' },
      ],
      { rows: 300, seed: 9, now: NOW },
    );
    for (const r of rows) {
      expect(r.n).toBeGreaterThanOrEqual(5);
      expect(r.n).toBeLessThanOrEqual(10);
      expect(r.p).toBeGreaterThanOrEqual(1);
      expect(r.p).toBeLessThanOrEqual(2);
      expect(Math.round((r.p as number) * 100)).toBeCloseTo((r.p as number) * 100, 6);
      expect(['red', 'green', 'blue']).toContain(r.s);
    }
  });

  it('caps the row count and handles zero and junk', () => {
    expect(generateRows(DEFAULT_FIELDS, { rows: 50_000, seed: 1, now: NOW })).toHaveLength(MAX_ROWS);
    expect(generateRows(DEFAULT_FIELDS, { rows: 0, seed: 1 })).toEqual([]);
    expect(generateRows(DEFAULT_FIELDS, { rows: NaN, seed: 1 })).toEqual([]);
    expect(generateRows([], { rows: 2, seed: 1 })).toEqual([{}, {}]);
  });

  it('keeps unicode and odd keys as plain keys', () => {
    const [row] = generateRows(
      [
        { key: '名前', type: 'fullName' },
        { key: '__proto__', type: 'boolean' },
      ],
      { rows: 1, seed: 1, now: NOW },
    );
    expect(Object.keys(row!)).toEqual(['名前', '__proto__']);
    expect(JSON.parse(JSON.stringify(row))).toHaveProperty('__proto__');
  });
});

describe('formatRows', () => {
  const fields: MockField[] = [
    { key: 'id', type: 'id' },
    { key: 'note', type: 'status', choices: 'say "hi", there' },
  ];
  const rows = [
    { id: 1, note: 'say "hi"' },
    { id: 2, note: 'a,b' },
  ];
  it('json, minified and lines', () => {
    expect(formatRows(rows, fields, 'json')).toBe(JSON.stringify(rows, null, 2) + '\n');
    expect(formatRows(rows, fields, 'json-min')).toBe(JSON.stringify(rows));
    expect(formatRows(rows, fields, 'jsonl')).toBe('{"id":1,"note":"say \\"hi\\""}\n{"id":2,"note":"a,b"}\n');
  });
  it('csv quotes cells that need it', () => {
    expect(formatRows(rows, fields, 'csv')).toBe('id,note\r\n1,"say ""hi"""\r\n2,"a,b"\r\n');
  });
});

describe('helpers', () => {
  it('seedFromText is stable', () => {
    expect(seedFromText('abc')).toBe(seedFromText('abc'));
    expect(seedFromText('abc')).not.toBe(seedFromText('abd'));
  });
  it('duplicateKeys', () => {
    expect(duplicateKeys([{ key: 'a', type: 'id' }, { key: 'a', type: 'uuid' }, { key: 'b', type: 'id' }])).toEqual(['a']);
  });
  it('isFieldList', () => {
    expect(isFieldList(DEFAULT_FIELDS)).toBe(true);
    expect(isFieldList([{ key: 'a', type: 'nope' }])).toBe(false);
    expect(isFieldList('x')).toBe(false);
  });
  it('is fast enough for the maximum', () => {
    const t = performance.now();
    const rows = generateRows(ALL, { rows: MAX_ROWS, seed: 5, now: NOW });
    formatRows(rows, ALL, 'json');
    expect(performance.now() - t).toBeLessThan(3000);
  });
});
