import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, RotateCcw } from 'lucide-react';
import {
  UNIT_NAMES,
  calendarInfo,
  isoWithOffset,
  longDate,
  parseTime,
  relative,
  rfc2822,
  toUnits,
  zoneOffset,
  type TimeUnit,
} from '@/lib/timestamp';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { IconButton, StatusLine } from './shared';
import ToolBar from './ToolBar';

const UTC = 'UTC';

function localZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || UTC;
  } catch {
    return UTC;
  }
}

/** Every time zone the browser knows, local first. */
function zones(local: string): string[] {
  let all: string[] = [];
  try {
    all = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    // Older browsers: just local and UTC
  }
  return [...new Set([local, UTC, ...all])];
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied');
  } catch {
    toast.error('Clipboard unavailable');
  }
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-2.5 last:border-b-0">
      <span className="w-40 shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 font-mono text-[13.5px] break-all" data-label={label}>
        {value}
        {hint && <span className="ml-2 text-[12px] text-faint">{hint}</span>}
      </span>
      <IconButton label={`Copy ${label}`} onClick={() => copy(value)}>
        <Copy />
      </IconButton>
    </div>
  );
}

const UNITS: (TimeUnit | 'auto')[] = ['auto', 's', 'ms', 'us', 'ns'];
const UNIT_LABELS: Record<TimeUnit | 'auto', string> = { auto: 'Auto', s: 's', ms: 'ms', us: 'µs', ns: 'ns' };

export default function TimestampTool() {
  const [input, setInput] = useState('');
  const [unit, setUnit] = useState<TimeUnit | 'auto'>('auto');
  // Rendered at build time too, so the clock and zone only start in the browser
  const [now, setNow] = useState<number | null>(null);
  const [local, setLocal] = useState(UTC);
  const [zone, setZone] = useState(UTC);

  useEffect(() => {
    const z = localZone();
    setLocal(z);
    setZone(z);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const zoneList = useMemo(() => zones(local), [local]);
  const parsed = useMemo(() => (input.trim() ? parseTime(input, unit) : null), [input, unit]);
  const nowSeconds = now == null ? '…' : String(Math.floor(now / 1000));

  const result = parsed?.ok ? parsed : null;
  const units = result ? toUnits(result.ms) : null;
  const offset = result ? zoneOffset(result.ms, zone) : 0;
  const cal = result ? calendarInfo(result.ms + offset * 60_000) : null;

  return (
    <>
      <ToolBar onExample={() => (setUnit('auto'), setInput('1760700000'))}>
        <div className="flex items-center gap-2 font-mono text-[13px]">
          <span className="text-muted-foreground">now</span>
          <span className="tabular-nums" aria-label="Current Unix time">
            {nowSeconds}
          </span>
          <IconButton label="Copy current Unix time" onClick={() => now != null && copy(String(Math.floor(now / 1000)))}>
            <Copy />
          </IconButton>
        </div>
        <Button variant="ghost" size="sm" onClick={() => now != null && (setUnit('auto'), setInput(String(Math.floor(now / 1000))))}>
          <RotateCcw /> Use now
        </Button>
      </ToolBar>

      <div className="flex flex-wrap items-center gap-3 border-b px-3 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="1760700000, 1760700000000 or 2026-10-17T12:00:00Z"
          aria-label="Timestamp or date"
          spellCheck={false}
          autoComplete="off"
          className="h-10 min-w-0 flex-[1_1_280px] rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <ToggleGroup type="single" variant="outline" size="sm" value={unit} onValueChange={(v) => v && setUnit(v as TimeUnit | 'auto')} aria-label="Timestamp unit">
          {UNITS.map((u) => (
            <ToggleGroupItem key={u} value={u} aria-label={u === 'auto' ? 'Detect unit' : UNIT_NAMES[u]}>
              {UNIT_LABELS[u]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          aria-label="Time zone"
          className="h-8 max-w-56 rounded-md border bg-background px-2 text-[13px]"
        >
          {zoneList.map((z) => (
            <option key={z} value={z}>
              {z === local && z !== UTC ? `${z} (local)` : z}
            </option>
          ))}
        </select>
      </div>

      {!parsed && <StatusLine tone="muted">Paste a Unix timestamp or a date, or use now.</StatusLine>}
      {parsed && !parsed.ok && <StatusLine tone="error">{parsed.message}</StatusLine>}
      {result && (
        <StatusLine tone="ok">
          {result.kind === 'timestamp' ? `Read as ${UNIT_NAMES[result.unit!]}` : 'Read as a date'}
          {now != null && ` · ${relative(result.ms, now)}`}
        </StatusLine>
      )}

      {result && units && cal && (
        <div className="grid lg:grid-cols-2" aria-label="Conversions">
          <div className="border-b lg:border-r lg:border-b-0">
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">date</p>
            <Row label={`In ${zone}`} value={longDate(result.ms, zone)} />
            <Row label="ISO 8601 (UTC)" value={isoWithOffset(result.ms, 0)} />
            {zone !== UTC && <Row label="ISO 8601 (zone)" value={isoWithOffset(result.ms, offset)} />}
            <Row label="RFC 2822 / HTTP" value={rfc2822(result.ms)} />
            <Row label="Relative" value={now == null ? '…' : relative(result.ms, now)} />
            <Row label="Calendar" value={`ISO week ${cal.week}, day ${cal.dayOfYear} of the year`} hint={cal.leapYear ? 'leap year' : undefined} />
          </div>
          <div>
            <p className="border-b px-4 py-2 font-mono text-[11.5px] text-faint">unix timestamp</p>
            <Row label="Seconds" value={units.s} />
            <Row label="Milliseconds" value={units.ms} />
            <Row label="Microseconds" value={units.us} />
            <Row label="Nanoseconds" value={units.ns} />
          </div>
        </div>
      )}
    </>
  );
}
