import { diffIds, intern, myersDiff, OP_DELETE, OP_EQUAL } from './myers';
import { columns } from './textWidth';
import { lineStartStates, type Lang } from './syntax';

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

/** Row kinds in a compact diff. */
export const ROW_UNCHANGED = 0;
export const ROW_REMOVED = 1;
export const ROW_ADDED = 2;
export const ROW_MODIFIED = 3;

const KIND_NAMES: DiffLine['type'][] = ['unchanged', 'removed', 'added', 'modified'];

/**
 * A diff as flat typed arrays, cheap to build and to transfer from the worker
 * (the buffers are handed over, not copied). Line text is not included: the
 * receiver already has both texts and looks lines up by number.
 */
export interface CompactDiff {
  /** Per row: ROW_UNCHANGED / ROW_REMOVED / ROW_ADDED / ROW_MODIFIED. */
  kinds: Uint8Array;
  /** Per row: 1-based line number on each side, 0 when the row has no line there. */
  leftNums: Int32Array;
  rightNums: Int32Array;
  /** Word/character highlights, only for modified rows that have them. */
  spans: { row: number; left: InlineSpan[] | null; right: InlineSpan[] | null }[];
  hunks: Hunk[];
  stats: DiffStats;
  eof: EofInfo;
  /** Widest line on either side, in monospace columns. */
  maxColumns: number;
  /** Per line, whether it starts inside a block comment (null = never). */
  leftStates: Uint8Array | null;
  rightStates: Uint8Array | null;
}

export interface DiffResult {
  lines: DiffLine[];
  hunks: Hunk[];
  stats: DiffStats;
  eof: EofInfo;
  maxColumns: number;
  leftStates: Uint8Array | null;
  rightStates: Uint8Array | null;
}

/**
 * Block-comment state at the start of each line, for syntax-coloring any line on
 * its own. Null when the language has no block comments or the text has none.
 */
export function blockCommentStates(text: string, lines: string[], lang: Lang | null): Uint8Array | null {
  if (lang !== 'c' && lang !== 'markup') return null;
  if (!text.includes(lang === 'c' ? '/*' : '<!--')) return null;
  return Uint8Array.from(lineStartStates(lines, lang));
}

/**
 * Compute a diff of two texts as a CompactDiff. `langs` (optional) adds the
 * block-comment states the views need for syntax colors.
 */
export function computeCompactDiff(
  originalText: string,
  changedText: string,
  options: DiffOptions,
  langs: { left: Lang | null; right: Lang | null } = { left: null, right: null },
): CompactDiff {
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

  const ids = intern(normOriginal, normChanged);
  const ops = diffIds(ids.a, ids.b, ids.distinct);

  const kinds = new Uint8Array(ops.length);
  const leftNums = new Int32Array(ops.length);
  const rightNums = new Int32Array(ops.length);
  const spans: CompactDiff['spans'] = [];
  const stats: DiffStats = { added: 0, removed: 0 };
  let rows = 0;
  let i = 0; // next line on the left (0-based)
  let j = 0; // next line on the right
  let p = 0;

  while (p < ops.length) {
    if (ops[p] === OP_EQUAL) {
      kinds[rows] = ROW_UNCHANGED;
      leftNums[rows] = ++i;
      rightNums[rows] = ++j;
      rows++;
      p++;
      continue;
    }

    // A change block: its deletions and insertions, in order
    const delStart = i;
    const insStart = j;
    while (p < ops.length && ops[p] !== OP_EQUAL) {
      if (ops[p] === OP_DELETE) i++;
      else j++;
      p++;
    }
    const dels = i - delStart;
    const ins = j - insStart;
    stats.removed += dels;
    stats.added += ins;

    // Pair the k-th removed line with the k-th added line as a modified row
    const pairs = Math.min(dels, ins);
    for (let k = 0; k < pairs; k++) {
      kinds[rows] = ROW_MODIFIED;
      leftNums[rows] = delStart + k + 1;
      rightNums[rows] = insStart + k + 1;
      const { leftSpans, rightSpans } = computeInlineSpans(
        originalLines[delStart + k]!,
        changedLines[insStart + k]!,
        options.charLevel,
      );
      if (leftSpans || rightSpans) spans.push({ row: rows, left: leftSpans, right: rightSpans });
      rows++;
    }
    for (let k = pairs; k < dels; k++) {
      kinds[rows] = ROW_REMOVED;
      leftNums[rows] = delStart + k + 1;
      rightNums[rows] = 0;
      rows++;
    }
    for (let k = pairs; k < ins; k++) {
      kinds[rows] = ROW_ADDED;
      leftNums[rows] = 0;
      rightNums[rows] = insStart + k + 1;
      rows++;
    }
  }

  // Hunks: runs of changed rows
  const hunks: Hunk[] = [];
  let hunkStart = -1;
  for (let r = 0; r < rows; r++) {
    if (kinds[r] !== ROW_UNCHANGED) {
      if (hunkStart === -1) hunkStart = r;
    } else if (hunkStart !== -1) {
      hunks.push({ startIndex: hunkStart, endIndex: r });
      hunkStart = -1;
    }
  }
  if (hunkStart !== -1) hunks.push({ startIndex: hunkStart, endIndex: rows });

  // A character is at most 4 columns wide (a tab), so shorter lines can be skipped
  let maxColumns = 0;
  for (const l of originalLines) if (l.length * 4 > maxColumns) maxColumns = Math.max(maxColumns, columns(l));
  for (const l of changedLines) if (l.length * 4 > maxColumns) maxColumns = Math.max(maxColumns, columns(l));

  return {
    kinds: kinds.slice(0, rows),
    leftNums: leftNums.slice(0, rows),
    rightNums: rightNums.slice(0, rows),
    spans,
    hunks,
    stats,
    eof,
    maxColumns,
    leftStates: blockCommentStates(originalText, originalLines, langs.left),
    rightStates: blockCommentStates(changedText, changedLines, langs.right),
  };
}

/** Turn a CompactDiff back into rows of text, using the caller's copy of both texts. */
export function expandDiff(compact: CompactDiff, originalLines: string[], changedLines: string[]): DiffResult {
  const { kinds, leftNums, rightNums } = compact;
  const lines: DiffLine[] = new Array(kinds.length);
  for (let r = 0; r < kinds.length; r++) {
    const ln = leftNums[r]!;
    const rn = rightNums[r]!;
    lines[r] = {
      leftNum: ln || null,
      rightNum: rn || null,
      leftContent: ln ? originalLines[ln - 1]! : null,
      rightContent: rn ? changedLines[rn - 1]! : null,
      type: KIND_NAMES[kinds[r]!]!,
      leftSpans: null,
      rightSpans: null,
    };
  }
  for (const s of compact.spans) {
    lines[s.row]!.leftSpans = s.left;
    lines[s.row]!.rightSpans = s.right;
  }
  return {
    lines,
    hunks: compact.hunks,
    stats: compact.stats,
    eof: compact.eof,
    maxColumns: compact.maxColumns,
    leftStates: compact.leftStates,
    rightStates: compact.rightStates,
  };
}

/**
 * Main function: compute a structured diff from two text inputs.
 */
export function computeDiff(originalText: string, changedText: string, options: DiffOptions): DiffResult {
  return expandDiff(
    computeCompactDiff(originalText, changedText, options),
    splitLines(originalText),
    splitLines(changedText),
  );
}
