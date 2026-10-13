import React from 'react';
import type { InlineSpan } from '@/lib/diffProcessor';
import type { Token } from '@/lib/syntax';

interface LineContentProps {
  text: string;
  /** Word/character diff highlights; their texts concatenate to `text`. */
  spans?: InlineSpan[] | null;
  /** Syntax tokens as [start, end) offsets into `text`. */
  tokens?: Token[] | null;
  /** Lower-cased search text whose occurrences are marked. */
  find?: string;
}

/** [start, end) ranges of case-insensitive occurrences of `find` in `text`. */
function findRanges(text: string, find: string): number[] {
  const out: number[] = [];
  if (!find) return out;
  const hay = text.toLowerCase();
  for (let at = hay.indexOf(find); at !== -1; at = hay.indexOf(find, at + find.length)) out.push(at, at + find.length);
  return out;
}

/**
 * Renders one line, layering syntax colors and diff highlights. The text is cut
 * at every boundary of either layer, so each piece has at most one of each.
 */
export const LineContent: React.FC<LineContentProps> = ({ text, spans, tokens, find }) => {
  const hasSpans = spans != null && spans.length > 0;
  const hasTokens = tokens != null && tokens.length > 0;
  const hits = find ? findRanges(text, find) : [];
  if (!hasSpans && !hasTokens && hits.length === 0) return <>{text}</>;

  const cuts = new Set<number>([0, text.length]);
  for (const h of hits) cuts.add(h);
  const diffRanges: { start: number; end: number; type: InlineSpan['type'] }[] = [];
  if (hasSpans) {
    let pos = 0;
    for (const s of spans!) {
      diffRanges.push({ start: pos, end: pos + s.text.length, type: s.type });
      cuts.add(pos);
      pos += s.text.length;
      cuts.add(pos);
    }
  }
  if (hasTokens) {
    for (const t of tokens!) {
      cuts.add(t.start);
      cuts.add(t.end);
    }
  }
  const points = [...cuts].filter((c) => c >= 0 && c <= text.length).sort((a, b) => a - b);

  const pieces: React.ReactNode[] = [];
  let di = 0;
  let ti = 0;
  let hi = 0;
  for (let k = 0; k + 1 < points.length; k++) {
    const a = points[k]!;
    const b = points[k + 1]!;
    if (a === b) continue;
    while (di < diffRanges.length && diffRanges[di]!.end <= a) di++;
    while (hasTokens && ti < tokens!.length && tokens![ti]!.end <= a) ti++;
    const diff = diffRanges[di] && diffRanges[di]!.start <= a ? diffRanges[di]!.type : 'equal';
    const tok = hasTokens && tokens![ti] && tokens![ti]!.start <= a ? tokens![ti]!.kind : null;
    while (hi < hits.length && hits[hi + 1]! <= a) hi += 2;
    const hit = hi < hits.length && hits[hi]! <= a;

    const cls = [
      tok ? `tok-${tok}` : '',
      diff === 'added' ? 'inline-added' : diff === 'removed' ? 'inline-removed' : '',
      hit ? 'find-hit' : '',
    ]
      .filter(Boolean)
      .join(' ');
    const piece = text.slice(a, b);
    pieces.push(cls ? <span key={a} className={cls}>{piece}</span> : <React.Fragment key={a}>{piece}</React.Fragment>);
  }
  return <>{pieces}</>;
};

export const GapRow: React.FC<{ count: number; colSpan: number }> = ({ count, colSpan }) => (
  <tr className="fold-row">
    <td colSpan={colSpan}>
      <span>
        {count.toLocaleString()} unchanged {count === 1 ? 'line' : 'lines'}
      </span>
    </td>
  </tr>
);
