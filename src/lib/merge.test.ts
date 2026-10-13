import { describe, expect, it } from 'vitest';
import { computeDiff, splitLines, type DiffOptions } from './diffProcessor';
import { applyMerge } from './merge';
import { randomText, rng } from '@/test/random';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

describe('applyMerge', () => {
  it('overwrites a modified line in place', () => {
    const { lines } = computeDiff('a\nb\nc\n', 'a\nX\nc\n', base);
    expect(applyMerge(lines, 1, 'toRight', 'a\nb\nc\n', 'a\nX\nc\n')).toBe('a\nb\nc\n');
  });

  it('inserts a removed line where it belongs, not at the end', () => {
    const a = 'one\ntwo\nthree\n';
    const b = 'one\nthree\n';
    const { lines } = computeDiff(a, b, base);
    const idx = lines.findIndex((l) => l.type === 'removed');
    expect(applyMerge(lines, idx, 'toRight', a, b)).toBe(a);
  });

  it('keeps CRLF line endings of the target', () => {
    const { lines } = computeDiff('a\nb\n', 'a\r\nX\r\n', base);
    expect(applyMerge(lines, 1, 'toRight', 'a\nb\n', 'a\r\nX\r\n')).toBe('a\r\nb\r\n');
  });

  it('carries over the final-newline state when merging the last line', () => {
    const { lines } = computeDiff('a\nb', 'a\nc\n', base);
    expect(applyMerge(lines, 1, 'toRight', 'a\nb', 'a\nc\n')).toBe('a\nb');
  });

  it('makes b equal a after merging every change, one at a time (random)', () => {
    const rand = rng(31);
    for (let i = 0; i < 1500; i++) {
      const a = randomText(rand, 12);
      let right = randomText(rand, 12);
      for (let guard = 0; guard < 200; guard++) {
        const { lines } = computeDiff(a, right, base);
        const idx = lines.findIndex((l) => l.type !== 'unchanged');
        if (idx < 0) break;
        const line = lines[idx]!;
        const merged = line.type === 'added' ? null : applyMerge(lines, idx, 'toRight', a, right);
        if (merged != null && merged !== right) {
          right = merged;
        } else {
          // Extra lines on b (or a newline-only difference): remove b's line, as a user would
          const r = splitLines(right);
          r.splice(line.rightNum! - 1, 1);
          right = r.length ? r.join('\n') + '\n' : '';
        }
      }
      expect(right).toBe(a);
    }
  });
});
