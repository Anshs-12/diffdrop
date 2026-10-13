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

  it('falls back to delete-all/add-all when the edit distance is enormous', () => {
    // 6k vs 6k completely different lines needs ~36M snapshot cells (> the cap)
    const a = Array.from({ length: 6000 }, (_, i) => `a${i}`);
    const b = Array.from({ length: 6000 }, (_, i) => `b${i}`);
    const moves = myersDiff(a, b);
    expect(oldSide(moves)).toEqual(a);
    expect(newSide(moves)).toEqual(b);
  });
});
