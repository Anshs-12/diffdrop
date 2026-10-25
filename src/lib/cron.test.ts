import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { explainCron, nextRuns, parseCron, splitFields, type CronSchedule } from './cron';

// Next-run times are local; pin a zone with DST so the tests mean the same everywhere
let savedTz: string | undefined;
beforeAll(() => {
  savedTz = process.env.TZ;
  process.env.TZ = 'America/New_York';
});
afterAll(() => {
  process.env.TZ = savedTz;
});

function sched(expr: string): CronSchedule {
  const r = parseCron(expr);
  if (!r.ok) throw new Error(r.message);
  return r.schedule;
}
const explain = (e: string) => explainCron(sched(e));
const local = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
const runs = (e: string, after: Date, n = 5) => nextRuns(sched(e), after, n).map(local);

describe('parseCron', () => {
  it('parses values, lists, ranges, steps and names', () => {
    const f = sched('*/15 9-17 1,15 JAN-MAR mon-fri').fields;
    expect(f.minute.values).toEqual([0, 15, 30, 45]);
    expect(f.hour.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(f.dayOfMonth.values).toEqual([1, 15]);
    expect(f.month.values).toEqual([1, 2, 3]);
    expect(f.dayOfWeek.values).toEqual([1, 2, 3, 4, 5]);
    expect(sched('5/20 * * * *').fields.minute.values).toEqual([5, 25, 45]);
  });

  it('treats 7 as Sunday and allows FRI-SUN', () => {
    expect(sched('0 0 * * 7').fields.dayOfWeek.values).toEqual([0]);
    expect(sched('0 0 * * 5-7').fields.dayOfWeek.values).toEqual([0, 5, 6]);
    expect(sched('0 0 * * FRI-SUN').fields.dayOfWeek.values).toEqual([0, 5, 6]);
  });

  it('expands macros', () => {
    expect(sched('@daily').expression).toBe('0 0 * * *');
    expect(sched('@ANNUALLY').expression).toBe('0 0 1 1 *');
    expect(sched('@hourly').expression).toBe('0 * * * *');
    expect(sched('@weekly').expression).toBe('0 0 * * 0');
    expect(sched('@monthly').expression).toBe('0 0 1 * *');
  });

  it('supports 6 fields with seconds first', () => {
    const s = sched('*/10 * * * * *');
    expect(s.hasSeconds).toBe(true);
    expect(s.fields.second.values).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it('names the field and the reason in errors', () => {
    const err = (e: string) => {
      const r = parseCron(e);
      return r.ok ? 'ok' : r.message;
    };
    expect(err('')).toMatch(/Type a cron expression/);
    expect(err('60 * * * *')).toBe('Minute field (“60”): 60 is out of range (0–59)');
    expect(err('0 24 * * *')).toMatch(/^Hour field .* out of range \(0–23\)/);
    expect(err('0 0 0 * *')).toMatch(/^Day of month field .* out of range \(1–31\)/);
    expect(err('0 0 * 13 *')).toMatch(/^Month field/);
    expect(err('0 0 * * 8')).toMatch(/^Day of week field .*0 and 7 are Sunday/);
    expect(err('0 0 * FOO *')).toMatch(/isn’t a month name/);
    expect(err('*/0 * * * *')).toMatch(/step after \/ must be/);
    expect(err('0 17-9 * * *')).toMatch(/goes backwards/);
    expect(err('0 0 L * *')).toMatch(/L, W and # aren’t/);
    expect(err('1,,2 * * * *')).toMatch(/empty item/);
    expect(err('* * *')).toMatch(/has 5 fields .* this has 3/);
    expect(err('0 0 0 * * ? 2026')).toMatch(/Quartz/);
    expect(err('@reboot')).toMatch(/@reboot runs once/);
    expect(err('@often')).toMatch(/Unknown shortcut/);
    expect(err('0 0 ? * ?')).toBe('ok');
    expect(err('? * * * *')).toMatch(/only allowed in the day fields/);
    expect(err('😀 * * * *')).toMatch(/^Minute field .*isn’t a number/);
  });

  it('splits fields for editing', () => {
    expect(splitFields('@daily')).toEqual(['0', '0', '*', '*', '*']);
    expect(splitFields(' 1  2 3 4 5 ')).toEqual(['1', '2', '3', '4', '5']);
    expect(splitFields('1 2')).toBeNull();
  });
});

describe('explainCron', () => {
  const cases: [string, string][] = [
    ['* * * * *', 'Every minute'],
    ['*/5 * * * *', 'Every 5 minutes'],
    ['0 * * * *', 'At minute 0 past the hour'],
    ['0,30 * * * *', 'At minutes 0 and 30 past the hour'],
    ['0 9 * * 1-5', 'At 09:00, Monday through Friday'],
    ['30 17 * * *', 'At 17:30'],
    ['0 9,17 * * *', 'At 09:00 and 17:00'],
    ['*/10 9-17 * * *', 'Every 10 minutes, between 09:00 and 17:59'],
    ['0 */2 * * *', 'At minute 0 past the hour, every 2 hours'],
    ['0-30 * * * *', 'Every minute from 0 through 30'],
    ['0 0 1 * *', 'At 00:00, on day 1 of the month'],
    ['0 0 1,15 * *', 'At 00:00, on days 1 and 15 of the month'],
    ['0 0 1 1 *', 'At 00:00, on day 1 of the month, in January'],
    ['0 12 * JUN-AUG SAT,SUN', 'At 12:00, on Sunday and Saturday, June through August'],
    ['0 0 1 * 1', 'At 00:00, on day 1 of the month, or on Monday'],
    ['0 0 */2 * *', 'At 00:00, every 2 days of the month'],
    ['15 10 * * 0', 'At 10:15, on Sunday'],
    ['0 9 * * 7', 'At 09:00, on Sunday'],
    ['*/30 * * * * *', 'Every 30 seconds'],
    ['30 0 9 * * *', 'At 09:00:30'],
    ['@weekly', 'At 00:00, on Sunday'],
  ];
  for (const [expr, want] of cases) it(expr, () => expect(explain(expr)).toBe(want));
});

describe('nextRuns', () => {
  it('lists weekday mornings from a fixed date', () => {
    // Saturday 24 Oct 2026, 10:00 local
    expect(runs('0 9 * * 1-5', new Date(2026, 9, 24, 10))).toEqual([
      '2026-10-26 09:00:00',
      '2026-10-27 09:00:00',
      '2026-10-28 09:00:00',
      '2026-10-29 09:00:00',
      '2026-10-30 09:00:00',
    ]);
  });

  it('is strictly after the start time', () => {
    expect(runs('*/5 * * * *', new Date(2026, 0, 1, 12, 5, 0), 3)).toEqual(['2026-01-01 12:10:00', '2026-01-01 12:15:00', '2026-01-01 12:20:00']);
    expect(runs('*/5 * * * *', new Date(2026, 0, 1, 12, 4, 59, 999), 1)).toEqual(['2026-01-01 12:05:00']);
  });

  it('matches either day field when both are restricted', () => {
    // 1st of the month OR any Friday, from Wed 28 Oct 2026
    expect(runs('0 0 1 * FRI', new Date(2026, 9, 28), 4)).toEqual([
      '2026-10-30 00:00:00',
      '2026-11-01 00:00:00',
      '2026-11-06 00:00:00',
      '2026-11-13 00:00:00',
    ]);
    // With * in day of month, only the weekday counts
    expect(runs('0 0 * * FRI', new Date(2026, 9, 28), 2)).toEqual(['2026-10-30 00:00:00', '2026-11-06 00:00:00']);
  });

  it('finds 29 February', () => {
    expect(runs('0 0 29 2 *', new Date(2026, 0, 1), 2)).toEqual(['2028-02-29 00:00:00', '2032-02-29 00:00:00']);
  });

  it('returns nothing for a date that never comes', () => {
    expect(nextRuns(sched('0 0 31 2 *'), new Date(2026, 0, 1), 5)).toEqual([]);
  });

  it('handles seconds', () => {
    expect(runs('*/20 * * * * *', new Date(2026, 0, 1, 0, 0, 30), 3)).toEqual(['2026-01-01 00:00:40', '2026-01-01 00:01:00', '2026-01-01 00:01:20']);
  });

  it('skips a time that doesn’t exist when clocks go forward', () => {
    // New York: 8 Mar 2026, 02:00 jumps to 03:00
    expect(runs('30 2 * * *', new Date(2026, 2, 7, 12), 2)).toEqual(['2026-03-09 02:30:00', '2026-03-10 02:30:00']);
    const hourly = runs('0 * * * *', new Date(2026, 2, 8, 0, 30), 3);
    expect(hourly).toEqual(['2026-03-08 01:00:00', '2026-03-08 03:00:00', '2026-03-08 04:00:00']);
  });

  it('runs a repeated time once when clocks go back', () => {
    // New York: 1 Nov 2026, 02:00 goes back to 01:00
    const r = nextRuns(sched('30 1 * * *'), new Date(2026, 10, 1, 0), 2);
    expect(r.map(local)).toEqual(['2026-11-01 01:30:00', '2026-11-02 01:30:00']);
    // Daily 09:00 stays 09:00 local across the change
    expect(runs('0 9 * * *', new Date(2026, 9, 31, 10), 2)).toEqual(['2026-11-01 09:00:00', '2026-11-02 09:00:00']);
  });

  it('copes with many runs per day', () => {
    const r = nextRuns(sched('* * * * * *'), new Date(2026, 0, 1), 1000);
    expect(r).toHaveLength(1000);
    expect(r[999]!.getTime() - r[0]!.getTime()).toBe(999_000);
  });
});
