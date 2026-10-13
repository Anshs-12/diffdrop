import { describe, expect, it } from 'vitest';
import { computeDiff, type DiffOptions } from './diffProcessor';
import { buildLineMarks } from './marks';
import { buildVisibleRows } from './rows';
import { decodeHash, encodeHash } from './share';
import { columns, maxColumns } from './textWidth';

const base: DiffOptions = { ignoreWhitespace: false, ignoreCase: false, charLevel: false, ignorePatterns: [] };

describe('buildVisibleRows', () => {
  const a = Array.from({ length: 20 }, (_, i) => `l${i}`).join('\n') + '\n';
  const { lines } = computeDiff(a, a.replace('l10\n', 'X\n'), base);

  it('shows every line when not collapsing', () => {
    expect(buildVisibleRows(lines, false)).toHaveLength(lines.length);
  });

  it('folds unchanged lines beyond 3 lines of context', () => {
    const rows = buildVisibleRows(lines, true);
    expect(rows.map((r) => (r.kind === 'gap' ? `gap${r.count}` : 'line'))).toEqual([
      'gap7', // lines 1–7
      ...Array(7).fill('line'),
      'gap6', // lines 15–20
    ]);
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
