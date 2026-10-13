import { describe, expect, it } from 'vitest';
import { computeDiff, type DiffOptions } from './diffProcessor';
import { summarizeDiff } from './summary';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

describe('summarizeDiff', () => {
  it('says so when nothing changed', () => {
    expect(summarizeDiff(computeDiff('a\n', 'a\n', base))).toEqual({ headline: 'No differences.', points: [] });
  });

  it('counts lines and places', () => {
    const s = summarizeDiff(computeDiff('a\nb\nc\n', 'a\nB\nc\nd\n', base));
    expect(s.headline).toBe('2 lines added and 1 line removed in 2 places.');
  });

  it('spots a word that was replaced on several lines', () => {
    const s = summarizeDiff(
      computeDiff('let total = 1;\nx(total);\ntotal++;\n', 'let subtotal = 1;\nx(subtotal);\nsubtotal++;\n', base),
    );
    expect(s.points[0]).toBe('"total" became "subtotal" on 3 lines');
  });
});
