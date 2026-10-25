import { describe, expect, it } from 'vitest';
import { cleanLines, firstNumber, splitLines } from './lines';

const all = { dedupe: false, ignoreCase: false, trim: false, dropEmpty: false, sort: 'none' as const, reverse: false };

describe('splitLines', () => {
  it('handles \\n, \\r\\n and \\r, and ignores one trailing break', () => {
    expect(splitLines('a\r\nb\rc\nd\n')).toEqual(['a', 'b', 'c', 'd']);
    expect(splitLines('')).toEqual([]);
    expect(splitLines('\n')).toEqual(['']);
    expect(splitLines('a\n\n')).toEqual(['a', '']);
  });
});

describe('cleanLines', () => {
  it('empty input', () => {
    expect(cleanLines('').text).toBe('');
    expect(cleanLines('').stats).toEqual({ linesBefore: 0, uniqueBefore: 0, linesAfter: 0, removedDuplicates: 0, removedEmpty: 0 });
  });

  it('removes duplicates, keeping the first occurrence', () => {
    const r = cleanLines('b\na\nb\nc\na', { ...all, dedupe: true });
    expect(r.text).toBe('b\na\nc');
    expect(r.stats).toMatchObject({ linesBefore: 5, uniqueBefore: 3, linesAfter: 3, removedDuplicates: 2 });
  });

  it('case-insensitive dedupe keeps the first casing', () => {
    expect(cleanLines('Apple\napple\nAPPLE\nBanana', { ...all, dedupe: true, ignoreCase: true }).text).toBe('Apple\nBanana');
    expect(cleanLines('Apple\napple', { ...all, dedupe: true }).text).toBe('Apple\napple');
  });

  it('trims, and drops blank (whitespace-only) lines', () => {
    const r = cleanLines('  a  \n\n   \nb\r\n', { ...all, trim: true, dropEmpty: true });
    expect(r.text).toBe('a\nb');
    expect(r.stats.removedEmpty).toBe(2);
    expect(cleanLines(' a\na', { ...all, dedupe: true }).text).toBe(' a\na');
    expect(cleanLines(' a\na', { ...all, dedupe: true, trim: true }).text).toBe('a');
  });

  it('sorts A–Z, Z–A, naturally and by length', () => {
    const src = 'item10\nitem2\nBanana\napple\nitem1';
    expect(cleanLines(src, { ...all, sort: 'az' }).lines).toEqual(['apple', 'Banana', 'item1', 'item10', 'item2']);
    expect(cleanLines(src, { ...all, sort: 'za' }).lines).toEqual(['item2', 'item10', 'item1', 'Banana', 'apple']);
    expect(cleanLines(src, { ...all, sort: 'natural' }).lines).toEqual(['apple', 'Banana', 'item1', 'item2', 'item10']);
    expect(cleanLines('ccc\na\nbb\nd', { ...all, sort: 'length' }).lines).toEqual(['a', 'd', 'bb', 'ccc']);
  });

  it('numeric sort uses the first number and puts lines without one last', () => {
    const src = 'ten 10\nnone\nminus -3\n2.5 apples\nalso none\nitem-7';
    expect(cleanLines(src, { ...all, sort: 'numeric' }).lines).toEqual(['minus -3', '2.5 apples', 'item-7', 'ten 10', 'none', 'also none']);
  });

  it('reverse and shuffle', () => {
    expect(cleanLines('a\nb\nc', { ...all, reverse: true }).text).toBe('c\nb\na');
    const s1 = cleanLines('1\n2\n3\n4\n5\n6\n7\n8', { ...all, sort: 'shuffle', seed: 42 }).lines;
    const s2 = cleanLines('1\n2\n3\n4\n5\n6\n7\n8', { ...all, sort: 'shuffle', seed: 42 }).lines;
    expect(s1).toEqual(s2);
    expect([...s1].sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });

  it('unicode', () => {
    expect(cleanLines('Ä\nä\n日本\n日本\n🎉', { ...all, dedupe: true, ignoreCase: true }).text).toBe('Ä\n日本\n🎉');
    expect(cleanLines('🎉🎉\nab\nc', { ...all, sort: 'length' }).lines).toEqual(['c', '🎉🎉', 'ab']);
  });

  it('large input', () => {
    const src = Array.from({ length: 200_000 }, (_, i) => `line ${i % 1000}`).join('\n');
    const r = cleanLines(src, { dedupe: true, sort: 'numeric' });
    expect(r.stats.linesAfter).toBe(1000);
    expect(r.lines[0]).toBe('line 0');
    expect(r.lines[999]).toBe('line 999');
  });

  it('firstNumber', () => {
    expect(firstNumber('abc')).toBeNull();
    expect(firstNumber('x 1e3 y')).toBe(1000);
    expect(firstNumber('.5')).toBe(0.5);
  });
});
