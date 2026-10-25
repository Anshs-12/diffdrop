import { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { MAX_SPLIT_ROWS, calculate, parseInput, prefixForCount, split, summaryText, type Subnet } from '@/lib/subnet';
import { cn } from '@/lib/utils';
import { IconButton, OutputActions, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const inputClass =
  'h-9 min-w-0 rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const SPLIT_MODES = ['prefix', 'count'] as const;
type SplitMode = (typeof SPLIT_MODES)[number];

function Row({ label, value, suffix, mono = true, copy = true }: { label: string; value: string; suffix?: string; mono?: boolean; copy?: boolean }) {
  return (
    <div className="flex min-h-11 items-center gap-3 px-4 py-2">
      <dt className="w-28 shrink-0 text-[13px] text-muted-foreground sm:w-32">{label}</dt>
      <dd className={cn('min-w-0 flex-1 text-[14px] break-words', mono && 'font-mono')} data-field={label}>
        {value}
        {suffix && <span className="text-muted-foreground"> {suffix}</span>}
      </dd>
      {copy && value !== '–' && (
        <IconButton label={`Copy ${label.toLowerCase()}`} onClick={() => copyText(value)}>
          <Copy />
        </IconButton>
      )}
    </div>
  );
}

function SplitTable({ ip, s, mode, value }: { ip: number; s: Subnet; mode: SplitMode; value: string }) {
  const result = useMemo(() => {
    const n = Number(value);
    if (!value.trim() || !Number.isFinite(n)) return { ok: false as const, error: mode === 'prefix' ? 'Enter a prefix length.' : 'Enter how many subnets you need.' };
    const p = mode === 'prefix' ? { ok: true as const, value: n } : prefixForCount(s.prefix, n);
    if (!p.ok) return p;
    const r = split(ip, s.prefix, p.value);
    return r.ok ? { ok: true as const, prefix: p.value, ...r.value } : r;
  }, [ip, s, mode, value]);

  if (!result.ok) return <StatusLine tone="muted">{result.error}</StatusLine>;
  const text = ['Subnet\tFirst host\tLast host\tBroadcast\tUsable', ...result.rows.map((r) => [r.cidr, r.firstHost, r.lastHost, r.broadcast, r.usable].join('\t'))].join('\n') + '\n';
  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 border-b px-4 py-2 font-mono text-[12.5px] text-muted-foreground" aria-live="polite">
        <span>
          {result.count.toLocaleString('en-US')} × /{result.prefix}, {(2 ** (32 - result.prefix)).toLocaleString('en-US')} addresses each
          {result.count > MAX_SPLIT_ROWS && ` (showing the first ${MAX_SPLIT_ROWS})`}
        </span>
        <span className="ml-auto flex">
          <OutputActions text={text} fileName="subnets.tsv" mime="text/tab-separated-values" />
        </span>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[560px] font-mono text-[13px]" aria-label="Subnets">
          <thead className="sticky top-0 bg-background text-left text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-normal">Subnet</th>
              <th className="px-2 py-2 font-normal">First host</th>
              <th className="px-2 py-2 font-normal">Last host</th>
              <th className="px-2 py-2 font-normal">Broadcast</th>
              <th className="px-4 py-2 text-right font-normal">Usable</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((r) => (
              <tr key={r.cidr} className="border-b last:border-b-0">
                <td className="px-4 py-1.5">{r.cidr}</td>
                <td className="px-2 py-1.5">{r.firstHost}</td>
                <td className="px-2 py-1.5">{r.lastHost}</td>
                <td className="px-2 py-1.5">{r.broadcast}</td>
                <td className="px-4 py-1.5 text-right tabular-nums">{r.usable.toLocaleString('en-US')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SubnetTool() {
  const [input, setInput] = useSaved('input', '192.168.1.10/24');
  const [mask, setMask] = useSaved('mask', '');
  const [splitMode, setSplitMode] = useSaved<SplitMode>('splitMode', 'prefix', (v) => SPLIT_MODES.includes(v as SplitMode));
  const [splitValue, setSplitValue] = useSaved('split', '');

  const parsed = useMemo(() => parseInput(input, mask), [input, mask]);
  const s = parsed.ok ? calculate(parsed.value.ip, parsed.value.prefix) : null;
  const rangeTone = s?.range.kind === 'private' ? 'text-add' : s?.range.kind === 'special' ? 'text-amber-700 dark:text-amber-400' : '';

  return (
    <>
      <ToolBar
        onExample={() => {
          setInput('172.20.37.9/20');
          setMask('');
          setSplitMode('count');
          setSplitValue('4');
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="IPv4 address or CIDR"
          spellCheck={false}
          autoComplete="off"
          placeholder="192.168.1.10/24"
          className={cn(inputClass, 'flex-[1_1_220px]')}
        />
        <input
          value={mask}
          onChange={(e) => setMask(e.target.value)}
          aria-label="Subnet mask (optional)"
          spellCheck={false}
          autoComplete="off"
          placeholder="mask, e.g. 255.255.255.0 (optional)"
          className={cn(inputClass, 'flex-[1_1_220px]')}
        />
      </ToolBar>
      {!parsed.ok && <StatusLine tone="error">{parsed.error}</StatusLine>}
      {s && (
        <>
          <StatusLine tone="muted" action={<span className="ml-auto flex"><OutputActions text={summaryText(s)} fileName="subnet.txt" mime="text/plain" /></span>}>
            {s.cidr} · IPv4 only
          </StatusLine>
          <div className="grid md:grid-cols-2">
            <dl className="divide-y border-b md:border-r" aria-label="Subnet">
              <Row label="Network" value={s.network} />
              <Row label="Broadcast" value={s.broadcast} />
              <Row label="First host" value={s.firstHost} />
              <Row label="Last host" value={s.lastHost} />
              <Row label="Total addresses" value={s.total.toLocaleString('en-US')} />
              <Row label="Usable hosts" value={s.usable.toLocaleString('en-US')} />
            </dl>
            <dl className="divide-y border-b" aria-label="Masks and range">
              <Row label="Subnet mask" value={s.mask} suffix={`/${s.prefix}`} />
              <Row label="Wildcard mask" value={s.wildcard} />
              <Row label="CIDR" value={s.cidr} />
              <Row label="Class (historic)" value={s.addressClass} copy={false} />
              <div className="flex min-h-11 items-start gap-3 px-4 py-2">
                <dt className="w-28 shrink-0 pt-0.5 text-[13px] text-muted-foreground sm:w-32">Range</dt>
                <dd className="min-w-0 flex-1" data-field="Range">
                  <span className={cn('text-[14px] font-medium', rangeTone)}>{s.range.label}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">{s.range.note}</span>
                </dd>
              </div>
            </dl>
          </div>
          {s.hostNote && <StatusLine tone="muted">{s.hostNote}</StatusLine>}
          <div className="overflow-x-auto border-b px-4 py-3">
            <p className="mb-2 font-mono text-[11.5px] text-faint">binary</p>
            <table className="font-mono text-[12.5px]" aria-label="Binary">
              <tbody>
                {(
                  [
                    ['Address', s.binary.ip],
                    ['Mask', s.binary.mask],
                    ['Network', s.binary.network],
                    ['Broadcast', s.binary.broadcast],
                  ] as const
                ).map(([label, bits]) => (
                  <tr key={label}>
                    <th scope="row" className="pr-4 text-left font-normal text-muted-foreground">
                      {label}
                    </th>
                    <td className="whitespace-nowrap">
                      {/* network bits in full color, host bits faint */}
                      {[...bits].map((ch, i) => {
                        const bit = i - Math.floor(i / 9);
                        return ch === '.' ? (
                          <span key={i} className="text-faint">.</span>
                        ) : (
                          <span key={i} className={bit >= s.prefix ? 'text-faint' : undefined}>
                            {ch}
                          </span>
                        );
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5">
            <span className="text-[13px] text-muted-foreground">Split into</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Split by">
              {SPLIT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={splitMode === m}
                  onClick={() => setSplitMode(m)}
                  className={cn(
                    'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                    splitMode === m ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m === 'prefix' ? 'new prefix' : 'number of subnets'}
                </button>
              ))}
            </div>
            <input
              value={splitValue}
              onChange={(e) => setSplitValue(e.target.value.replace(/^\//, ''))}
              aria-label={splitMode === 'prefix' ? 'New prefix length' : 'Number of subnets'}
              inputMode="numeric"
              placeholder={splitMode === 'prefix' ? String(Math.min(32, s.prefix + 2)) : '4'}
              className={cn(inputClass, 'h-8 w-24')}
            />
          </div>
          {splitValue.trim() ? <SplitTable ip={parsed.ok ? parsed.value.ip : 0} s={s} mode={splitMode} value={splitValue} /> : <StatusLine tone="muted">Enter a longer prefix or a number of subnets to list the smaller networks.</StatusLine>}
        </>
      )}
    </>
  );
}
