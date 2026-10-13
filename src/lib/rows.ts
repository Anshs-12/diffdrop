import type { DiffLine } from './diffProcessor';

/**
 * The rows a diff view renders, as compact arrays (one entry per on-screen row).
 *
 * Split view: a value >= 0 is a diff line index.
 * Unified view: a value >= 0 is (lineIndex << 1) | part, where part 0 is the
 * removed/unchanged row and part 1 the added row (a modified line is two rows).
 * In both, a negative value -n is a fold row standing for n unchanged lines.
 */
export interface RowModel {
  rows: Int32Array;
  /** First row showing each diff line, or -1 when the line is folded away. */
  rowOfLine: Int32Array;
}

export function isFold(value: number): boolean {
  return value < 0;
}

export function foldCount(value: number): number {
  return -value;
}

export function unifiedLine(value: number): number {
  return value >> 1;
}

export function unifiedPart(value: number): 0 | 1 {
  return (value & 1) as 0 | 1;
}

/** Which lines stay visible when folding: changed lines plus `context` lines around them. */
function visibleMask(lines: DiffLine[], context: number): Uint8Array {
  const near = new Uint8Array(lines.length);
  let lastChange = -Infinity;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.type !== 'unchanged') lastChange = i;
    if (i - lastChange <= context) near[i] = 1;
  }
  let nextChange = Infinity;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i]!.type !== 'unchanged') nextChange = i;
    if (nextChange - i <= context) near[i] = 1;
  }
  return near;
}

function build(lines: DiffLine[], collapse: boolean, context: number, unified: boolean): RowModel {
  const mask = collapse ? visibleMask(lines, context) : null;
  const out: number[] = [];
  const rowOfLine = new Int32Array(lines.length).fill(-1);
  let gap = 0;

  for (let i = 0; i < lines.length; i++) {
    if (mask && !mask[i]) {
      gap++;
      continue;
    }
    if (gap > 0) {
      out.push(-gap);
      gap = 0;
    }
    rowOfLine[i] = out.length;
    if (!unified) {
      out.push(i);
      continue;
    }
    const line = lines[i]!;
    if (line.type === 'unchanged' || line.type === 'removed') out.push(i << 1);
    else if (line.type === 'added') out.push((i << 1) | 1);
    else out.push(i << 1, (i << 1) | 1);
  }
  if (gap > 0) out.push(-gap);
  return { rows: Int32Array.from(out), rowOfLine };
}

/**
 * Rows for the side-by-side view. When collapsing, unchanged lines further than
 * `context` lines from any change are folded into a single row.
 */
export function buildSplitRows(lines: DiffLine[], collapse: boolean, context = 3): RowModel {
  return build(lines, collapse, context, false);
}

/** Rows for the unified view (a modified line becomes a removed row and an added row). */
export function buildUnifiedRows(lines: DiffLine[], collapse: boolean, context = 3): RowModel {
  return build(lines, collapse, context, true);
}
