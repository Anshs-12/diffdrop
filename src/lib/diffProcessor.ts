import { myersDiff } from './myers';

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
  /** Highlight changed characters instead of changed words inside modified lines. */
  charLevel: boolean;
  /** Regex sources; text matching any of them is ignored when comparing lines. */
  ignorePatterns: string[];
}

export interface DiffStats {
  added: number;
  removed: number;
}

/** Whether each side is missing a newline at the end of its last line. */
export interface EofInfo {
  oldMissing: boolean;
  newMissing: boolean;
}

export interface DiffResult {
  lines: DiffLine[];
  hunks: Hunk[];
  stats: DiffStats;
  eof: EofInfo;
}

/** Lines longer than this are highlighted as a whole instead of word-by-word. */
const MAX_INLINE_LENGTH = 10_000;

/**
 * Paired lines sharing less than this fraction of their (non-whitespace) characters
 * are shown side by side without word highlights, which would only be noise.
 */
const MIN_INLINE_SIMILARITY = 0.5;

/**
 * Split text into lines. A final newline terminates the last line rather than
 * starting a new one, so "a\n" is one line and "" is none.
 */
export function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** True when the text has content but its last line has no terminating newline. */
export function missingFinalNewline(text: string): boolean {
  return text !== '' && !text.endsWith('\n');
}

/** Compile ignore patterns, skipping any that are not valid regular expressions. */
export function compileIgnorePatterns(patterns: string[]): RegExp[] {
  const out: RegExp[] = [];
  for (const p of patterns) {
    try {
      out.push(new RegExp(p, 'g'));
    } catch {
      // Invalid patterns are rejected in the UI; ignore any that slip through
    }
  }
  return out;
}

/**
 * Normalize lines based on options before diffing.
 */
function normalizeLines(lines: string[], opts: DiffOptions, ignore: RegExp[]): string[] {
  return lines.map((line) => {
    let l = line;
    for (const re of ignore) l = l.replace(re, '');
    if (opts.ignoreWhitespace) l = l.replace(/\s+/g, ' ').trim();
    if (opts.ignoreCase) l = l.toLowerCase();
    return l;
  });
}

/** Split a line into words, whitespace runs and single punctuation characters. */
function tokenizeWords(str: string): string[] {
  return str.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) ?? [];
}

/** Split a line into characters (code points, so emoji and astral characters stay whole). */
function tokenizeChars(str: string): string[] {
  return Array.from(str);
}

function pushSpan(spans: InlineSpan[], text: string, type: InlineSpan['type']) {
  const last = spans[spans.length - 1];
  if (last && last.type === type) {
    last.text += text;
  } else {
    spans.push({ text, type });
  }
}

/**
 * Compute inline word-level diff between two strings using Myers.
 */
function computeInlineSpans(
  oldStr: string,
  newStr: string,
  charLevel: boolean,
): { leftSpans: InlineSpan[] | null; rightSpans: InlineSpan[] | null } {
  if (oldStr.length > MAX_INLINE_LENGTH || newStr.length > MAX_INLINE_LENGTH) {
    return { leftSpans: null, rightSpans: null };
  }

  const tokenize = charLevel ? tokenizeChars : tokenizeWords;
  const moves = myersDiff(tokenize(oldStr), tokenize(newStr));

  let shared = 0;
  for (const move of moves) {
    if (move.moveType === 'unchanged') shared += move.line.trim().length;
  }
  const total = oldStr.replace(/\s+/g, '').length + newStr.replace(/\s+/g, '').length;
  if (total > 0 && (2 * shared) / total < MIN_INLINE_SIMILARITY) {
    return { leftSpans: null, rightSpans: null };
  }

  const leftSpans: InlineSpan[] = [];
  const rightSpans: InlineSpan[] = [];

  for (const move of moves) {
    if (move.moveType === 'unchanged') {
      pushSpan(leftSpans, move.line, 'equal');
      pushSpan(rightSpans, move.line, 'equal');
    } else if (move.moveType === 'delete') {
      pushSpan(leftSpans, move.line, 'removed');
    } else {
      pushSpan(rightSpans, move.line, 'added');
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
  const originalLines = splitLines(originalText);
  const changedLines = splitLines(changedText);

  const eof: EofInfo = {
    oldMissing: missingFinalNewline(originalText),
    newMissing: missingFinalNewline(changedText),
  };

  // Normalize for comparison, but keep original content for display
  const ignore = compileIgnorePatterns(options.ignorePatterns);
  const normOriginal = normalizeLines(originalLines, options, ignore);
  const normChanged = normalizeLines(changedLines, options, ignore);

  // Like git, a last line without a newline only matches another such last line
  if (!options.ignoreWhitespace) {
    const marker = '\u0000no-eol';
    if (eof.oldMissing) normOriginal[normOriginal.length - 1] += marker;
    if (eof.newMissing) normChanged[normChanged.length - 1] += marker;
  }

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
        leftContent: originalLines[leftIdx]!,
        rightContent: changedLines[rightIdx]!,
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
        leftContent: originalLines[leftIdx]!,
        rightContent: null,
        type: 'removed',
        leftSpans: null,
        rightSpans: null,
      });
      leftIdx++;
    } else {
      lines.push({
        leftNum: null,
        rightNum: rightIdx + 1,
        leftContent: null,
        rightContent: changedLines[rightIdx]!,
        type: 'added',
        leftSpans: null,
        rightSpans: null,
      });
      rightIdx++;
    }
  }

  // Post-process: within each change block, pair the i-th removed line with the
  // i-th added line as a "modified" line with inline spans; leftovers stay as-is.
  const merged: DiffLine[] = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i]!.type === 'unchanged') {
      merged.push(lines[i]!);
      i++;
      continue;
    }

    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (i < lines.length && lines[i]!.type !== 'unchanged') {
      (lines[i]!.type === 'removed' ? removed : added).push(lines[i]!);
      i++;
    }

    const pairs = Math.min(removed.length, added.length);
    for (let p = 0; p < pairs; p++) {
      const left = removed[p]!;
      const right = added[p]!;
      const { leftSpans, rightSpans } = computeInlineSpans(
        left.leftContent!,
        right.rightContent!,
        options.charLevel,
      );
      merged.push({
        leftNum: left.leftNum,
        rightNum: right.rightNum,
        leftContent: left.leftContent,
        rightContent: right.rightContent,
        type: 'modified',
        leftSpans,
        rightSpans,
      });
    }
    merged.push(...removed.slice(pairs), ...added.slice(pairs));
  }

  // Compute hunks (groups of contiguous changed lines)
  const hunks: Hunk[] = [];
  let hunkStart = -1;
  for (let j = 0; j < merged.length; j++) {
    if (merged[j]!.type !== 'unchanged') {
      if (hunkStart === -1) hunkStart = j;
    } else if (hunkStart !== -1) {
      hunks.push({ startIndex: hunkStart, endIndex: j });
      hunkStart = -1;
    }
  }
  if (hunkStart !== -1) {
    hunks.push({ startIndex: hunkStart, endIndex: merged.length });
  }

  const stats: DiffStats = { added: 0, removed: 0 };
  for (const move of moves) {
    if (move.moveType === 'add') stats.added++;
    else if (move.moveType === 'delete') stats.removed++;
  }

  return { lines: merged, hunks, stats, eof };
}
