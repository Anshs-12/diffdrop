import { describe, expect, it } from 'vitest';
import { computeDiff, type DiffOptions } from './diffProcessor';

/**
 * Budgets for the diff engine alone (rendering is covered by the browser tests).
 * Measured around 15 ms for 20k lines and 220 ms for 100k lines on an M-series
 * laptop; the limits leave plenty of room for slower CI machines while still
 * catching an accidental quadratic slowdown.
 */
const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

function fixture(lines: number, everyNth: number) {
  const a = Array.from({ length: lines }, (_, i) => `line ${i} value = ${i * 3};`).join('\n');
  const b = a
    .split('\n')
    .map((l, i) => (i % everyNth === 0 ? `${l} // edited` : l))
    .join('\n');
  return { a, b };
}

function time(fn: () => void): number {
  fn(); // warm up the JIT
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

describe('diff engine performance', () => {
  it('diffs 20,000 lines with 500 edits in under 250 ms', () => {
    const { a, b } = fixture(20_000, 40);
    expect(time(() => computeDiff(a, b, base))).toBeLessThan(250);
  });

  it('diffs 100,000 lines with 2,500 edits in under 3 s', () => {
    const { a, b } = fixture(100_000, 40);
    expect(time(() => computeDiff(a, b, base))).toBeLessThan(3000);
  });

  it('stays fast for character-level diffs of long lines', () => {
    const line = 'x'.repeat(5000);
    expect(time(() => computeDiff(`${line}a\n`, `${line}b\n`, { ...base, charLevel: true }))).toBeLessThan(250);
  });
});
