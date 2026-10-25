import { describe, expect, it } from 'vitest';
import { allNumeric, cleanItems, linesToItems, quoteValue, splitSeparated, toSeparated, toSqlIn } from './sqlList';

const items = { trim: true, skipEmpty: true, dedupe: true };

describe('quoting and escaping', () => {
  it("doubles single quotes: O'Brien → 'O''Brien'", () => {
    expect(quoteValue("O'Brien", 'single', true)).toBe("'O''Brien'");
    expect(quoteValue("''", 'single', true)).toBe("''''''");
    expect(quoteValue("it's Ann's", 'single', true)).toBe("'it''s Ann''s'");
  });
  it('leaves quotes alone when escaping is off', () => {
    expect(quoteValue("O'Brien", 'single', false)).toBe("'O'Brien'");
  });
  it('double quotes double the double quote, and leave single quotes', () => {
    expect(quoteValue('say "hi"', 'double', true)).toBe('"say ""hi"""');
    expect(quoteValue("O'Brien", 'double', true)).toBe('"O\'Brien"');
  });
  it('no quotes passes values through', () => {
    expect(quoteValue('42', 'none', true)).toBe('42');
  });
  it('backslashes are not treated as escapes', () => {
    expect(quoteValue('a\\b', 'single', true)).toBe("'a\\b'");
  });
});

describe('toSqlIn', () => {
  it('makes an IN list', () => {
    expect(toSqlIn(['a', "O'Brien"])).toBe("IN ('a', 'O''Brien')");
    expect(toSqlIn(['1', '2'], { quote: 'none' })).toBe('IN (1, 2)');
    expect(toSqlIn(['a', 'b'], { wrap: false })).toBe("'a', 'b'");
  });
  it('empty input gives no SQL', () => {
    expect(toSqlIn([])).toBe('');
    expect(linesToItems('', items)).toEqual([]);
    expect(linesToItems('\n  \n', items)).toEqual([]);
  });
  it('items per line', () => {
    expect(toSqlIn(['1', '2', '3', '4', '5'], { quote: 'none', perLine: 2 })).toBe('IN (\n  1, 2,\n  3, 4,\n  5\n)');
    expect(toSqlIn(['1', '2', '3'], { quote: 'none', perLine: 2, wrap: false })).toBe('1, 2,\n3');
  });
  it('unicode', () => {
    expect(toSqlIn(['Zoë', '東京', '🎉'])).toBe("IN ('Zoë', '東京', '🎉')");
  });
  it('large input', () => {
    const list = Array.from({ length: 100_000 }, (_, i) => String(i));
    const sql = toSqlIn(list, { quote: 'none' });
    expect(sql.startsWith('IN (0, 1, 2')).toBe(true);
    expect(sql.endsWith('99999)')).toBe(true);
  });
});

describe('items', () => {
  it('trims, skips empties and dedupes (keeping order), with \\r\\n', () => {
    expect(linesToItems(' a \r\nb\r\n\r\na\r\n', items)).toEqual(['a', 'b']);
    expect(cleanItems([' a', 'a', ''], { trim: false, skipEmpty: false, dedupe: false })).toEqual([' a', 'a', '']);
  });
  it('detects all-numeric lists', () => {
    expect(allNumeric(['1', '-2', '3.5', '1e3'])).toBe(true);
    expect(allNumeric(['1', 'x'])).toBe(false);
    expect(allNumeric([])).toBe(false);
    expect(allNumeric(['007'])).toBe(true);
  });
});

describe('separated lines', () => {
  it('joins with a separator, including \\t', () => {
    expect(toSeparated(['a', 'b'], ', ')).toBe('a, b');
    expect(toSeparated(['a', 'b'], '\\t')).toBe('a\tb');
  });
  it('splits a comma line back into values', () => {
    expect(splitSeparated('a, b,c,, d', ',', { ...items, unquote: false })).toEqual(['a', 'b', 'c', 'd']);
    expect(splitSeparated('a|b|a', '|', { ...items, unquote: false })).toEqual(['a', 'b']);
  });
  it('splits an IN list back into lines, respecting quotes', () => {
    expect(splitSeparated("IN ('O''Brien', 'a, b',\n  'c')", ', ', { ...items, unquote: true })).toEqual(["O'Brien", 'a, b', 'c']);
    expect(splitSeparated("'x', 'y'", ',', { ...items, unquote: false })).toEqual(["'x'", "'y'"]);
    expect(splitSeparated('"a", "b"', ',', { ...items, unquote: true })).toEqual(['a', 'b']);
  });
  it('round-trips through toSqlIn', () => {
    const vals = ["O'Brien", 'Zoë', 'a, b', 'say "hi"'];
    expect(splitSeparated(toSqlIn(vals, { perLine: 2 }), ',', { ...items, unquote: true })).toEqual(vals);
  });
  it('an unclosed quote is kept as text', () => {
    expect(splitSeparated("'abc, d", ',', { ...items, unquote: true })).toEqual(["'abc", 'd']);
  });
  it('empty input', () => {
    expect(splitSeparated('', ',', { ...items, unquote: true })).toEqual([]);
  });
});
