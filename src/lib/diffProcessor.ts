import { myersDiff, type DiffMove } from './myers';

/**
 * Types for the structured diff output used by the UI.
 */

/** A span of characters within a line, with a type */
export interface InlineSpan {
  text: string;
  type: 'equal' | 'added' | 'removed';
}

/** One row in the side-by-side view */
export interface DiffLine {
  leftNum: number | null;
  rightNum: number | null;
  leftContent: string | null;
  rightContent: string | null;
  type: 'unchanged' | 'added' | 'removed' | 'modified';
  leftSpans: InlineSpan[] | null;
  rightSpans: InlineSpan[] | null;
}

/** A group of contiguous changed lines (a hunk) */
export interface Hunk {
  startIndex: number; // index into DiffLine[]
  endIndex: number;   // exclusive
}

export interface DiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}

export interface DiffResult {
  lines: DiffLine[];
  hunks: Hunk[];
}

/**
 * Normalize lines based on options before diffing.
 */
function normalizeLines(lines: string[], opts: DiffOptions): string[] {
  return lines.map((line) => {
    let l = line;
    if (opts.ignoreWhitespace) l = l.replace(/\s+/g, ' ').trim();
    if (opts.ignoreCase) l = l.toLowerCase();
    return l;
  });
}

/**
 * Compute inline character-level diff between two strings using Myers.
 */
function computeInlineSpans(
  oldStr: string,
  newStr: string,
): { leftSpans: InlineSpan[]; rightSpans: InlineSpan[] } {
  const oldChars = oldStr.split('');
  const newChars = newStr.split('');
  const charDiff = myersDiff(oldChars, newChars);

  const leftSpans: InlineSpan[] = [];
  const rightSpans: InlineSpan[] = [];

  for (const move of charDiff) {
    if (move.moveType === 'unchanged') {
      // Append to last span if same type, else create new
      const lastLeft = leftSpans[leftSpans.length - 1];
      if (lastLeft && lastLeft.type === 'equal') {
        lastLeft.text += move.line;
      } else {
        leftSpans.push({ text: move.line, type: 'equal' });
      }
      const lastRight = rightSpans[rightSpans.length - 1];
      if (lastRight && lastRight.type === 'equal') {
        lastRight.text += move.line;
      } else {
        rightSpans.push({ text: move.line, type: 'equal' });
      }
    } else if (move.moveType === 'delete') {
      const lastLeft = leftSpans[leftSpans.length - 1];
      if (lastLeft && lastLeft.type === 'removed') {
        lastLeft.text += move.line;
      } else {
        leftSpans.push({ text: move.line, type: 'removed' });
      }
    } else if (move.moveType === 'add') {
      const lastRight = rightSpans[rightSpans.length - 1];
      if (lastRight && lastRight.type === 'added') {
        lastRight.text += move.line;
      } else {
        rightSpans.push({ text: move.line, type: 'added' });
      }
    }
  }

  return { leftSpans, rightSpans };
}

/**
 * Main function: compute a structured diff from two text inputs.
 */
export function computeDiff(
  originalText: string,
  changedText: string,
  options: DiffOptions,
): DiffResult {
  const originalLines = originalText.split('\n');
  const changedLines = changedText.split('\n');

  // Normalize for comparison, but keep original content for display
  const normOriginal = normalizeLines(originalLines, options);
  const normChanged = normalizeLines(changedLines, options);

  const moves = myersDiff(normOriginal, normChanged);

  // Map moves back to original lines with proper line numbers
  const lines: DiffLine[] = [];
  let leftIdx = 0;
  let rightIdx = 0;

  for (const move of moves) {
    if (move.moveType === 'unchanged') {
      lines.push({
        leftNum: leftIdx + 1,
        rightNum: rightIdx + 1,
        leftContent: originalLines[leftIdx] ?? '',
        rightContent: changedLines[rightIdx] ?? '',
        type: 'unchanged',
        leftSpans: null,
        rightSpans: null,
      });
      leftIdx++;
      rightIdx++;
    } else if (move.moveType === 'delete') {
      lines.push({
        leftNum: leftIdx + 1,
        rightNum: null,
        leftContent: originalLines[leftIdx] ?? '',
        rightContent: null,
        type: 'removed',
        leftSpans: null,
        rightSpans: null,
      });
      leftIdx++;
    } else if (move.moveType === 'add') {
      lines.push({
        leftNum: null,
        rightNum: rightIdx + 1,
        leftContent: null,
        rightContent: changedLines[rightIdx] ?? '',
        type: 'added',
        leftSpans: null,
        rightSpans: null,
      });
      rightIdx++;
    }
  }

  // Post-process: pair adjacent delete+add into "modified" lines with inline spans
  const merged: DiffLine[] = [];
  let i = 0;
  while (i < lines.length) {
    const current = lines[i]!;
    if (current.type === 'removed' && i + 1 < lines.length && lines[i + 1]!.type === 'added') {
      const next = lines[i + 1]!;
      const { leftSpans, rightSpans } = computeInlineSpans(
        current.leftContent!,
        next.rightContent!,
      );
      merged.push({
        leftNum: current.leftNum,
        rightNum: next.rightNum,
        leftContent: current.leftContent,
        rightContent: next.rightContent,
        type: 'modified',
        leftSpans,
        rightSpans,
      });
      i += 2;
    } else {
      merged.push(current);
      i++;
    }
  }

  // Compute hunks (groups of contiguous changed lines)
  const hunks: Hunk[] = [];
  let hunkStart = -1;
  for (let j = 0; j < merged.length; j++) {
    const line = merged[j]!;
    if (line.type !== 'unchanged') {
      if (hunkStart === -1) hunkStart = j;
    } else {
      if (hunkStart !== -1) {
        hunks.push({ startIndex: hunkStart, endIndex: j });
        hunkStart = -1;
      }
    }
  }
  if (hunkStart !== -1) {
    hunks.push({ startIndex: hunkStart, endIndex: merged.length });
  }

  return { lines: merged, hunks };
}
