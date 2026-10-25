/** Pixels to rem and back, for one value, a list, or the px/rem values inside CSS. */

export type PxRemDirection = 'px-rem' | 'rem-px';

export interface PxRemOptions {
  direction: PxRemDirection;
  /** Root font size in px (the browser default is 16). */
  base: number;
  /** Most decimal places to keep; null keeps full precision. Trailing zeros are dropped. */
  precision: number | null;
  /** In CSS, leave 1px (and -1px) alone: hairline borders usually should stay 1px. */
  keepOnePx: boolean;
}

export const DEFAULT_PX_REM: PxRemOptions = { direction: 'px-rem', base: 16, precision: 4, keepOnePx: false };

export const isValidBase = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 1000;

/** A number written without exponent, rounded to `precision` decimals, with no trailing zeros and no "-0". */
export function formatNumber(n: number, precision: number | null): string {
  let v = precision == null ? n : Number(n.toFixed(precision));
  if (Object.is(v, -0)) v = 0;
  if (Math.abs(v) >= 1e21 || (v !== 0 && Math.abs(v) < 1e-6)) {
    // Keep it readable instead of 1e-7; toFixed(20) is the most JS allows
    return v.toFixed(20).replace(/\.?0+$/, '');
  }
  return String(v);
}

export const pxToRem = (px: number, base: number) => px / base;
export const remToPx = (rem: number, base: number) => rem * base;

const NUM = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)`;
const SINGLE = new RegExp(String.raw`^\s*(${NUM})\s*(px|rem)?\s*;?\s*$`, 'i');

export type SingleResult = { ok: true; value: string; from: string } | { ok: false; error: string } | { ok: null };

/** Converts one value like "24", "24px" or "1.5rem". A unit that doesn't match the direction is an error. */
export function convertValue(input: string, o: PxRemOptions): SingleResult {
  if (!input.trim()) return { ok: null };
  if (!isValidBase(o.base)) return { ok: false, error: 'The root font size must be a number above 0' };
  const m = SINGLE.exec(input);
  if (!m) return { ok: false, error: `“${input.trim().slice(0, 40)}” isn’t a number like 24 or 24px` };
  const n = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  const fromUnit = o.direction === 'px-rem' ? 'px' : 'rem';
  if (unit && unit !== fromUnit) return { ok: false, error: `That’s already in ${unit}; switch the direction to convert it` };
  const out = o.direction === 'px-rem' ? pxToRem(n, o.base) : remToPx(n, o.base);
  const toUnit = o.direction === 'px-rem' ? 'rem' : 'px';
  return { ok: true, value: `${formatNumber(out, o.precision)}${toUnit}`, from: `${formatNumber(n, null)}${fromUnit}` };
}

/**
 * Batch conversion. A line that is just a number (with or without the unit)
 * is converted on its own; anything else is treated as CSS and only the
 * px (or rem) values in it change. Strings, comments and url(...) are left alone.
 */
export function convertText(text: string, o: PxRemOptions): { output: string; count: number; error?: string } {
  if (!text) return { output: '', count: 0 };
  if (!isValidBase(o.base)) return { output: '', count: 0, error: 'The root font size must be a number above 0' };
  const from = o.direction === 'px-rem' ? 'px' : 'rem';
  const to = o.direction === 'px-rem' ? 'rem' : 'px';
  const conv = (n: number) => formatNumber(o.direction === 'px-rem' ? pxToRem(n, o.base) : remToPx(n, o.base), o.precision);
  let count = 0;
  const bare = new RegExp(String.raw`^(\s*)(${NUM})(\s*)(?:(px|rem)\s*)?$`, 'i');
  // Skipped spans first (each alternative always matches, so this stays linear), then a number with the unit
  const css = new RegExp(
    String.raw`("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|\/\*[\s\S]*?(?:\*\/|$)|url\([^)]*\)?)|(?<![\w.-])(-?(?:\d+\.?\d*|\.\d+))${from}(?![\w-])`,
    'gi',
  );
  const lines = text.split(/\r?\n/).map((line) => {
    const b = bare.exec(line);
    if (b && (!b[4] || b[4].toLowerCase() === from)) {
      count++;
      return `${b[1]}${conv(Number(b[2]))}${to}`;
    }
    return line;
  });
  // Lines that aren't bare numbers are CSS; run them together so comments can span lines
  const joined = lines.join('\n');
  // Bare-number lines are already in the other unit, so they never match here
  const output = joined.replace(css, (all, skip: string | undefined, num: string | undefined) => {
    if (skip !== undefined || num === undefined) return all;
    const n = Number(num);
    if (o.keepOnePx && from === 'px' && Math.abs(n) === 1) return all;
    count++;
    return `${conv(n)}${to}`;
  });
  return { output, count };
}

/** Pixel sizes for the reference table. */
export const REFERENCE_PX = [12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48];
