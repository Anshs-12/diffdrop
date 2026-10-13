import type { DiffLine } from './diffProcessor';

export type VisibleRow =
  | { kind: 'line'; index: number; line: DiffLine }
  | { kind: 'gap'; count: number; key: string };

/**
 * Decide which diff lines to render. When collapsing, unchanged lines further than
 * `context` lines from any change are folded into a single gap row.
 */
export function buildVisibleRows(lines: DiffLine[], collapse: boolean, context = 3): VisibleRow[] {
  if (!collapse) {
    return lines.map((line, index) => ({ kind: 'line', index, line }));
  }

  // Distance (in lines) to the nearest change, in either direction
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

  const rows: VisibleRow[] = [];
  let gap = 0;
  for (let i = 0; i < lines.length; i++) {
    if (near[i]) {
      if (gap > 0) rows.push({ kind: 'gap', count: gap, key: `gap-${i}` });
      gap = 0;
      rows.push({ kind: 'line', index: i, line: lines[i]! });
    } else {
      gap++;
    }
  }
  if (gap > 0) rows.push({ kind: 'gap', count: gap, key: 'gap-end' });
  return rows;
}
