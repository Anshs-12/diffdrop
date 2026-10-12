import React from 'react';
import type { DiffLine, InlineSpan } from '../lib/diffProcessor';

interface SideBySideViewProps {
  lines: DiffLine[];
  hideUnchanged: boolean;
  lineWrap: boolean;
  onMergeLeftToRight: (index: number) => void;
  onMergeRightToLeft: (index: number) => void;
}

const renderSpans = (spans: InlineSpan[] | null, fallback: string | null) => {
  if (!spans || spans.length === 0) {
    return fallback ?? '';
  }
  return spans.map((span, i) => {
    let cls = '';
    if (span.type === 'added') cls = 'inline-added';
    else if (span.type === 'removed') cls = 'inline-removed';
    return (
      <span key={i} className={cls}>
        {span.text}
      </span>
    );
  });
};

const SideBySideView: React.FC<SideBySideViewProps> = ({
  lines,
  hideUnchanged,
  lineWrap,
  onMergeLeftToRight,
  onMergeRightToLeft,
}) => {
  // If hiding unchanged, insert separator rows
  const rows: (DiffLine | 'separator')[] = [];
  let lastWasHidden = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (hideUnchanged && line.type === 'unchanged') {
      if (!lastWasHidden) {
        rows.push('separator');
        lastWasHidden = true;
      }
      continue;
    }
    lastWasHidden = false;
    rows.push(line);
  }

  const contentClass = `diff-line-content${lineWrap ? ' wrap' : ''}`;

  return (
    <div className="diff-panel">
      <table className="diff-table side-by-side">
        <colgroup>
          <col className="diff-col-left-num" />
          <col className="diff-col-left-content" />
          <col className="diff-col-gutter" />
          <col className="diff-col-right-num" />
          <col className="diff-col-right-content" />
        </colgroup>
        <tbody>
          {rows.map((row, idx) => {
            if (row === 'separator') {
              return (
                <tr key={`sep-${idx}`} className="hunk-separator">
                  <td colSpan={5}>···</td>
                </tr>
              );
            }

            const line = row;
            let leftClass = '';
            let rightClass = '';

            if (line.type === 'removed') {
              leftClass = 'diff-line-removed';
            } else if (line.type === 'added') {
              rightClass = 'diff-line-added';
            } else if (line.type === 'modified') {
              leftClass = 'diff-line-modified-left diff-line-removed';
              rightClass = 'diff-line-modified-right diff-line-added';
            } else {
              leftClass = 'diff-line-unchanged';
              rightClass = 'diff-line-unchanged';
            }

            const showMerge = line.type !== 'unchanged';

            // Find original index for merge operations
            const origIndex = lines.indexOf(line);

            return (
              <tr key={idx} data-diff-line={origIndex}>
                <td className={`diff-line-num ${leftClass}`}>
                  {line.leftNum ?? ''}
                </td>
                <td className={`${contentClass} ${leftClass}`}>
                  {line.type === 'modified'
                    ? renderSpans(line.leftSpans, line.leftContent)
                    : (line.leftContent ?? '')}
                </td>
                <td className="diff-gutter">
                  {showMerge && (
                    <>
                      {line.leftContent != null && (
                        <button
                          className="merge-btn"
                          title="Copy to right"
                          onClick={() => onMergeLeftToRight(origIndex)}
                        >
                          →
                        </button>
                      )}
                      {line.rightContent != null && (
                        <button
                          className="merge-btn"
                          title="Copy to left"
                          onClick={() => onMergeRightToLeft(origIndex)}
                        >
                          ←
                        </button>
                      )}
                    </>
                  )}
                </td>
                <td className={`diff-line-num ${rightClass}`}>
                  {line.rightNum ?? ''}
                </td>
                <td className={`${contentClass} ${rightClass}`}>
                  {line.type === 'modified'
                    ? renderSpans(line.rightSpans, line.rightContent)
                    : (line.rightContent ?? '')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SideBySideView;
