import type { DiffLine, InlineSpan } from './diffProcessor';

export interface LineMark {
  kind: 'add' | 'del';
  /** Word-level highlights for this line, or null to shade the whole line only. */
  spans: InlineSpan[] | null;
}

/** 1-based line number → highlight, for one editor. */
export type LineMarks = Map<number, LineMark>;

/** Split a diff into the highlights each editor needs to paint behind its own text. */
export function buildLineMarks(lines: DiffLine[]): { left: LineMarks; right: LineMarks } {
  const left: LineMarks = new Map();
  const right: LineMarks = new Map();
  for (const line of lines) {
    if (line.type === 'unchanged') continue;
    if (line.leftNum != null) left.set(line.leftNum, { kind: 'del', spans: line.leftSpans });
    if (line.rightNum != null) right.set(line.rightNum, { kind: 'add', spans: line.rightSpans });
  }
  return { left, right };
}
