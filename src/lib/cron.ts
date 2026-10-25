/**
 * Cron expressions: parse (5 fields, or 6 with seconds first), explain in
 * English, and list the next run times in local time.
 */

export type FieldName = 'second' | 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';

interface FieldSpec {
  name: FieldName;
  label: string;
  min: number;
  max: number;
  names?: string[];
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SPECS: Record<FieldName, FieldSpec> = {
  second: { name: 'second', label: 'Second', min: 0, max: 59 },
  minute: { name: 'minute', label: 'Minute', min: 0, max: 59 },
  hour: { name: 'hour', label: 'Hour', min: 0, max: 23 },
  dayOfMonth: { name: 'dayOfMonth', label: 'Day of month', min: 1, max: 31 },
  month: { name: 'month', label: 'Month', min: 1, max: 12, names: MONTHS },
  // 7 is accepted as Sunday and folded to 0
  dayOfWeek: {
    name: 'dayOfWeek',
    label: 'Day of week',
    min: 0,
    max: 7,
    names: DAYS,
  },
};

export const FIVE_FIELDS: FieldName[] = ['minute', 'hour', 'dayOfMonth', 'month', 'dayOfWeek'];
export const FIELD_LABELS: Record<FieldName, string> = Object.fromEntries(Object.values(SPECS).map((s) => [s.name, s.label])) as Record<FieldName, string>;

export const MACROS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
};

/** One comma-separated part of a field: a value, a range, or either with a step. */
export interface CronPart {
  start: number;
  end: number;
  step: number;
  /** Written as * or *&#47;n (covers the whole range). */
  all: boolean;
  /** Written as a single value, no range or step. */
  single: boolean;
}

export interface CronField {
  name: FieldName;
  source: string;
  parts: CronPart[];
  values: number[];
  /** The field starts with * or ?: for the day fields that means "not restricted". */
  star: boolean;
}

export interface CronSchedule {
  /** The 5- or 6-field form actually parsed (macros expanded). */
  expression: string;
  hasSeconds: boolean;
  fields: Record<FieldName, CronField>;
}

export type CronParse = { ok: true; schedule: CronSchedule } | { ok: false; message: string; field?: FieldName };

class FieldError extends Error {}

function parseValue(raw: string, spec: FieldSpec): number {
  const up = raw.toUpperCase();
  if (spec.names) {
    const i = spec.names.indexOf(up);
    if (i >= 0) return spec.name === 'month' ? i + 1 : i;
    if (/^[A-Z]+$/.test(up)) {
      const valid = spec.name === 'month' ? 'JAN–DEC' : 'SUN–SAT';
      throw new FieldError(`“${raw}” isn’t a ${spec.name === 'month' ? 'month' : 'day'} name (use ${valid} or numbers)`);
    }
  }
  if (!/^\d+$/.test(raw)) {
    if (/^[Ll]$|[LW#]/i.test(raw)) throw new FieldError(`“${raw}”: L, W and # aren’t standard cron and aren’t supported`);
    throw new FieldError(`“${raw}” isn’t a number`);
  }
  const n = Number(raw);
  if (n < spec.min || n > spec.max) {
    throw new FieldError(`${n} is out of range (${spec.min}–${spec.name === 'dayOfWeek' ? '7, where 0 and 7 are Sunday' : spec.max})`);
  }
  return n;
}

function parseField(source: string, spec: FieldSpec): CronField {
  const parts: CronPart[] = [];
  const set = new Set<number>();
  for (const item of source.split(',')) {
    if (!item) throw new FieldError('has an empty item (check for a stray comma)');
    const [rangeText, stepText, extra] = item.split('/');
    if (extra !== undefined) throw new FieldError(`“${item}” has more than one /`);
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/.test(stepText) || Number(stepText) === 0) throw new FieldError(`“${item}”: the step after / must be a whole number of 1 or more`);
      step = Number(stepText);
    }
    let start: number;
    let end: number;
    let all = false;
    if (rangeText === '*' || rangeText === '?') {
      if (rangeText === '?' && spec.name !== 'dayOfMonth' && spec.name !== 'dayOfWeek') throw new FieldError('? is only allowed in the day fields');
      start = spec.min;
      end = spec.name === 'dayOfWeek' ? 6 : spec.max;
      all = true;
    } else if (rangeText!.includes('-')) {
      const [a, b, more] = rangeText!.split('-');
      if (more !== undefined || !a || !b) throw new FieldError(`“${rangeText}” isn’t a valid range (write it like 1-5)`);
      start = parseValue(a, spec);
      end = parseValue(b, spec);
      if (spec.name === 'dayOfWeek' && end === 0 && start > 0) end = 7; // FRI-SUN
      if (start > end)
        throw new FieldError(
          `the range ${rangeText} goes backwards; write it as two ranges, like ${a}-${spec.name === 'dayOfWeek' ? 'SAT' : spec.max},${spec.name === 'dayOfWeek' ? 'SUN' : spec.min}-${b}`,
        );
    } else {
      start = parseValue(rangeText!, spec);
      // "5/15" means from 5 to the end, every 15
      end = stepText !== undefined ? (spec.name === 'dayOfWeek' ? 6 : spec.max) : start;
    }
    for (let v = start; v <= end; v += step) set.add(spec.name === 'dayOfWeek' && v === 7 ? 0 : v);
    parts.push({
      start,
      end,
      step,
      all,
      single: start === end && stepText === undefined && !all,
    });
  }
  const values = [...set].sort((x, y) => x - y);
  return {
    name: spec.name,
    source,
    parts,
    values,
    star: source.startsWith('*') || source.startsWith('?'),
  };
}

export function parseCron(input: string): CronParse {
  const text = input.trim().replace(/\s+/g, ' ');
  if (!text) return { ok: false, message: 'Type a cron expression, like 0 9 * * 1-5' };
  let expr = text;
  if (text.startsWith('@')) {
    const macro = MACROS[text.toLowerCase()];
    if (text.toLowerCase() === '@reboot')
      return {
        ok: false,
        message: '@reboot runs once when the machine starts, so it has no schedule to show',
      };
    if (!macro)
      return {
        ok: false,
        message: `Unknown shortcut ${text}. Use @yearly, @annually, @monthly, @weekly, @daily, @midnight or @hourly`,
      };
    expr = macro;
  }
  const tokens = expr.split(' ');
  if (tokens.length !== 5 && tokens.length !== 6) {
    const hint = tokens.length === 7 ? ' (7 fields with a year is Quartz syntax, which isn’t supported)' : '';
    return {
      ok: false,
      message: `A cron expression has 5 fields (minute hour day month weekday), or 6 with seconds first; this has ${tokens.length}${hint}`,
    };
  }
  const hasSeconds = tokens.length === 6;
  const names: FieldName[] = hasSeconds ? ['second', ...FIVE_FIELDS] : FIVE_FIELDS;
  const fields = {} as Record<FieldName, CronField>;
  if (!hasSeconds) fields.second = parseField('0', SPECS.second);
  for (let i = 0; i < names.length; i++) {
    const name = names[i]!;
    try {
      fields[name] = parseField(tokens[i]!, SPECS[name]);
    } catch (e) {
      if (e instanceof FieldError)
        return {
          ok: false,
          message: `${SPECS[name].label} field (“${tokens[i]}”): ${e.message}`,
          field: name,
        };
      throw e;
    }
  }
  return { ok: true, schedule: { expression: expr, hasSeconds, fields } };
}

// ---------- next runs ----------

function dayMatches(s: CronSchedule, d: Date): boolean {
  const f = s.fields;
  if (!f.month.values.includes(d.getMonth() + 1)) return false;
  const dom = f.dayOfMonth.values.includes(d.getDate());
  const dow = f.dayOfWeek.values.includes(d.getDay());
  // The classic cron rule: if both day fields are restricted, either one is enough
  if (!f.dayOfMonth.star && !f.dayOfWeek.star) return dom || dow;
  return dom && dow;
}

/**
 * The next `count` run times strictly after `after`, computed in the local
 * time zone with Date. Times skipped by a DST change are left out; a time
 * that happens twice when clocks go back runs once (the first).
 */
export function nextRuns(s: CronSchedule, after: Date, count: number, maxDays = 366 * 8 + 2): Date[] {
  const out: Date[] = [];
  const f = s.fields;
  const y = after.getFullYear();
  const m = after.getMonth();
  const d0 = after.getDate();
  for (let i = 0; i < maxDays && out.length < count; i++) {
    const day = new Date(y, m, d0 + i, 12);
    if (!dayMatches(s, day)) continue;
    const yy = day.getFullYear();
    const mm = day.getMonth();
    const dd = day.getDate();
    for (const h of f.hour.values) {
      for (const min of f.minute.values) {
        // Quick skip for whole minutes already past
        const probe = new Date(yy, mm, dd, h, min, 59, 999);
        if (probe <= after) continue;
        for (const sec of f.second.values) {
          const t = new Date(yy, mm, dd, h, min, sec);
          // In a spring-forward gap Date moves the time; that time doesn't exist, so skip it
          if (t.getHours() !== h || t.getMinutes() !== min || t.getDate() !== dd) continue;
          if (t <= after) continue;
          out.push(t);
          if (out.length >= count) return out;
        }
      }
    }
  }
  return out;
}

// ---------- English ----------

const pad = (n: number) => String(n).padStart(2, '0');

function listJoin(items: string[], word = 'and'): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ${word} ${items[items.length - 1]}`;
}

const plural = (n: number, unit: string) => (n === 1 ? unit : `${unit}s`);

function isAll(f: CronField): boolean {
  return f.parts.length === 1 && f.parts[0]!.all && f.parts[0]!.step === 1;
}

function isSingles(f: CronField): boolean {
  return f.parts.every((p) => p.single);
}

/** One comma part in words: "5", "every 5 minutes", "every minute from 0 through 30". */
function describePart(p: CronPart, unit: string, show: (n: number) => string): string {
  if (p.single) return show(p.start);
  const every = p.step === 1 ? `every ${unit}` : `every ${p.step} ${plural(p.step, unit)}`;
  if (p.all) return every;
  return `${every} from ${show(p.start)} through ${show(p.end)}`;
}

/** Seconds or minutes in words; `of` is what singles are counted against ("past the hour"). */
function describeCounter(f: CronField, unit: string, of: string): string {
  if (isSingles(f)) return `at ${plural(f.values.length, unit)} ${listJoin(f.values.map(String))} ${of}`;
  return listJoin(f.parts.map((p) => (p.single ? `${unit} ${p.start}` : describePart(p, unit, String))));
}

function describeTime(s: CronSchedule): string {
  const { second, minute, hour } = s.fields;
  const secFixed = isSingles(second) && second.values.length === 1;
  const sec = secFixed && second.values[0] !== 0 ? second.values[0]! : null;
  // Fixed times of day: "At 09:00 and 17:30"
  if (secFixed && isSingles(minute) && isSingles(hour) && minute.values.length * hour.values.length <= 6) {
    const times: string[] = [];
    for (const h of hour.values) for (const m of minute.values) times.push(`${pad(h)}:${pad(m)}${sec != null ? `:${pad(sec)}` : ''}`);
    return `at ${listJoin(times)}`;
  }
  const parts: string[] = [];
  if (s.hasSeconds && !(secFixed && second.values[0] === 0)) parts.push(isAll(second) ? 'every second' : describeCounter(second, 'second', 'past the minute'));
  if (!isAll(minute)) parts.push(describeCounter(minute, 'minute', 'past the hour'));
  else if (!parts.length) parts.push('every minute');
  if (!isAll(hour)) {
    const time = (v: number) => `${pad(v)}:00`;
    const p = hour.parts;
    if (isSingles(hour)) parts.push(`during the ${listJoin(hour.values.map(time))} ${plural(hour.values.length, 'hour')}`);
    else if (p.length === 1 && p[0]!.step === 1) parts.push(`between ${pad(p[0]!.start)}:00 and ${pad(p[0]!.end)}:59`);
    else parts.push(listJoin(p.map((x) => (x.single ? `during the ${time(x.start)} hour` : describePart(x, 'hour', time)))));
  }
  return parts.join(', ');
}

function describeDays(s: CronSchedule): string[] {
  const { dayOfMonth: dom, month, dayOfWeek: dow } = s.fields;
  const out: string[] = [];
  let domText = '';
  let dowText = '';
  if (!isAll(dom)) {
    domText = isSingles(dom)
      ? `on ${plural(dom.values.length, 'day')} ${listJoin(dom.values.map(String))} of the month`
      : listJoin(dom.parts.map((p) => (p.single ? `on day ${p.start}` : describePart(p, 'day', String)))) + ' of the month';
  }
  if (!isAll(dow)) {
    const name = (v: number) => DAY_NAMES[v % 7]!;
    const p = dow.parts;
    if (p.length === 1 && !p[0]!.single && p[0]!.step === 1 && !p[0]!.all) dowText = `${name(p[0]!.start)} through ${name(p[0]!.end)}`;
    else if (p.every((x) => x.single || x.step > 1)) dowText = `on ${listJoin(dow.values.map(name))}`;
    else dowText = `on ${listJoin(p.map((x) => (x.single ? name(x.start) : `${name(x.start)} through ${name(x.end)}`)))}`;
  }
  // The classic cron rule: both day fields restricted means either one matches
  if (domText && dowText && !dom.star && !dow.star) out.push(`${domText}, or ${dowText.startsWith('on ') ? dowText : `on ${dowText}`}`);
  else out.push(...[domText, dowText].filter(Boolean));
  if (!isAll(month)) {
    const mname = (v: number) => MONTH_NAMES[v - 1]!;
    const p = month.parts;
    if (p.length === 1 && !p[0]!.single && !p[0]!.all && p[0]!.step === 1) out.push(`${mname(p[0]!.start)} through ${mname(p[0]!.end)}`);
    else out.push(`in ${listJoin(month.values.map(mname))}`);
  }
  return out;
}

/** A plain-English reading, e.g. "At 09:00, Monday through Friday". */
export function explainCron(s: CronSchedule): string {
  const text = [describeTime(s), ...describeDays(s)].filter(Boolean).join(', ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Ready-made schedules for the builder. */
export const CRON_PRESETS: { label: string; expression: string }[] = [
  { label: 'Every minute', expression: '* * * * *' },
  { label: 'Every 5 minutes', expression: '*/5 * * * *' },
  { label: 'Every 15 minutes', expression: '*/15 * * * *' },
  { label: 'Hourly', expression: '0 * * * *' },
  { label: 'Daily at 09:00', expression: '0 9 * * *' },
  { label: 'Weekdays at 09:00', expression: '0 9 * * 1-5' },
  { label: 'Weekly (Sunday)', expression: '0 0 * * 0' },
  { label: 'Monthly (1st)', expression: '0 0 1 * *' },
  { label: 'Yearly (1 Jan)', expression: '0 0 1 1 *' },
];

/** Split an expression into its five (or six) fields for editing; macros expanded. */
export function splitFields(input: string): string[] | null {
  const t = input.trim().replace(/\s+/g, ' ');
  const expr = t.startsWith('@') ? MACROS[t.toLowerCase()] : t;
  if (!expr) return null;
  const tokens = expr.split(' ');
  return tokens.length === 5 || tokens.length === 6 ? tokens : null;
}
