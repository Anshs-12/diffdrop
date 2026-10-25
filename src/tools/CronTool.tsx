import { useEffect, useMemo, useState } from 'react';
import { Copy } from 'lucide-react';
import { CRON_PRESETS, FIELD_LABELS, FIVE_FIELDS, explainCron, nextRuns, parseCron, splitFields, type FieldName } from '@/lib/cron';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const COUNTS = [5, 10, 20];
const HINTS: Record<FieldName, string> = {
  second: '0–59',
  minute: '0–59',
  hour: '0–23',
  dayOfMonth: '1–31',
  month: '1–12 or JAN–DEC',
  dayOfWeek: '0–7 or SUN–SAT',
};

const timeFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const timeFormatSec = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export default function CronTool() {
  const [expr, setExpr] = useSaved('expr', '0 9 * * 1-5');
  const [count, setCount] = useSaved('count', 10, (v) => COUNTS.includes(v as number));
  // The clock moves on: refresh the next runs every 30 seconds (in the browser only)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const parsed = useMemo(() => parseCron(expr), [expr]);
  const explanation = parsed.ok ? explainCron(parsed.schedule) : '';
  const runs = useMemo(() => (parsed.ok && now ? nextRuns(parsed.schedule, now, count) : []), [parsed, now, count]);
  const tz = useMemo(() => (now ? Intl.DateTimeFormat().resolvedOptions().timeZone : ''), [now]);

  const fields = splitFields(expr);
  const names: FieldName[] = fields?.length === 6 ? ['second', ...FIVE_FIELDS] : FIVE_FIELDS;
  const editField = (i: number, value: string) => {
    const next = [...(fields ?? ['*', '*', '*', '*', '*'])];
    next[i] = value.replace(/\s+/g, '') || '*';
    setExpr(next.join(' '));
  };
  const fmt = parsed.ok && parsed.schedule.hasSeconds ? timeFormatSec : timeFormat;

  return (
    <>
      <ToolBar onExample={() => setExpr('*/15 9-17 * * MON-FRI')} />
      <div className="flex flex-wrap gap-1.5 border-b px-3 py-2.5" role="group" aria-label="Presets">
        {CRON_PRESETS.map((p) => (
          <button
            key={p.expression}
            type="button"
            onClick={() => setExpr(p.expression)}
            aria-pressed={expr.trim() === p.expression}
            className={cn(
              'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
              expr.trim() === p.expression ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="border-b p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Input
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            aria-label="Cron expression"
            aria-invalid={!parsed.ok}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            placeholder="0 9 * * 1-5"
            className="h-11 font-mono text-[17px] md:text-[17px]"
          />
          <IconButton label="Copy expression" onClick={() => copyText(expr.trim(), 'Expression copied')} disabled={!expr.trim()}>
            <Copy />
          </IconButton>
        </div>
        <p className="mt-3 text-[15px] font-medium" aria-live="polite" aria-label="Explanation">
          {parsed.ok ? explanation : <span className="text-faint">—</span>}
        </p>
      </div>
      {!parsed.ok && (
        <StatusLine tone="error" label="Cron status">
          {parsed.message}
        </StatusLine>
      )}
      <div className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-6">
        {names.map((name, i) => (
          <div key={name} className="flex min-w-0 flex-col gap-1 bg-card px-3 py-2.5">
            <label htmlFor={`cron-${name}`} className="font-mono text-[11.5px] text-muted-foreground">
              {FIELD_LABELS[name].toLowerCase()}
            </label>
            <Input
              id={`cron-${name}`}
              value={fields?.[i] ?? ''}
              onChange={(e) => editField(i, e.target.value)}
              disabled={!fields}
              spellCheck={false}
              autoCapitalize="off"
              aria-invalid={!parsed.ok && parsed.field === name}
              className={cn('h-8 font-mono text-[13px]', !parsed.ok && parsed.field === name && 'border-del')}
            />
            <span className="font-mono text-[11px] text-faint">{HINTS[name]}</span>
          </div>
        ))}
        {names.length === 5 && (
          <div className="bg-card px-3 py-2.5 font-mono text-[11px] leading-5 text-faint">
            <span className="block">* any value</span>
            <span className="block">, list · - range</span>
            <span className="block">/ step</span>
          </div>
        )}
      </div>
      <div className="flex h-11 items-center gap-2 border-b px-3">
        <span className="font-mono text-[12.5px] text-muted-foreground">next runs</span>
        {tz && <span className="font-mono text-[11.5px] text-faint">{tz}</span>}
        <div className="ml-auto flex items-center gap-1" role="radiogroup" aria-label="How many runs">
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={count === n}
              onClick={() => setCount(n)}
              className={cn('h-7 rounded-md px-2 font-mono text-[12px]', count === n ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              {n}
            </button>
          ))}
          <IconButton label="Copy run times" onClick={() => copyText(runs.map((d) => fmt.format(d)).join('\n'), 'Run times copied')} disabled={!runs.length}>
            <Copy />
          </IconButton>
        </div>
      </div>
      {parsed.ok && now && !runs.length ? (
        <StatusLine tone="warn">This schedule never runs: no date in the next eight years matches it (for example 31 February).</StatusLine>
      ) : (
        <ol className="divide-y font-mono text-[13px]" aria-label="Next runs">
          {runs.map((d, i) => (
            <li key={d.getTime()} className="flex gap-3 px-3 py-2">
              <span className="w-6 text-right text-faint tabular-nums">{i + 1}</span>
              <time dateTime={d.toISOString()} className="tabular-nums">
                {fmt.format(d)}
              </time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
