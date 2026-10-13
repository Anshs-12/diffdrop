import type { DiffLine, DiffResult } from './diffProcessor';

export interface ChangeSummary {
  headline: string;
  points: string[];
}

function plural(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? '' : 's'}`;
}

function range(nums: number[]): string {
  if (nums.length === 0) return '';
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi ? `${lo}` : `${lo}–${hi}`;
}

function words(text: string): string[] {
  return text.match(/[\p{L}\p{N}_.$-]+/gu) ?? [];
}

/** Words that appear more often on one side than the other (multiset difference). */
function wordDelta(before: string, after: string): { out: string[]; inn: string[] } {
  const counts = new Map<string, number>();
  for (const w of words(before)) counts.set(w, (counts.get(w) ?? 0) + 1);
  for (const w of words(after)) counts.set(w, (counts.get(w) ?? 0) - 1);
  const out: string[] = [];
  const inn: string[] = [];
  for (const [w, c] of counts) {
    for (let i = 0; i < c; i++) out.push(w);
    for (let i = 0; i < -c; i++) inn.push(w);
  }
  return { out, inn };
}

/**
 * A deterministic, offline summary of a diff: totals, where the changes are,
 * and words that were consistently replaced (likely renames).
 */
export function summarizeDiff(result: DiffResult): ChangeSummary {
  const { lines, hunks, stats } = result;
  if (hunks.length === 0) return { headline: 'No differences.', points: [] };

  const headline =
    `${plural(stats.added, 'line')} added and ${plural(stats.removed, 'line')} removed ` +
    `in ${plural(hunks.length, 'place')}.`;

  // Replacements: modified lines where exactly one word went out and one came in
  const replacements = new Map<string, number[]>();
  for (const line of lines) {
    if (line.type !== 'modified') continue;
    const { out, inn } = wordDelta(line.leftContent!, line.rightContent!);
    if (out.length === 1 && inn.length === 1) {
      const key = `${out[0]}\u0000${inn[0]}`;
      replacements.set(key, [...(replacements.get(key) ?? []), line.rightNum!]);
    }
  }

  const points: string[] = [];
  const sorted = [...replacements.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [key, at] of sorted.slice(0, 4)) {
    const [from, to] = key.split('\u0000');
    points.push(
      at.length > 1
        ? `"${from}" became "${to}" on ${plural(at.length, 'line')}`
        : `"${from}" became "${to}" on line ${at[0]}`,
    );
  }

  const describe = (slice: DiffLine[]): string => {
    const changed = slice.filter((l) => l.type === 'modified').length;
    const added = slice.filter((l) => l.type === 'added').length;
    const removed = slice.filter((l) => l.type === 'removed').length;
    const parts = [
      changed && `${plural(changed, 'line')} changed`,
      added && `${plural(added, 'line')} added`,
      removed && `${plural(removed, 'line')} removed`,
    ].filter(Boolean);
    const left = range(slice.flatMap((l) => (l.leftNum != null ? [l.leftNum] : [])));
    const right = range(slice.flatMap((l) => (l.rightNum != null ? [l.rightNum] : [])));
    const where = right ? `b:${right}` : `after a:${left}`;
    return `${where}: ${parts.join(', ')}`;
  };

  const shown = hunks.slice(0, 6);
  for (const h of shown) points.push(describe(lines.slice(h.startIndex, h.endIndex)));
  if (hunks.length > shown.length) points.push(`…and ${plural(hunks.length - shown.length, 'more place')}`);

  return { headline, points };
}
