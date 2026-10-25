/** Integer conversion between bases 2–36 with BigInt, so any size stays exact. */

export type ParseResult = { ok: true; value: bigint } | { ok: false; message: string } | { ok: 'empty' };

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const PREFIXES: Record<string, number> = { '0x': 16, '0b': 2, '0o': 8 };
const BASE_NAMES: Record<number, string> = {
  2: 'binary',
  8: 'octal',
  10: 'decimal',
  16: 'hex',
};

export const baseName = (base: number) => BASE_NAMES[base] ?? `base ${base}`;

/**
 * Reads an integer written in `base`. Allows a leading + or -, a matching
 * 0x/0b/0o prefix, and underscores, spaces or commas (decimal only) between digits.
 */
export function parseInBase(input: string, base: number): ParseResult {
  let s = input.trim();
  if (!s) return { ok: 'empty' };
  if (!Number.isInteger(base) || base < 2 || base > 36)
    return {
      ok: false,
      message: 'The base must be a whole number from 2 to 36',
    };
  let negative = false;
  if (s[0] === '-' || s[0] === '+') {
    negative = s[0] === '-';
    s = s.slice(1).trimStart();
  }
  const prefix = s.slice(0, 2).toLowerCase();
  if (prefix in PREFIXES && s.length > 2) {
    // In bases where b, o or x aren't digits, 0x / 0b / 0o is a prefix
    const pb = PREFIXES[prefix]!;
    const isDigit = DIGITS.indexOf(prefix[1]!) < base;
    if (!isDigit) {
      if (pb !== base)
        return {
          ok: false,
          message: `The ${prefix} prefix means ${baseName(pb)}, but this field is ${baseName(base)}`,
        };
      s = s.slice(2);
    }
  }
  const separators = base === 10 ? /[_\s,]/g : /[_\s]/g;
  if (/^[_\s,]|[_\s,]$/.test(s)) return { ok: false, message: 'A separator can only go between digits' };
  const digits = s.replace(separators, '').toLowerCase();
  if (!digits) return { ok: false, message: 'No digits' };
  for (let i = 0; i < digits.length; i++) {
    const ch = digits[i]!;
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) {
      const pos = input.trim().length - s.length + digitPosition(s, i, separators);
      if (ch === '.')
        return {
          ok: false,
          message: 'Only whole numbers can be converted (no decimal point)',
        };
      const what = d < 0 ? `“${ch}” isn’t a digit` : `“${ch}” isn’t a ${baseName(base)} digit${base <= 10 ? ` (only 0–${base - 1})` : ` (only 0–9 and a–${DIGITS[base - 1]})`}`;
      return { ok: false, message: `${what}, at character ${pos + 1}` };
    }
  }
  const value = toBigInt(digits, base);
  return { ok: true, value: negative ? -value : value };
}

/** Position in the original (separator-containing) text of the i-th digit. */
function digitPosition(original: string, i: number, separators: RegExp): number {
  let count = -1;
  const sep = new RegExp(separators.source);
  for (let p = 0; p < original.length; p++) {
    if (sep.test(original[p]!)) continue;
    if (++count === i) return p;
  }
  return i;
}

const NATIVE: Record<number, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };

/** Validated digits to a BigInt: natively for 2/8/10/16, otherwise by splitting in halves (fast for long inputs). */
function toBigInt(digits: string, base: number): bigint {
  if (base in NATIVE) return BigInt(NATIVE[base] + digits);
  if (digits.length <= 8) return BigInt(parseInt(digits, base));
  const half = digits.length >> 1;
  const low = digits.length - half;
  return toBigInt(digits.slice(0, half), base) * BigInt(base) ** BigInt(low) + toBigInt(digits.slice(half), base);
}

/** Writes `value` in `base` (lowercase letters); `group` puts a space every n digits from the right. */
export function formatInBase(value: bigint, base: number, group = 0): string {
  const neg = value < 0n;
  let s = (neg ? -value : value).toString(base);
  if (group > 0) s = groupDigits(s, group);
  return neg ? `-${s}` : s;
}

export function groupDigits(s: string, n: number): string {
  const first = s.length % n || n;
  const parts = [s.slice(0, first)];
  for (let i = first; i < s.length; i += n) parts.push(s.slice(i, i + n));
  return parts.join(' ');
}

/** Number of bits needed for the magnitude. */
export function bitLength(value: bigint): number {
  const v = value < 0n ? -value : value;
  return v === 0n ? 0 : v.toString(2).length;
}
