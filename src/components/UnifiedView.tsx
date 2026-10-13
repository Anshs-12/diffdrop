import React from 'react';
import type { VisibleRow } from '@/lib/rows';
import type { Token } from '@/lib/syntax';
import { GapRow, LineContent } from './DiffSpans';

interface UnifiedViewProps {
  rows: VisibleRow[];
  lineWrap: boolean;
  leftTokens: Token[][] | null;
  rightTokens: Token[][] | null;
}

interface UnifiedRow {
  key: string;
  index: number;
  oldNum: number | null;
  newNum: number | null;
  prefix: string;
  cls: string;
  content: React.ReactNode;
}

const UnifiedView: React.FC<UnifiedViewProps> = ({ rows, lineWrap, leftTokens, rightTokens }) => {
  const rendered: (UnifiedRow | { key: string; gap: number })[] = [];

  for (const row of rows) {
    if (row.kind === 'gap') {
      rendered.push({ key: row.key, gap: row.count });
      continue;
    }
    const { line, index } = row;
    const leftTok = line.leftNum != null ? leftTokens?.[line.leftNum - 1] : null;
    const rightTok = line.rightNum != null ? rightTokens?.[line.rightNum - 1] : null;

    if (line.type === 'unchanged') {
      rendered.push({
        key: `u${index}`,
        index,
        oldNum: line.leftNum,
        newNum: line.rightNum,
        prefix: '',
        cls: '',
        content: <LineContent text={line.leftContent!} tokens={leftTok} />,
      });
      continue;
    }
    // Modified lines show as a removal followed by an addition
    if (line.leftContent != null) {
      rendered.push({
        key: `d${index}`,
        index,
        oldNum: line.leftNum,
        newNum: null,
        prefix: '−',
        cls: 'is-del',
        content: <LineContent text={line.leftContent} spans={line.leftSpans} tokens={leftTok} />,
      });
    }
    if (line.rightContent != null) {
      rendered.push({
        key: `a${index}`,
        index,
        oldNum: null,
        newNum: line.rightNum,
        prefix: '+',
        cls: 'is-add',
        content: <LineContent text={line.rightContent} spans={line.rightSpans} tokens={rightTok} />,
      });
    }
  }

  return (
    <table className={`diff-table unified${lineWrap ? ' is-wrapped' : ''}`}>
      <colgroup>
        <col className="col-num" />
        <col className="col-num" />
        <col className="col-prefix" />
        <col className="col-content" />
      </colgroup>
      <tbody>
        {rendered.map((row) =>
          'gap' in row ? (
            <GapRow key={row.key} count={row.gap} colSpan={4} />
          ) : (
            <tr key={row.key} data-diff-line={row.index}>
              <td className={`num ${row.cls}`}>{row.oldNum ?? ''}</td>
              <td className={`num ${row.cls}`}>{row.newNum ?? ''}</td>
              <td className={`prefix ${row.cls}`}>{row.prefix}</td>
              <td className={`code ${row.cls}`}>{row.content}</td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  );
};

export default UnifiedView;
