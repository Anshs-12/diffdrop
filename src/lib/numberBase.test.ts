import { describe, expect, it } from 'vitest';
import { bitLength, formatInBase, groupDigits, parseInBase } from './numberBase';

const val = (s: string, b: number) => {
  const r = parseInBase(s, b);
  if (r.ok !== true) throw new Error(r.ok === 'empty' ? 'empty' : r.message);
  return r.value;
};

describe('parseInBase', () => {
  it('reads each base', () => {
    expect(val('255', 10)).toBe(255n);
    expect(val('ff', 16)).toBe(255n);
    expect(val('FF', 16)).toBe(255n);
    expect(val('11111111', 2)).toBe(255n);
    expect(val('377', 8)).toBe(255n);
    expect(val('73', 36)).toBe(255n);
    expect(val('zz', 36)).toBe(1295n);
  });

  it('accepts prefixes, signs and separators', () => {
    expect(val('0xFF', 16)).toBe(255n);
    expect(val('0b1111_0000', 2)).toBe(240n);
    expect(val('0o17', 8)).toBe(15n);
    expect(val('-0x10', 16)).toBe(-16n);
    expect(val('+42', 10)).toBe(42n);
    expect(val('1 000 000', 10)).toBe(1_000_000n);
    expect(val('1,000,000', 10)).toBe(1_000_000n);
    expect(val('dead beef', 16)).toBe(0xdeadbeefn);
    // In hex, b is a digit, so 0b… is a number, not a prefix
    expect(val('0b1', 16)).toBe(0xb1n);
  });

  it('reports empty input', () => {
    expect(parseInBase('  ', 10)).toEqual({ ok: 'empty' });
  });

  it('explains invalid digits with their position', () => {
    expect(parseInBase('1021', 2)).toEqual({ ok: false, message: '“2” isn’t a binary digit (only 0–1), at character 3' });
    expect(parseInBase('12g', 16)).toEqual({ ok: false, message: '“g” isn’t a hex digit (only 0–9 and a–f), at character 3' });
    expect(parseInBase('-1_2x', 10)).toMatchObject({ ok: false, message: expect.stringContaining('at character 5') });
    expect(parseInBase('1.5', 10)).toMatchObject({ ok: false, message: expect.stringContaining('whole numbers') });
    expect(parseInBase('0x10', 10)).toMatchObject({ ok: false, message: expect.stringContaining('means hex') });
    expect(parseInBase('_1', 10)).toMatchObject({ ok: false, message: expect.stringContaining('between digits') });
    expect(parseInBase('π', 10)).toMatchObject({ ok: false, message: expect.stringContaining('“π” isn’t a digit') });
    expect(parseInBase('-', 10)).toMatchObject({ ok: false });
    expect(parseInBase('1', 37)).toMatchObject({ ok: false });
  });

  it('stays exact for very large numbers', () => {
    const big = '9'.repeat(5000);
    const v = val(big, 10);
    expect(v.toString()).toBe(big);
    expect(val(formatInBase(v, 36), 36)).toBe(v);
    expect(val(formatInBase(v, 7), 7)).toBe(v);
    expect(val('18446744073709551616', 10)).toBe(2n ** 64n);
    expect(formatInBase(2n ** 64n, 16)).toBe('10000000000000000');
  });
});

describe('formatInBase', () => {
  it('formats negatives and zero', () => {
    expect(formatInBase(-255n, 16)).toBe('-ff');
    expect(formatInBase(0n, 2)).toBe('0');
  });
  it('groups digits from the right', () => {
    expect(formatInBase(255n, 2, 4)).toBe('1111 1111');
    expect(formatInBase(0x1fffn, 16, 2)).toBe('1f ff');
    expect(formatInBase(-5n, 2, 4)).toBe('-101');
    expect(groupDigits('1234567', 3)).toBe('1 234 567');
  });
  it('counts bits', () => {
    expect(bitLength(0n)).toBe(0);
    expect(bitLength(255n)).toBe(8);
    expect(bitLength(-256n)).toBe(9);
  });
});
