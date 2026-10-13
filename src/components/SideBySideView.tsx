import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { DiffLine } from '@/lib/diffProcessor';
import type { VisibleRow } from '@/lib/rows';
import type { Token } from '@/lib/syntax';
import { GapRow, LineContent } from './DiffSpans';

interface SideBySideViewProps {
  rows: VisibleRow[];
  lineWrap: boolean;
  /** Syntax tokens per line (index = line number − 1), or null when off. */
  leftTokens: Token[][] | null;
  rightTokens: Token[][] | null;
  onMergeLeftToRight?: (index: number) => void;
  onMergeRightToLeft?: (index: number) => void;
  /** Widest line in monospace columns; keeps both halves equal when lines are long. */
  maxColumns?: number;
  /** Rendered as a table header, which browsers repeat on every printed page. */
  printHeader?: React.ReactNode;
}

function sideClasses(line: DiffLine): [string, string] {
  switch (line.type) {
    case 'removed':
      return ['is-del', 'is-empty'];
    case 'added':
      return ['is-empty', 'is-add'];
    case 'modified':
      return ['is-del', 'is-add'];
    default:
      return ['', ''];
  }
}

const SideBySideView: React.FC<SideBySideViewProps> = ({
  rows,
  lineWrap,
  leftTokens,
  rightTokens,
  onMergeLeftToRight,
  onMergeRightToLeft,
  maxColumns = 0,
  printHeader,
}) => (
  <table
    className={`diff-table split${lineWrap ? ' is-wrapped' : ''}`}
    // Each half: line number (48px) + code padding (26px) + the longest line
    style={lineWrap ? undefined : ({ '--split-min': `calc(2 * (74px + ${maxColumns}ch) + 44px)` } as React.CSSProperties)}
  >
    <colgroup>
      <col className="col-num" />
      <col className="col-content" />
      <col className="col-gutter" />
      <col className="col-num" />
      <col className="col-content" />
    </colgroup>
    {printHeader && (
      <thead>
        <tr>
          <th colSpan={5} className="print-head">
            {printHeader}
          </th>
        </tr>
      </thead>
    )}
    <tbody>
      {rows.map((row) => {
        if (row.kind === 'gap') return <GapRow key={row.key} count={row.count} colSpan={5} />;

        const { line, index } = row;
        const [left, right] = sideClasses(line);
        const changed = line.type !== 'unchanged';
        const canMerge = changed && onMergeLeftToRight && onMergeRightToLeft;

        return (
          <tr key={index} data-diff-line={index}>
            <td className={`num ${left}`}>{line.leftNum ?? ''}</td>
            <td className={`code ${left}`}>
              {line.leftContent != null && (
                <LineContent
                  text={line.leftContent}
                  spans={line.leftSpans}
                  tokens={line.leftNum != null ? leftTokens?.[line.leftNum - 1] : null}
                />
              )}
            </td>
            <td className="merge-gutter">
              {canMerge && (
                <div className="merge-actions">
                  {line.leftContent != null && (
                    <button
                      type="button"
                      className="merge-btn"
                      title="Copy to b"
                      aria-label={`Copy line ${line.leftNum} of a to b`}
                      onClick={() => onMergeLeftToRight(index)}
                    >
                      <ArrowRight className="size-3" />
                    </button>
                  )}
                  {line.rightContent != null && (
                    <button
                      type="button"
                      className="merge-btn"
                      title="Copy to a"
                      aria-label={`Copy line ${line.rightNum} of b to a`}
                      onClick={() => onMergeRightToLeft(index)}
                    >
                      <ArrowLeft className="size-3" />
                    </button>
                  )}
                </div>
              )}
            </td>
            <td className={`num ${right}`}>{line.rightNum ?? ''}</td>
            <td className={`code ${right}`}>
              {line.rightContent != null && (
                <LineContent
                  text={line.rightContent}
                  spans={line.rightSpans}
                  tokens={line.rightNum != null ? rightTokens?.[line.rightNum - 1] : null}
                />
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
);

export default SideBySideView;
