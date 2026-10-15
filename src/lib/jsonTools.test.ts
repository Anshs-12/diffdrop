import { describe, expect, it } from 'vitest';
import { parse as parseYaml } from 'yaml';
import { jsonStats, jsonToCsv, jsonToYaml, pathString, stringifyJson } from './jsonTools';
import { rng } from '@/test/random';

/** Random JSON values with deliberately awkward strings and keys. */
function randomJson(rand: () => number, depth = 0): unknown {
  const strings = [
    '', ' ', 'plain', 'two words', 'yes', 'No', 'on', 'OFF', 'null', 'Null', '~', 'true', '1', '0x1F', '1.5.0', '.inf',
    '-', '- item', 'a: b', 'a #b', '#comment', 'http://x.io/a?b=c', 'quote "inside"', "it's", 'line\nbreak', 'tab\there',
    'trailing ', ' leading', '[x]', '{y}', '*alias', '&anchor', '!tag', '%x', '@x', '`x`', '|', '>', 'ünïcödé', '日本', '😀',
    '2001-12-14', '12:30', 'e1', 'Infinity', 'NaN', '?', ':', 'key:', '\\back', 'semi;colon', 'comma,here',
  ];
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const r = rand();
  if (depth > 3 || r < 0.45) {
    const k = rand();
    if (k < 0.5) return pick(strings);
    if (k < 0.75) return Math.round((rand() - 0.5) * 1e6) / (rand() < 0.5 ? 1 : 100);
    if (k < 0.9) return rand() < 0.5;
    return null;
  }
  if (r < 0.7) return Array.from({ length: Math.floor(rand() * 4) }, () => randomJson(rand, depth + 1));
  const obj: Record<string, unknown> = {};
  for (let i = Math.floor(rand() * 4); i > 0; i--) obj[pick(strings)] = randomJson(rand, depth + 1);
  return obj;
}

/** Minimal RFC 4180 CSV reader, for round-trip checks. */
function readCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cellText = '';
  let i = 0;
  let quoted = false;
  while (i < text.length) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cellText += '"';
        i += 2;
        continue;
      }
      if (c === '"') quoted = false;
      else cellText += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(cellText);
      cellText = '';
    } else if (c === '\n') {
      row.push(cellText);
      rows.push(row);
      row = [];
      cellText = '';
    } else cellText += c;
    i++;
  }
  return rows;
}

describe('stringifyJson', () => {
  const value = { b: [1, { d: 2, c: 3 }], a: 'x' };
  it('indents with 2, 4 or tabs, and minifies', () => {
    expect(stringifyJson(value, 2, false)).toBe(JSON.stringify(value, null, 2) + '\n');
    expect(stringifyJson(value, 4, false)).toContain('\n    "b"');
    expect(stringifyJson(value, 'tab', false)).toContain('\n\t"b"');
    expect(stringifyJson(value, 'minify', false)).toBe('{"b":[1,{"d":2,"c":3}],"a":"x"}');
  });
  it('sorts keys recursively when asked', () => {
    expect(stringifyJson(value, 'minify', true)).toBe('{"a":"x","b":[1,{"c":3,"d":2}]}');
  });
});

describe('jsonStats', () => {
  it('counts objects, arrays, keys, values and depth', () => {
    expect(jsonStats({ a: [1, 2, { b: null }], c: 'x' })).toEqual({ objects: 2, arrays: 1, keys: 3, values: 4, depth: 4 });
    expect(jsonStats(5)).toEqual({ objects: 0, arrays: 0, keys: 0, values: 1, depth: 1 });
  });
  it('handles very deep documents without overflowing', () => {
    let v: unknown = 1;
    for (let i = 0; i < 100_000; i++) v = [v];
    expect(jsonStats(v).depth).toBe(100_001);
  });
});

describe('jsonToCsv', () => {
  it('flattens nested objects into dotted columns, in first-seen order', () => {
    const r = jsonToCsv([
      { id: 1, user: { name: 'Ada', tags: ['x', 'y'] } },
      { id: 2, user: { name: 'Lin' }, active: true },
    ]);
    expect(r.columns).toEqual(['id', 'user.name', 'user.tags', 'active']);
    expect(r.csv).toBe('id,user.name,user.tags,active\n1,Ada,"[""x"",""y""]",\n2,Lin,,true\n');
    expect(r.rows).toBe(2);
  });

  it('handles a single object and an array of plain values', () => {
    expect(jsonToCsv({ a: 1 }).csv).toBe('a\n1\n');
    expect(jsonToCsv([1, 'two', null]).csv).toBe('value\n1\ntwo\n\n');
  });

  it('quotes cells that need it and round-trips through a CSV reader (random)', () => {
    const rand = rng(41);
    for (const delimiter of [',', ';', '\t'] as const) {
      for (let k = 0; k < 300; k++) {
        const items = Array.from({ length: 1 + Math.floor(rand() * 4) }, () => {
          const o: Record<string, unknown> = {};
          for (let i = 0; i < 3; i++) o[`k${Math.floor(rand() * 4)}`] = randomJson(rand, 4);
          return o;
        });
        const { csv, columns } = jsonToCsv(items, delimiter);
        const rows = readCsv(csv, delimiter);
        expect(rows[0]).toEqual(columns);
        expect(rows).toHaveLength(items.length + 1);
        rows.slice(1).forEach((row, i) => {
          const item = items[i]!;
          columns.forEach((col, c) => {
            const v = item[col];
            const expected = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
            expect(row[c]).toBe(expected);
          });
        });
      }
    }
  });
});

describe('jsonToYaml', () => {
  it('writes readable block YAML', () => {
    expect(jsonToYaml({ name: 'diffdrop', version: '1.5.0', tags: ['a', 'b'], nested: { ok: true, n: null }, empty: [] })).toBe(
      ['name: diffdrop', 'version: "1.5.0"', 'tags:', '- a', '- b', 'nested:', '  ok: true', '  "n": null', 'empty: []', ''].join(
        '\n',
      ),
    );
  });

  it('quotes strings that YAML would misread', () => {
    for (const s of ['yes', 'No', 'on', 'null', '~', 'true', '123', '1.5', '', 'a: b', '#x', '- x', '2001-12-14', ' x']) {
      expect(jsonToYaml({ k: s })).toBe(`k: ${JSON.stringify(s)}\n`);
    }
  });

  it('handles arrays of objects, nested arrays and top-level scalars', () => {
    expect(jsonToYaml([{ a: 1, b: [2, [3]] }, [], {}])).toBe(['- a: 1', '  b:', '  - 2', '  - - 3', '- []', '- {}', ''].join('\n'));
    expect(jsonToYaml('hello')).toBe('hello\n');
    expect(jsonToYaml({})).toBe('{}\n');
  });

  it('reads back as the same value in YAML 1.2 and 1.1 (random)', () => {
    const rand = rng(43);
    for (let k = 0; k < 15_000; k++) {
      const value = randomJson(rand);
      const yaml = jsonToYaml(value);
      expect(parseYaml(yaml), yaml).toEqual(value);
      expect(parseYaml(yaml, { version: '1.1' }), yaml).toEqual(value);
    }
  });
});

describe('pathString', () => {
  it('writes JavaScript-style paths', () => {
    expect(pathString([])).toBe('$');
    expect(pathString(['users', 0, 'name'])).toBe('$.users[0].name');
    expect(pathString(['odd key', 'a-b', '$ok'])).toBe('$["odd key"]["a-b"].$ok');
  });
});
