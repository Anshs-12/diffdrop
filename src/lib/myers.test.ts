import { describe, expect, it } from 'vitest';
import { myersDiff, type DiffMove } from './myers';
import { lcsLength, randomTokens, rng } from '@/test/random';

const oldSide = (moves: DiffMove[]) => moves.filter((m) => m.moveType !== 'add').map((m) => m.line);
const newSide = (moves: DiffMove[]) => moves.filter((m) => m.moveType !== 'delete').map((m) => m.line);
const edits = (moves: DiffMove[]) => moves.filter((m) => m.moveType !== 'unchanged').length;

describe('myersDiff', () => {
  it('handles empty inputs', () => {
    expect(myersDiff([], [])).toEqual([]);
    expect(myersDiff([], ['a', 'b'])).toEqual([
      { line: 'a', moveType: 'add' },
      { line: 'b', moveType: 'add' },
    ]);
    expect(myersDiff(['a'], [])).toEqual([{ line: 'a', moveType: 'delete' }]);
  });

  it('returns only unchanged moves for identical input', () => {
    const lines = ['a', 'b', 'c'];
    expect(myersDiff(lines, lines).every((m) => m.moveType === 'unchanged')).toBe(true);
  });

  it('finds a single replacement in the middle', () => {
    expect(myersDiff(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual([
      { line: 'a', moveType: 'unchanged' },
      { line: 'b', moveType: 'delete' },
      { line: 'x', moveType: 'add' },
      { line: 'c', moveType: 'unchanged' },
    ]);
  });

  // Regression: the original port lost lines on this input
  it('keeps every line for inputs the original implementation dropped', () => {
    const a = ['b', 'a', 'b', 'a', 'b'];
    const b = ['b', 'a', 'c', 'b', 'b', 'b', 'a', 'c'];
    const moves = myersDiff(a, b);
    expect(oldSide(moves)).toEqual(a);
    expect(newSide(moves)).toEqual(b);
  });

  for (const seed of [1, 2, 3, 4, 5]) {
    it(`is a minimal, lossless edit script (random, seed ${seed})`, () => {
      const rand = rng(seed);
      for (let i = 0; i < 4000; i++) {
        const alphabet = i % 2 ? ['a', 'b'] : ['a', 'b', 'c', 'd'];
        const a = randomTokens(rand, i % 3 === 0 ? 40 : 12, alphabet);
        const b = randomTokens(rand, i % 3 === 0 ? 40 : 12, alphabet);
        const moves = myersDiff(a, b);
        expect(oldSide(moves)).toEqual(a);
        expect(newSide(moves)).toEqual(b);
        expect(edits(moves)).toBe(a.length + b.length - 2 * lcsLength(a, b));
      }
    });
  }

  it('never loses lines on large inputs (unique-line anchors and the cost cap)', () => {
    const rand = rng(99);
    // Few distinct lines: few anchors, so big gaps where the cost cap applies
    for (let round = 0; round < 3; round++) {
      const a = randomTokens(rand, 9000, ['{', '}', 'return;', '', 'x++;', `u${round}`]);
      const b = randomTokens(rand, 9000, ['{', '}', 'return;', '', 'x++;', `v${round}`]);
      const moves = myersDiff(a, b);
      expect(oldSide(moves)).toEqual(a);
      expect(newSide(moves)).toEqual(b);
    }
    // Mostly unique lines with random edits: anchored path
    const a = Array.from({ length: 12_000 }, (_, i) => `line ${i}`);
    const b = a.flatMap((l, i) => (rand() < 0.02 ? [] : rand() < 0.02 ? [l, `new ${i}`] : rand() < 0.02 ? [`edit ${i}`] : [l]));
    const moves = myersDiff(a, b);
    expect(oldSide(moves)).toEqual(a);
    expect(newSide(moves)).toEqual(b);
  });

  it('falls back to delete-all/add-all when the edit distance is enormous', () => {
    // 6k vs 6k completely different lines needs ~36M snapshot cells (> the cap)
    const a = Array.from({ length: 6000 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 6000 }, (_, i) => `b${i}`);
    const moves = myersDiff(a, b);
    expect(oldSide(moves)).toEqual(a);
    expect(newSide(moves)).toEqual(b);
  });
});
