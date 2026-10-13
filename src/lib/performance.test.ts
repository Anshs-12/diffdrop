import { describe, expect, it } from 'vitest';
import { computeCompactDiff, type DiffOptions } from './diffProcessor';

/**
 * Speed and correctness of the diff engine on large inputs (rendering is covered
 * by the browser tests). Measured on an M-series laptop: ~45 ms for 100k lines,
 * ~300 ms for 500k lines when run alone. Limits leave room for slower CI machines
 * and parallel test files, while still catching an accidental quadratic slowdown
 * (the old engine needed ~5 s for 500k lines and returned the wrong answer).
 */
const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

/** `lines` unique lines; every 40th one gets edited in the second text. */
function fixture(lines: number) {
  const a = Array.from({ length: lines }, (_, i) => `line ${i} value = ${i * 3};`).join('\n');
  const b = a
    .split('\n')
    .map((l, i) => (i % 40 === 0 ? `${l} // edited` : l))
    .join('\n');
  return { a, b, edits: Math.ceil(lines / 40) };
}

function time<T>(fn: () => T): { ms: number; value: T } {
  fn(); // warm up the JIT
  const t0 = performance.now();
  const value = fn();
  return { ms: performance.now() - t0, value };
}

describe('diff engine at scale', () => {
  for (const [lines, budgetMs] of [
    // Generous: other test files run in parallel and compete for the CPU
    [20_000, 500],
    [100_000, 1500],
    [500_000, 6000],
  ] as const) {
    it(`diffs ${lines.toLocaleString()} lines exactly, within ${budgetMs} ms`, () => {
      const { a, b, edits } = fixture(lines);
      const { ms, value } = time(() => computeCompactDiff(a, b, base));
      // The real minimal answer, not a "replace everything" fallback
      expect(value.stats).toEqual({ added: edits, removed: edits });
      expect(value.hunks).toHaveLength(edits);
      expect(ms).toBeLessThan(budgetMs);
    });
  }

  it('answers instantly when two big files share nothing', () => {
    const a = Array.from({ length: 200_000 }, (_, i) => `a${i}`).join('\n');
    const b = Array.from({ length: 200_000 }, (_, i) => `b${i}`).join('\n');
    const { ms, value } = time(() => computeCompactDiff(a, b, base));
    expect(value.stats).toEqual({ added: 200_000, removed: 200_000 });
    expect(ms).toBeLessThan(1500);
  });

  it('stays fast for character-level diffs of long lines', () => {
    const line = 'x'.repeat(5000);
    const { ms } = time(() => computeCompactDiff(`${line}a\n`, `${line}b\n`, { ...base, charLevel: true }));
    expect(ms).toBeLessThan(250);
  });
});
