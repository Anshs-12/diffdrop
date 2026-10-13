import { describe, expect, it } from 'vitest';
import { compileIgnorePatterns, computeDiff, missingFinalNewline, splitLines, type DiffOptions } from './diffProcessor';
import { randomText, rng } from '@/test/random';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

describe('splitLines', () => {
  it('treats a final newline as a terminator, not an extra line', () => {
    expect(splitLines('')).toEqual([]);
    expect(splitLines('a')).toEqual(['a']);
    expect(splitLines('a\n')).toEqual(['a']);
    expect(splitLines('a\n\n')).toEqual(['a', '']);
    expect(splitLines('a\r\nb\r\n')).toEqual(['a', 'b']);
  });

  it('detects a missing final newline', () => {
    expect(missingFinalNewline('')).toBe(false);
    expect(missingFinalNewline('a')).toBe(true);
    expect(missingFinalNewline('a\n')).toBe(false);
  });
});

describe('computeDiff', () => {
  it('reports no hunks for identical text', () => {
    const r = computeDiff('a\nb\n', 'a\nb\n', base);
    expect(r.hunks).toHaveLength(0);
    expect(r.stats).toEqual({ added: 0, removed: 0 });
  });

  it('pairs removed and added blocks line by line into modified lines', () => {
    const r = computeDiff('a\nb\nc\n', 'a\nB\nC\nD\n', base);
    expect(r.lines.map((l) => l.type)).toEqual(['unchanged', 'modified', 'modified', 'added']);
    expect(r.stats).toEqual({ added: 3, removed: 2 });
  });

  it('treats a difference only in the final newline as a change', () => {
    const r = computeDiff('a\nb', 'a\nb\n', base);
    expect(r.hunks).toHaveLength(1);
    expect(r.eof).toEqual({ oldMissing: true, newMissing: false });
  });

  it('ignores whitespace and case when asked', () => {
    expect(computeDiff('a  b\n', 'a b\n', base).hunks).toHaveLength(1);
    expect(computeDiff('a  b\n', ' a b \n', { ...base, ignoreWhitespace: true }).hunks).toHaveLength(0);
    expect(computeDiff('Hello\n', 'hello\n', { ...base, ignoreCase: true }).hunks).toHaveLength(0);
  });

  it('ignores text matching custom patterns, and skips invalid ones', () => {
    const a = 'built 2026-01-01T10:00:00Z ok\n';
    const b = 'built 2026-10-13T22:01:45Z ok\n';
    expect(computeDiff(a, b, base).hunks).toHaveLength(1);
    const ts = '\\d{4}-\\d{2}-\\d{2}T[\\d:]+Z';
    expect(computeDiff(a, b, { ...base, ignorePatterns: [ts] }).hunks).toHaveLength(0);
    expect(compileIgnorePatterns(['(', ts])).toHaveLength(1);
    expect(computeDiff(a, b, { ...base, ignorePatterns: ['('] }).hunks).toHaveLength(1);
  });

  it('marks only the changed word, or only the changed characters', () => {
    const a = 'const TAX_RATE = 0.08; // tax\n';
    const b = 'const TAX_RATE = 0.0825; // tax\n';
    const word = computeDiff(a, b, base).lines[0]!;
    expect(word.rightSpans?.filter((s) => s.type === 'added').map((s) => s.text)).toEqual(['0825']);
    const char = computeDiff(a, b, { ...base, charLevel: true }).lines[0]!;
    expect(char.rightSpans?.filter((s) => s.type === 'added').map((s) => s.text)).toEqual(['25']);
  });

  it('keeps astral characters (emoji) whole in character mode', () => {
    const l = computeDiff('a 😀 b\n', 'a 😃 b\n', { ...base, charLevel: true }).lines[0]!;
    expect(l.rightSpans?.find((s) => s.type === 'added')?.text).toBe('😃');
  });

  it('leaves rewritten (dissimilar) lines without word highlights', () => {
    const l = computeDiff('return total + total * TAX_RATE;\n', 'const discount = coupon ? x : 0;\n', base).lines[0]!;
    expect(l.type).toBe('modified');
    expect(l.leftSpans).toBeNull();
  });

  for (const seed of [11, 12, 13]) {
    it(`rebuilds both texts from the diff lines and spans (random, seed ${seed})`, () => {
      const rand = rng(seed);
      for (let i = 0; i < 1500; i++) {
        const a = randomText(rand, 14, { crlf: true });
        const b = randomText(rand, 14, { crlf: true });
        const r = computeDiff(a, b, { ...base, charLevel: i % 2 === 0 });
        expect(r.lines.flatMap((l) => (l.leftContent == null ? [] : [l.leftContent]))).toEqual(splitLines(a));
        expect(r.lines.flatMap((l) => (l.rightContent == null ? [] : [l.rightContent]))).toEqual(splitLines(b));
        for (const l of r.lines) {
          if (l.leftSpans) expect(l.leftSpans.map((s) => s.text).join('')).toBe(l.leftContent);
          if (l.rightSpans) expect(l.rightSpans.map((s) => s.text).join('')).toBe(l.rightContent);
        }
      }
    });
  }
});
