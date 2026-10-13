import { describe, expect, it } from 'vitest';
import { computeDiff, type DiffOptions } from './diffProcessor';
import { buildLineMarks } from './marks';
import { buildSplitRows, buildUnifiedRows, foldCount, isFold, unifiedLine, unifiedPart } from './rows';
import { decodeHash, encodeHash } from './share';
import { columns, maxColumns } from './textWidth';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

describe('row models', () => {
  const a = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n') + '\n';
  const { lines } = computeDiff(a, a.replace('l10\n', 'X\n'), base);
  const describeRows = (rows: Int32Array) => [...rows].map((v) => (isFold(v) ? `fold${foldCount(v)}` : 'line'));

  it('shows every line when not collapsing', () => {
    const { rows, rowOfLine } = buildSplitRows(lines, false);
    expect(rows).toHaveLength(lines.length);
    expect([...rowOfLine]).toEqual(lines.map((_, i) => i));
  });

  it('folds unchanged lines beyond 3 lines of context', () => {
    const { rows, rowOfLine } = buildSplitRows(lines, true);
    expect(describeRows(rows)).toEqual([
      'fold7', // lines 1–7
      ...Array(7).fill('line'),
      'fold6', // lines 15–20
    ]);
    expect(rowOfLine[0]).toBe(-1);
    expect(rowOfLine[10]).toBe(4);
  });

  it('gives a modified line two rows in the unified view', () => {
    const { rows, rowOfLine } = buildUnifiedRows(lines, true);
    expect(describeRows(rows)).toEqual(['fold7', ...Array(8).fill('line'), 'fold6']);
    const r = rowOfLine[10]!;
    expect([unifiedLine(rows[r]!), unifiedPart(rows[r]!)]).toEqual([10, 0]);
    expect([unifiedLine(rows[r + 1]!), unifiedPart(rows[r + 1]!)]).toEqual([10, 1]);
  });
});

describe('buildLineMarks', () => {
  it('marks removed lines on a and added lines on b by line number', () => {
    const { left, right } = buildLineMarks(computeDiff('a\nb\n', 'a\nc\nd\n', base).lines);
    expect([...left.keys()]).toEqual([2]);
    expect([...right.keys()]).toEqual([2, 3]);
    expect(left.get(2)!.kind).toBe('del');
    expect(right.get(3)!.kind).toBe('add');
  });
});

describe('columns', () => {
  it('counts tabs to the next stop and wide characters as two', () => {
    expect(columns('abc')).toBe(3);
    expect(columns('\tx')).toBe(5);
    expect(columns('ab\tx')).toBe(5);
    expect(columns('日本')).toBe(4);
    expect(columns('😀')).toBe(2);
  });

  it('finds the widest line on either side', () => {
    expect(maxColumns(computeDiff('a\n', 'abcdef\n', base).lines)).toBe(6);
  });
});

describe('share links', () => {
  it('round-trips both texts through the URL fragment', () => {
    const hash = encodeHash('a\nb', 'unicode ✓ 😀');
    expect(decodeHash(`#${hash}`)).toEqual({ original: 'a\nb', changed: 'unicode ✓ 😀' });
  });

  it('rejects empty or corrupted fragments', () => {
    expect(decodeHash('')).toBeNull();
    expect(decodeHash('#not-valid-lz')).toBeNull();
  });
});
