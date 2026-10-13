import type { DiffLine } from './diffProcessor';

const TAB_WIDTH = 4;

/** Approximate on-screen width of a line in monospace columns (tabs = 4, wide CJK/emoji = 2). */
export function columns(text: string): number {
  let n = 0;
  for (const ch of text) {
    if (ch === '\t') n += TAB_WIDTH - (n % TAB_WIDTH);
    else {
      const cp = ch.codePointAt(0)!;
      n += (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xff00 && cp <= 0xff60) || cp >= 0x1f300 ? 2 : 1;
    }
  }
  return n;
}

/** Widest line on either side of a diff, in monospace columns. */
export function maxColumns(lines: DiffLine[]): number {
  let max = 0;
  for (const l of lines) {
    if (l.leftContent) max = Math.max(max, columns(l.leftContent));
    if (l.rightContent) max = Math.max(max, columns(l.rightContent));
  }
  return max;
}
