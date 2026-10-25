import { describe, expect, it } from 'vitest';
import { cellValue, csvToJson, detectDelimiter, readCsv } from './csvJson';
import { jsonToCsv } from './jsonTools';
import { parseJson } from './jsonValue';

const rows = (text: string, d: ',' | ';' | '\t' = ',') => {
  const r = readCsv(text, d);
  if (!r.ok) throw new Error(r.message);
  return r.rows;
};
const json = (text: string, opts = {}) => {
  const r = csvToJson(text, opts);
  if (!r.ok) throw new Error(`${r.message} at ${r.line}:${r.column}`);
  return r;
};

describe('readCsv', () => {
  it('reads plain rows, with or without a final line break', () => {
    expect(rows('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(rows('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('keeps empty fields, including trailing ones', () => {
    expect(rows('a,,c,\n')).toEqual([['a', '', 'c', '']]);
    expect(rows(',\n')).toEqual([['', '']]);
  });

  it('reads quoted fields with delimiters, escaped quotes and line breaks', () => {
    expect(rows('"a,b","say ""hi""","line1\nline2"\n')).toEqual([['a,b', 'say "hi"', 'line1\nline2']]);
    expect(rows('""\n')).toEqual([['']]);
    expect(rows('""""\n')).toEqual([['"']]);
    expect(rows('x,"multi\r\nline",y\r\nz,w,v')).toEqual([['x', 'multi\r\nline', 'y'], ['z', 'w', 'v']]);
  });

  it('accepts \\r\\n, \\n and bare \\r line endings', () => {
    expect(rows('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
    expect(rows('a,b\r1,2\r')).toEqual([['a', 'b'], ['1', '2']]);
  });

  it('ignores a leading byte order mark', () => {
    expect(rows('\uFEFFname,city\nAda,London\n')).toEqual([['name', 'city'], ['Ada', 'London']]);
  });

  it('keeps quotes inside unquoted fields and text after a closing quote', () => {
    expect(rows('5" screen,a"b\n')).toEqual([['5" screen', 'a"b']]);
    expect(rows('"a"b,c\n')).toEqual([['ab', 'c']]);
  });

  it('uses the chosen delimiter only', () => {
    expect(rows('a;b,c\t\n', ';')).toEqual([['a', 'b,c\t']]);
    expect(rows('a\tb;c\n', '\t')).toEqual([['a', 'b;c']]);
  });

  it('reports an unclosed quote with the line and column where it opened', () => {
    const r = readCsv('a,b\n1,"two\nthree\n', ',');
    expect(r).toEqual({ ok: false, message: 'This quoted field is never closed (a " is missing)', line: 2, column: 3 });
    // Line breaks inside earlier quoted fields are counted
    const r2 = readCsv('"x\ny",1\n2,"open', ',');
    expect(r2.ok === false && [r2.line, r2.column]).toEqual([3, 3]);
  });

  it('reads unicode as it is', () => {
    expect(rows('名前,都市\n"Zoë, ünï",😀\n')).toEqual([['名前', '都市'], ['Zoë, ünï', '😀']]);
  });

  it('reads a large file quickly', () => {
    const line = '1,"Ada, Countess",ada@example.com,"note ""q"""\n';
    const text = 'id,name,email,note\n' + line.repeat(100_000);
    const t = performance.now();
    const r = rows(text);
    expect(r.length).toBe(100_001);
    expect(r[100_000]).toEqual(['1', 'Ada, Countess', 'ada@example.com', 'note "q"']);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe('detectDelimiter', () => {
  it('finds comma, semicolon and tab', () => {
    expect(detectDelimiter('a,b,c\n1,2,3\n')).toBe(',');
    expect(detectDelimiter('a;b;c\n1,5;2,5;3\n')).toBe(';');
    expect(detectDelimiter('a\tb\n1\t2\n')).toBe('\t');
  });

  it('ignores delimiters inside quotes', () => {
    expect(detectDelimiter('name;note\n"Ada";"a, b, c, d"\n"Bo";"e, f, g"\n')).toBe(';');
  });

  it('falls back to comma for a single column', () => {
    expect(detectDelimiter('name\nAda\n')).toBe(',');
    expect(detectDelimiter('')).toBe(',');
  });
});

describe('cellValue (type detection)', () => {
  it('converts plain numbers, booleans and null', () => {
    expect(cellValue('42')).toBe(42);
    expect(cellValue('-3.5')).toBe(-3.5);
    expect(cellValue('0')).toBe(0);
    expect(cellValue('true')).toBe(true);
    expect(cellValue('false')).toBe(false);
    expect(cellValue('null')).toBe(null);
  });

  it('keeps text that would change as a number', () => {
    for (const s of ['007', '00', '1.10', '1.0', '1e5', '-0', '+1', '.5', '5.', '1,5', ' 1', '0x1F', 'NaN', 'Infinity', '9007199254740993', '12345678901234567890']) {
      expect(cellValue(s), s).toBe(s);
    }
  });

  it('keeps other words as text', () => {
    for (const s of ['', 'TRUE', 'True', 'yes', 'NULL', 'abc']) expect(cellValue(s), s).toBe(s);
  });

  it('reads JSON arrays and objects (as JSON to CSV writes them), keeping numbers exact', () => {
    expect(cellValue('["admin","editor"]')).toEqual(['admin', 'editor']);
    expect(cellValue('{"a":1}')).toEqual({ a: 1 });
    expect(String((cellValue('[12345678901234567890]') as unknown[])[0])).toBe('12345678901234567890');
    expect(cellValue('[not json')).toBe('[not json');
    expect(cellValue('{x}')).toBe('{x}');
  });
});

describe('csvToJson', () => {
  it('turns rows into objects keyed by the header', () => {
    const r = json('name,age\nAda,36\nGrace,85\n');
    expect(r.json).toBe('[\n  {\n    "name": "Ada",\n    "age": "36"\n  },\n  {\n    "name": "Grace",\n    "age": "85"\n  }\n]\n');
    expect([r.rows, r.columns, r.delimiter]).toEqual([2, 2, ',']);
  });

  it('keeps every value a string unless type detection is on', () => {
    const csv = 'id,zip,n,ok,big\n007,02134,1.5,true,9007199254740993\n';
    expect(json(csv).value).toEqual([{ id: '007', zip: '02134', n: '1.5', ok: 'true', big: '9007199254740993' }]);
    expect(json(csv, { types: true }).value).toEqual([{ id: '007', zip: '02134', n: 1.5, ok: true, big: '9007199254740993' }]);
  });

  it('writes arrays of arrays without a header row', () => {
    const r = json('a,b\n1,2,3\n', { header: false });
    expect(r.value).toEqual([['a', 'b'], ['1', '2', '3']]);
    expect(r.columns).toBe(3);
  });

  it('names blank and repeated headers, and cells past the header', () => {
    expect(json('a,,a\n1,2,3,4\n').value).toEqual([{ a: '1', 'column 2': '2', 'a (2)': '3', 'column 4': '4' }]);
  });

  it('fills short rows with empty strings', () => {
    expect(json('a,b,c\n1\n').value).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('skips blank lines', () => {
    expect(json('a\n\n1\n\n\n2\n').value).toEqual([{ a: '1' }, { a: '2' }]);
  });

  it('detects the delimiter or uses the chosen one', () => {
    expect(json('a;b\n1;2\n').value).toEqual([{ a: '1', b: '2' }]);
    expect(json('a;b\n1;2\n', { delimiter: ',' }).value).toEqual([{ 'a;b': '1;2' }]);
    expect(json('a\tb\n1\t2\n', { delimiter: '\t' }).delimiter).toBe('\t');
  });

  it('rebuilds nested objects from dotted headers when asked', () => {
    const csv = 'id,address.city,address.geo.lat\n1,London,51.5\n';
    expect(json(csv).value).toEqual([{ id: '1', 'address.city': 'London', 'address.geo.lat': '51.5' }]);
    expect(json(csv, { nest: true }).value).toEqual([{ id: '1', address: { city: 'London', geo: { lat: '51.5' } } }]);
  });

  it('keeps dotted names flat where nesting would clash or a part is empty', () => {
    expect(json('a,a.b,c.d,x..y,.z\n1,2,3,4,5\n', { nest: true }).value).toEqual([{ a: '1', 'a.b': '2', c: { d: '3' }, 'x..y': '4', '.z': '5' }]);
  });

  it('never touches object prototypes', () => {
    const r = json('__proto__,constructor.prototype.x\n1,2\n', { nest: true });
    expect(r.json).toContain('"__proto__": "1"');
    expect(({} as Record<string, unknown>).x).toBeUndefined();
    expect(Object.getPrototypeOf((r.value as object[])[0])).toBe(Object.prototype);
  });

  it('is the inverse of JSON to CSV with types and nesting on', () => {
    const original = [
      { id: 1, name: 'Ada, "the Countess"', address: { city: 'London', geo: { lat: 51.5 } }, tags: ['a', 'b'], ok: true },
      { id: 2, name: 'Zoë 😀\nline two', address: { city: 'Zürich', geo: { lat: 47.4 } }, tags: [], ok: false },
    ];
    const csv = jsonToCsv(original).csv;
    expect(json(csv, { types: true, nest: true }).value).toEqual(original);
    const big = jsonToCsv(parseJson('[{"id":12345678901234567890}]')).csv;
    expect(json(big, { types: true }).json).toBe('[\n  {\n    "id": "12345678901234567890"\n  }\n]\n');
  });

  it('handles empty input and a header with no rows', () => {
    expect(json('').value).toEqual([]);
    expect(json('a,b\n').value).toEqual([]);
    expect(json('', { header: false }).value).toEqual([]);
  });

  it('returns errors instead of throwing', () => {
    const r = csvToJson('a,b\n"1,2\n');
    expect(r.ok).toBe(false);
    expect(r.ok === false && [r.line, r.column]).toEqual([2, 1]);
  });

  it('converts a large file', () => {
    const text = 'id,name\n' + Array.from({ length: 50_000 }, (_, i) => `${i},"Name ${i}"`).join('\n');
    const r = json(text, { types: true });
    expect(r.rows).toBe(50_000);
    expect((r.value as { id: number }[])[49_999]).toEqual({ id: 49_999, name: 'Name 49999' });
  });

  it('uses a tab for indentation when asked', () => {
    expect(json('a\n1\n', { indent: '\t' }).json).toBe('[\n\t{\n\t\t"a": "1"\n\t}\n]\n');
  });
});
