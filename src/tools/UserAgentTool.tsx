import { useEffect, useMemo, useState } from 'react';
import { parseUserAgent, readClientHints, type ClientHints, type NameVersion, type UaResult } from '@/lib/userAgent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OutputActions, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const SAMPLES: { label: string; ua: string }[] = [
  { label: 'iPhone Safari', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1' },
  { label: 'Android Chrome', ua: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36' },
  { label: 'Samsung Internet', ua: 'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36' },
  { label: 'Edge on Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.2849.68' },
  { label: 'Safari on Mac', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15' },
  { label: 'Firefox on Linux', ua: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0' },
  { label: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
];

const DEVICE_LABEL: Record<UaResult['device'], string> = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet', bot: 'Bot', unknown: 'Unknown' };

const show = (nv: NameVersion | null) => (nv ? `${nv.name}${nv.version ? ` ${nv.version}` : ''}` : 'Unknown');

function Field({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0 border-b px-4 py-3 sm:[&:nth-child(odd)]:border-r">
      <p className="font-mono text-[11.5px] text-faint">{label}</p>
      <p className={cn('mt-1 text-[16px] font-semibold break-words', value === 'Unknown' && 'font-normal text-faint')} aria-label={label}>
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function UserAgentTool() {
  // Empty means "this browser"; the visitor's own string isn't saved or put in share links
  const [ua, setUa] = useSaved('ua', '', (v) => typeof v === 'string' && v.length <= 4000);
  const [own, setOwn] = useState<{ ua: string; touch: number; hints: ClientHints | null } | null>(null);
  useEffect(() => {
    setOwn({ ua: navigator.userAgent, touch: navigator.maxTouchPoints ?? 0, hints: readClientHints(navigator) });
  }, []);

  const isOwn = !ua;
  const current = isOwn ? (own?.ua ?? '') : ua;
  const result = useMemo(() => parseUserAgent(current, isOwn ? { maxTouchPoints: own?.touch } : {}), [current, isOwn, own?.touch]);
  const json = useMemo(
    () =>
      current
        ? JSON.stringify(
            {
              userAgent: current,
              browser: result.browser,
              engine: result.engine,
              os: result.os,
              device: result.device,
              model: result.model,
              bot: result.bot,
              ...(isOwn && own?.hints ? { userAgentData: own.hints } : {}),
            },
            null,
            2,
          )
        : '',
    [current, result, isOwn, own?.hints],
  );

  return (
    <>
      <ToolBar
        onExample={() => setUa(SAMPLES[0]!.ua)}
        extra={
          <Button variant="outline" size="sm" onClick={() => setUa('')} disabled={isOwn}>
            Use my browser
          </Button>
        }
      />
      <section className="border-b p-4" aria-label="User agent string">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <label htmlFor="ua-input" className="text-[13px] text-muted-foreground">
            {isOwn ? 'Your browser’s user agent' : 'User agent string'}
          </label>
          <div className="ml-auto flex items-center gap-0.5">
            <OutputActions text={json} fileName="user-agent.json" mime="application/json" />
          </div>
        </div>
        <textarea
          id="ua-input"
          value={current}
          onChange={(e) => setUa(e.target.value.replace(/[\r\n]+/g, ' '))}
          rows={3}
          spellCheck={false}
          placeholder="Paste a user agent string"
          className="w-full resize-y rounded-lg border bg-background px-3 py-2 font-mono text-[13px] break-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Sample user agents">
          {SAMPLES.map((s) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={ua === s.ua}
              onClick={() => setUa(s.ua)}
              className={cn(
                'h-7 rounded-md border px-2 text-[12.5px] transition-colors',
                ua === s.ua ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {!current ? (
        <StatusLine tone="muted">Paste a user agent string, or pick a sample.</StatusLine>
      ) : (
        <>
          <div className="grid sm:grid-cols-2" aria-label="Parsed user agent" role="group">
            <Field label="Browser" value={show(result.browser)} />
            <Field label="Engine" value={show(result.engine)} />
            <Field label="Operating system" value={show(result.os)} />
            <Field label="Device type" value={DEVICE_LABEL[result.device]} sub={result.bot ? result.bot : result.model ? `model: ${result.model}` : undefined} />
          </div>
          {result.notes.map((n) => (
            <StatusLine key={n} tone="warn" label="Caveat">
              {n}
            </StatusLine>
          ))}
        </>
      )}

      {isOwn && own && (
        <section className="border-b px-4 py-3" aria-label="Client hints">
          <h2 className="font-mono text-[12.5px] text-muted-foreground">navigator.userAgentData</h2>
          {own.hints ? (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
              <dt className="text-muted-foreground">Brands</dt>
              <dd className="font-mono break-words">{own.hints.brands.map((b) => `${b.brand} ${b.version}`).join(', ') || 'none'}</dd>
              <dt className="text-muted-foreground">Platform</dt>
              <dd className="font-mono">{own.hints.platform || 'not given'}</dd>
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-mono">{own.hints.mobile ? 'yes' : 'no'}</dd>
            </dl>
          ) : (
            <p className="mt-1 text-[13px] text-faint">Not available here. Only Chromium-based browsers (Chrome, Edge, Opera, Samsung Internet) have it, and only on secure pages.</p>
          )}
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            These are the low-entropy client hints a page can read without asking. Exact versions and the device model need a separate request, which this page doesn’t make.
          </p>
        </section>
      )}

      <StatusLine tone="muted" label="Note">
        User agent strings are easy to change or fake, and modern Chrome freezes most of its details. Use them as a hint, and prefer feature detection in code.
      </StatusLine>
    </>
  );
}
