import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { RowModel } from '@/lib/rows';
import {
  ROW_HEIGHT,
  SplitColgroup,
  SplitRow,
  UnifiedColgroup,
  UnifiedRow,
  splitWidthStyle,
  type RowContext,
} from './DiffRows';

export interface DiffViewportHandle {
  /** Scroll so the given diff line is in view (centered) and flash it. */
  scrollToLine: (lineIndex: number) => void;
}

interface DiffViewportProps {
  mode: 'split' | 'unified';
  model: RowModel;
  ctx: RowContext;
  maxColumns: number;
  pending: boolean;
}

/** Rows rendered beyond the visible area, so fast scrolling doesn't show blanks. */
const OVERSCAN = 24;

/**
 * The diff table, virtualized: only the rows in (and just around) the visible
 * area exist in the DOM, whatever the size of the diff. With line wrapping on,
 * rows are measured as they render; otherwise every row is ROW_HEIGHT tall.
 */
const DiffViewport = forwardRef<DiffViewportHandle, DiffViewportProps>(({ mode, model, ctx, maxColumns, pending }, ref) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { rows, rowOfLine } = model;
  const split = mode === 'split';
  const colSpan = split ? 5 : 4;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
    paddingStart: 6,
    paddingEnd: 6,
  });

  // Sizes measured with wrapping on are wrong for another mode or another diff
  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, ctx.lineWrap, mode, rows]);

  useImperativeHandle(ref, () => ({
    scrollToLine(lineIndex: number) {
      const row = rowOfLine[lineIndex] ?? -1;
      const container = scrollRef.current;
      if (row < 0 || !container) return;
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      virtualizer.scrollToIndex(row, { align: 'center' });
      // Flash the row once it has been rendered at its new position
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const el = container.querySelector<HTMLElement>(`[data-row="${row}"]`);
          if (!el) return;
          el.classList.remove('is-focused');
          void el.offsetWidth; // restart the animation
          el.classList.add('is-focused');
        }),
      );
    },
  }));

  const items = virtualizer.getVirtualItems();
  const top = items.length ? items[0]!.start : 0;
  const bottom = items.length ? virtualizer.getTotalSize() - items[items.length - 1]!.end : 0;
  const measure = ctx.lineWrap ? virtualizer.measureElement : undefined;

  return (
    <div ref={scrollRef} className={`diff-scroll${pending ? ' is-pending' : ''}`}>
      <table
        className={`diff-table ${mode}${ctx.lineWrap ? ' is-wrapped' : ''}`}
        style={split ? splitWidthStyle(ctx.lineWrap, maxColumns) : undefined}
      >
        {split ? <SplitColgroup /> : <UnifiedColgroup />}
        <tbody>
          {top > 0 && (
            <tr className="spacer-row" aria-hidden="true" style={{ height: top }}>
              <td colSpan={colSpan} />
            </tr>
          )}
          {items.map((item) =>
            split ? (
              <SplitRow key={item.key} value={rows[item.index]!} rowIndex={item.index} ctx={ctx} trRef={measure} />
            ) : (
              <UnifiedRow key={item.key} value={rows[item.index]!} rowIndex={item.index} ctx={ctx} trRef={measure} />
            ),
          )}
          {bottom > 0 && (
            <tr className="spacer-row" aria-hidden="true" style={{ height: bottom }}>
              <td colSpan={colSpan} />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default DiffViewport;
