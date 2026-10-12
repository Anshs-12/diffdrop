import React from 'react';
import type { DiffLine, InlineSpan } from '../lib/diffProcessor';

interface UnifiedViewProps {
  lines: DiffLine[];
  hideUnchanged: boolean;
  lineWrap: boolean;
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

const UnifiedView: React.FC<UnifiedViewProps> = ({
  lines,
  hideUnchanged,
  lineWrap,
}) => {
  // Build unified rows: for modified lines, show delete then add
  const rows: {
    key: string;
    oldNum: number | null;
    newNum: number | null;
    prefix: string;
    content: React.ReactNode;
    className: string;
    origIndex: number;
  }[] = [];

  let lastWasHidden = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (hideUnchanged && line.type === 'unchanged') {
      if (!lastWasHidden) {
        rows.push({
          key: `sep-${i}`,
          oldNum: null,
          newNum: null,
          prefix: '',
          content: '···',
          className: 'hunk-separator',
          origIndex: i,
        });
        lastWasHidden = true;
      }
      continue;
    }
    lastWasHidden = false;

    if (line.type === 'unchanged') {
      rows.push({
        key: `u-${i}`,
        oldNum: line.leftNum,
        newNum: line.rightNum,
        prefix: ' ',
        content: line.leftContent ?? '',
        className: 'diff-line-unchanged',
        origIndex: i,
      });
    } else if (line.type === 'removed') {
      rows.push({
        key: `r-${i}`,
        oldNum: line.leftNum,
        newNum: null,
        prefix: '−',
        content: line.leftContent ?? '',
        className: 'diff-line-removed',
        origIndex: i,
      });
    } else if (line.type === 'added') {
      rows.push({
        key: `a-${i}`,
        oldNum: null,
        newNum: line.rightNum,
        prefix: '+',
        content: line.rightContent ?? '',
        className: 'diff-line-added',
        origIndex: i,
      });
    } else if (line.type === 'modified') {
      // Show as delete then add
      rows.push({
        key: `mr-${i}`,
        oldNum: line.leftNum,
        newNum: null,
        prefix: '−',
        content: renderSpans(line.leftSpans, line.leftContent),
        className: 'diff-line-removed',
        origIndex: i,
      });
      rows.push({
        key: `ma-${i}`,
        oldNum: null,
        newNum: line.rightNum,
        prefix: '+',
        content: renderSpans(line.rightSpans, line.rightContent),
        className: 'diff-line-added',
        origIndex: i,
      });
    }
  }

  const contentClass = `diff-line-content${lineWrap ? ' wrap' : ''}`;

  return (
    <div className="diff-panel">
      <table className="diff-table unified">
        <colgroup>
          <col className="diff-col-old-num" />
          <col className="diff-col-new-num" />
          <col className="diff-col-prefix" />
          <col className="diff-col-content" />
        </colgroup>
        <tbody>
          {rows.map((row) => {
            if (row.className === 'hunk-separator') {
              return (
                <tr key={row.key} className="hunk-separator">
                  <td colSpan={4}>···</td>
                </tr>
              );
            }
            return (
              <tr key={row.key} className={row.className} data-diff-line={row.origIndex}>
                <td className={`diff-line-num ${row.className}`}>
                  {row.oldNum ?? ''}
                </td>
                <td className={`diff-line-num ${row.className}`}>
                  {row.newNum ?? ''}
                </td>
                <td className={`diff-prefix ${row.className}`}>
                  {row.prefix}
                </td>
                <td className={`${contentClass} ${row.className}`}>
                  {row.content}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default UnifiedView;
