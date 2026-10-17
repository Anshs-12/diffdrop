/** Unix timestamps and dates, both ways. */

export type TimeUnit = 's' | 'ms' | 'us' | 'ns';

export const UNIT_NAMES: Record<TimeUnit, string> = {
  s: 'seconds',
  ms: 'milliseconds',
  us: 'microseconds',
  ns: 'nanoseconds',
};

const PER_SECOND: Record<TimeUnit, number> = { s: 1, ms: 1e3, us: 1e6, ns: 1e9 };

/**
 * The unit a timestamp is most likely in, from its size: seconds up to the
 * year 5138, then milliseconds, microseconds and nanoseconds.
 */
export function guessUnit(value: number): TimeUnit {
  const a = Math.abs(value);
  if (a < 1e11) return 's';
  if (a < 1e14) return 'ms';
  if (a < 1e17) return 'us';
  return 'ns';
}

export type ParsedTime =
  | { ok: true; ms: number; unit: TimeUnit | null; kind: 'timestamp' | 'date' }
  | { ok: false; message: string };

/** Largest time a JS Date can hold (±8.64e15 ms, about 275,000 years). */
const MAX_MS = 8.64e15;

/**
 * Read what someone typed: a Unix timestamp (unit guessed unless given) or a
 * date in a format browsers understand (ISO 8601, RFC 2822, "2026-10-17 14:30").
 */
export function parseTime(input: string, unit: TimeUnit | 'auto' = 'auto'): ParsedTime {
  const text = input.trim();
  if (!text) return { ok: false, message: 'Enter a timestamp or a date' };
  if (/^[-+]?\d+(\.\d+)?$/.test(text)) {
    const value = Number(text);
    const u = unit === 'auto' ? guessUnit(value) : unit;
    const ms = (value / PER_SECOND[u]) * 1000;
    if (Math.abs(ms) > MAX_MS) return { ok: false, message: 'That timestamp is outside the range a date can hold' };
    return { ok: true, ms, unit: u, kind: 'timestamp' };
  }
  // "2026-10-17 14:30" (space instead of T) isn't ISO; browsers disagree on it, so normalize
  const iso = text.replace(/^(\d{4}-\d{2}-\d{2})[ ](\d)/, '$1T$2');
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return { ok: false, message: "That isn't a timestamp or a date format browsers understand" };
  return { ok: true, ms, unit: null, kind: 'date' };
}

/** The same moment as a timestamp in each unit (integers; seconds may keep a fraction). */
export function toUnits(ms: number): Record<TimeUnit, string> {
  const big = BigInt(Math.round(ms * 1000)); // microseconds, exact for any real date
  const seconds = ms / 1000;
  return {
    s: Number.isInteger(seconds) ? String(seconds) : String(Math.floor(seconds)),
    ms: String(Math.round(ms)),
    us: big.toString(),
    ns: (big * 1000n).toString(),
  };
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');

/** ISO 8601 with the given UTC offset in minutes (0 → Z). */
export function isoWithOffset(ms: number, offsetMinutes: number): string {
  const d = new Date(ms + offsetMinutes * 60_000);
  const frac = d.getUTCMilliseconds() ? `.${pad(d.getUTCMilliseconds(), 3)}` : '';
  const base =
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${frac}`;
  if (offsetMinutes === 0) return `${base}Z`;
  const sign = offsetMinutes > 0 ? '+' : '-';
  return `${base}${sign}${pad(Math.trunc(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
}

/** The UTC offset (minutes) of a time zone at a moment. */
export function zoneOffset(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** RFC 2822 / HTTP date in UTC: "Sat, 17 Oct 2026 14:30:00 GMT". */
export function rfc2822(ms: number): string {
  return new Date(ms).toUTCString();
}

/** "3 hours ago", "in 2 days". */
export function relative(ms: number, now: number): string {
  const diff = (ms - now) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const steps: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [86400 * 7, 'day'],
    [86400 * 30.4375, 'week'],
    // From about 11 months, a year reads better ("last year", not "12 months ago")
    [86400 * 335, 'month'],
    [Infinity, 'year'],
  ];
  const sizes: Record<string, number> = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2629800, year: 31557600 };
  for (const [limit, unit] of steps) {
    if (abs < limit) return rtf.format(Math.round(diff / sizes[unit]!), unit);
  }
  return '';
}

/** A readable date in a time zone: "Saturday, 17 October 2026 at 14:30:00 GMT+2". */
export function longDate(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(ms));
}

/** ISO week number and day of the year (UTC). */
export function calendarInfo(ms: number): { week: number; dayOfYear: number; leapYear: boolean } {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const dayOfYear = Math.floor((Date.UTC(year, d.getUTCMonth(), d.getUTCDate()) - start) / 86400000) + 1;
  // ISO week: the week with the year's first Thursday is week 1
  const t = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const week = Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return { week, dayOfYear, leapYear };
}
