import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { DiffLine } from '@/lib/diffProcessor';
import { foldCount, isFold, unifiedLine, unifiedPart } from '@/lib/rows';
import { tokenizeLine, type Lang, type Token } from '@/lib/syntax';
import { LineContent } from './DiffSpans';

/** Everything a row needs to render itself. */
export interface RowContext {
  lines: DiffLine[];
  lineWrap: boolean;
  /** Syntax language and block-comment start states per side (null = no syntax colors). */
  syntax: { left: Lang | null; right: Lang | null; leftStates: Uint8Array | null; rightStates: Uint8Array | null };
  /** Lower-cased find text, '' when not searching. */
  find: string;
  /** Diff line index of the current find match, -1 when none. */
  currentMatch: number;
  onMergeLeftToRight?: (index: number) => void;
  onMergeRightToLeft?: (index: number) => void;
  /** Number of the last line on each side when it has no final newline (null when it has one). */
  noEol?: { left: number | null; right: number | null };
}

/** Like git: marks a changed last line that has no newline after it. */
function NoEol({ ctx, line, side }: { ctx: RowContext; line: DiffLine; side: 'left' | 'right' }) {
  const num = side === 'left' ? line.leftNum : line.rightNum;
  if (line.type === 'unchanged' || num == null || num !== ctx.noEol?.[side]) return null;
  return <span className="no-eol">\ No newline at end of file</span>;
}

/** Fixed row height (px) when lines don't wrap; must match `.diff-table td` in index.css. */
export const ROW_HEIGHT = 21;

function tokensFor(ctx: RowContext, side: 'left' | 'right', lineNum: number | null, text: string): Token[] | null {
  if (lineNum == null) return null;
  const lang = side === 'left' ? ctx.syntax.left : ctx.syntax.right;
  if (!lang || lang === 'none') return null;
  const states = side === 'left' ? ctx.syntax.leftStates : ctx.syntax.rightStates;
  const state = states ? (states[lineNum - 1] as 0 | 1) : 0;
  return tokenizeLine(text, lang, state).tokens;
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

/** Attached to each rendered <tr> when rows are measured (line wrap on). */
type TrRef = ((el: HTMLTableRowElement | null) => void) | undefined;

function FoldRow({ count, colSpan, rowIndex, trRef }: { count: number; colSpan: number; rowIndex: number; trRef: TrRef }) {
  return (
    <tr ref={trRef} className="fold-row" data-row={rowIndex} data-index={rowIndex}>
      <td colSpan={colSpan}>
        <span>
          {count.toLocaleString()} unchanged {count === 1 ? 'line' : 'lines'}
        </span>
      </td>
    </tr>
  );
}

function rowClass(ctx: RowContext, index: number): string | undefined {
  return ctx.currentMatch === index ? 'is-current-match' : undefined;
}

/** One row of the side-by-side table. */
export function SplitRow({ value, rowIndex, ctx, trRef }: { value: number; rowIndex: number; ctx: RowContext; trRef?: TrRef }) {
  if (isFold(value)) return <FoldRow count={foldCount(value)} colSpan={5} rowIndex={rowIndex} trRef={trRef} />;

  const index = value;
  const line = ctx.lines[index]!;
  const [left, right] = sideClasses(line);
  const canMerge = line.type !== 'unchanged' && ctx.onMergeLeftToRight && ctx.onMergeRightToLeft;

  return (
    <tr ref={trRef} data-row={rowIndex} data-index={rowIndex} data-diff-line={index} className={rowClass(ctx, index)}>
      <td className={`num ${left}`}>{line.leftNum ?? ''}</td>
      <td className={`code ${left}`}>
        {line.leftContent != null && (
          <LineContent
            text={line.leftContent}
            spans={line.leftSpans}
            tokens={tokensFor(ctx, 'left', line.leftNum, line.leftContent)}
            find={ctx.find}
          />
        )}
        <NoEol ctx={ctx} line={line} side="left" />
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
                onClick={() => ctx.onMergeLeftToRight!(index)}
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
                onClick={() => ctx.onMergeRightToLeft!(index)}
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
            tokens={tokensFor(ctx, 'right', line.rightNum, line.rightContent)}
            find={ctx.find}
          />
        )}
        <NoEol ctx={ctx} line={line} side="right" />
      </td>
    </tr>
  );
}

/** One row of the unified table. */
export function UnifiedRow({ value, rowIndex, ctx, trRef }: { value: number; rowIndex: number; ctx: RowContext; trRef?: TrRef }) {
  if (isFold(value)) return <FoldRow count={foldCount(value)} colSpan={4} rowIndex={rowIndex} trRef={trRef} />;

  const index = unifiedLine(value);
  const line = ctx.lines[index]!;
  const added = unifiedPart(value) === 1;
  const unchanged = line.type === 'unchanged';
  const cls = unchanged ? '' : added ? 'is-add' : 'is-del';
  const text = (added ? line.rightContent : line.leftContent)!;
  const num = added ? line.rightNum : line.leftNum;

  return (
    <tr ref={trRef} data-row={rowIndex} data-index={rowIndex} data-diff-line={index} className={rowClass(ctx, index)}>
      <td className={`num ${cls}`}>{added ? '' : line.leftNum ?? ''}</td>
      <td className={`num ${cls}`}>{added || unchanged ? line.rightNum ?? '' : ''}</td>
      <td className={`prefix ${cls}`}>{unchanged ? '' : added ? '+' : '−'}</td>
      <td className={`code ${cls}`}>
        <LineContent
          text={text}
          spans={unchanged ? null : added ? line.rightSpans : line.leftSpans}
          tokens={tokensFor(ctx, added ? 'right' : 'left', num, text)}
          find={ctx.find}
        />
        <NoEol ctx={ctx} line={line} side={added ? 'right' : 'left'} />
      </td>
    </tr>
  );
}

export function SplitColgroup() {
  return (
    <colgroup>
      <col className="col-num" />
      <col className="col-content" />
      <col className="col-gutter" />
      <col className="col-num" />
      <col className="col-content" />
    </colgroup>
  );
}

export function UnifiedColgroup() {
  return (
    <colgroup>
      <col className="col-num" />
      <col className="col-num" />
      <col className="col-prefix" />
      <col className="col-content" />
    </colgroup>
  );
}

/** Width hint so both halves of the split table stay equal when lines are long. */
export function splitWidthStyle(lineWrap: boolean, maxColumns: number): React.CSSProperties | undefined {
  // Each half: line number (48px) + code padding (26px) + the longest line
  return lineWrap ? undefined : ({ '--split-min': `calc(2 * (74px + ${maxColumns}ch) + 44px)` } as React.CSSProperties);
}

/**
 * The whole split table, every row rendered. Only used for printing; on screen
 * the virtualized DiffViewport renders just the visible rows.
 */
export function FullSplitTable({
  rows,
  ctx,
  header,
}: {
  rows: Int32Array;
  ctx: RowContext;
  header?: React.ReactNode;
}) {
  const body: React.ReactNode[] = [];
  for (let r = 0; r < rows.length; r++) body.push(<SplitRow key={r} value={rows[r]!} rowIndex={r} ctx={ctx} />);
  return (
    <table className="diff-table split is-wrapped">
      <SplitColgroup />
      {header && (
        <thead>
          <tr>
            <th colSpan={5} className="print-head">
              {header}
            </th>
          </tr>
        </thead>
      )}
      <tbody>{body}</tbody>
    </table>
  );
}
