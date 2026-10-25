/** Line cleaning: dedupe, trim, drop blank lines and sort, with before and after counts. */

export const LINE_SORTS = ['none', 'az', 'za', 'natural', 'length', 'numeric', 'shuffle'] as const;
export type LineSort = (typeof LINE_SORTS)[number];

export interface LineOptions {
  dedupe: boolean;
  /** Match duplicates ignoring case; the first occurrence's casing is kept. */
  ignoreCase: boolean;
  trim: boolean;
  /** Drop lines that are empty or only whitespace. */
  dropEmpty: boolean;
  sort: LineSort;
  reverse: boolean;
  /** Seed for the shuffle, so the same seed gives the same order. */
  seed?: number;
}

export const DEFAULT_LINE_OPTIONS: LineOptions = { dedupe: true, ignoreCase: false, trim: true, dropEmpty: true, sort: 'none', reverse: false };

export interface LineStats {
  linesBefore: number;
  uniqueBefore: number;
  linesAfter: number;
  removedDuplicates: number;
  removedEmpty: number;
}

/** Split text into lines on \n, \r\n or \r. A single trailing line break doesn't make an extra empty line. */
export function splitLines(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** The first number in a line (like -3.5 or 42), or null. A dash right after a letter ("item-7") isn't a minus sign. */
export function firstNumber(line: string): number | null {
  const m = /(?:(?<![\p{L}\p{N}_])[-+])?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?/u.exec(line);
  return m ? Number(m[0]) : null;
}

/** xorshift32, seeded. */
function rng(seed: number) {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

const collator = new Intl.Collator(undefined);
const naturalCollator = new Intl.Collator(undefined, { numeric: true });
const codePoints = (s: string) => {
  let n = 0;
  for (const _ of s) n++;
  return n;
};

function sortLines(lines: string[], sort: LineSort, seed: number): string[] {
  const out = [...lines];
  switch (sort) {
    case 'az':
      return out.sort(collator.compare);
    case 'za':
      return out.sort((a, b) => collator.compare(b, a));
    case 'natural':
      return out.sort(naturalCollator.compare);
    case 'length': {
      const len = new Map(out.map((l) => [l, codePoints(l)]));
      return out.sort((a, b) => len.get(a)! - len.get(b)!);
    }
    case 'numeric': {
      const num = new Map(out.map((l) => [l, firstNumber(l)]));
      // Lines without a number go last, in their original order
      return out.sort((a, b) => {
        const x = num.get(a)!;
        const y = num.get(b)!;
        if (x === null) return y === null ? 0 : 1;
        if (y === null) return -1;
        return x - y;
      });
    }
    case 'shuffle': {
      const r = rng(seed);
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    }
    default:
      return out;
  }
}

export function cleanLines(text: string, options: Partial<LineOptions> = {}): { text: string; lines: string[]; stats: LineStats } {
  const o = { ...DEFAULT_LINE_OPTIONS, ...options };
  const input = splitLines(text);
  const keyOf = (l: string) => {
    const t = o.trim ? l.trim() : l;
    return o.ignoreCase ? t.toLocaleLowerCase() : t;
  };
  const uniqueBefore = new Set(input.map(keyOf)).size;

  let lines = o.trim ? input.map((l) => l.trim()) : input;
  let removedEmpty = 0;
  if (o.dropEmpty) {
    const kept = lines.filter((l) => l.trim() !== '');
    removedEmpty = lines.length - kept.length;
    lines = kept;
  }
  let removedDuplicates = 0;
  if (o.dedupe) {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const l of lines) {
      const k = o.ignoreCase ? l.toLocaleLowerCase() : l;
      if (seen.has(k)) continue;
      seen.add(k);
      kept.push(l);
    }
    removedDuplicates = lines.length - kept.length;
    lines = kept;
  }
  lines = sortLines(lines, o.sort, o.seed ?? 1);
  if (o.reverse) lines.reverse();

  return {
    text: lines.join('\n'),
    lines,
    stats: { linesBefore: input.length, uniqueBefore, linesAfter: lines.length, removedDuplicates, removedEmpty },
  };
}
