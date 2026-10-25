import { useEffect, useMemo, useState } from 'react';
import { Copy, Link } from 'lucide-react';
import { CLASSES, STATUS_CODES, UNOFFICIAL_CODES, codeLine, filterCodes, type StatusCode } from '@/lib/httpStatus';
import { cn } from '@/lib/utils';
import { IconButton, StatusLine, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const FILTERS = ['all', ...CLASSES.map((c) => c.id)];
const CLASS_TONE: Record<string, string> = {
  '1': 'text-muted-foreground',
  '2': 'text-add',
  '3': 'text-sky-700 dark:text-sky-400',
  '4': 'text-amber-700 dark:text-amber-400',
  '5': 'text-del',
};

function CodeCard({ c, target }: { c: StatusCode; target: boolean }) {
  const id = String(c.code);
  return (
    <article id={id} className={cn('border-b px-4 py-3.5 transition-colors', target && 'bg-muted')} aria-label={codeLine(c)}>
      <div className="flex items-start gap-3">
        <a href={`#${id}`} className={cn('font-mono text-[20px] leading-7 font-semibold tabular-nums hover:underline', CLASS_TONE[id[0]!])}>
          {c.code}
        </a>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] leading-7 font-medium">
            {c.name}
            {c.note && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 align-middle text-[11.5px] font-normal text-muted-foreground">{c.note}</span>}
          </h3>
          <p className="text-[13.5px] leading-relaxed">{c.meaning}</p>
          {c.use && (
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">When to use: </span>
              {c.use}
            </p>
          )}
          <p className="mt-1.5 flex flex-wrap gap-x-3 font-mono text-[11.5px] text-faint">
            {c.spec && <span>{c.spec}</span>}
            {c.unofficial && <span>unofficial · {c.unofficial}</span>}
            {c.cacheable && <span>cacheable by default</span>}
          </p>
        </div>
        <div className="flex shrink-0">
          <IconButton label={`Copy link to ${c.code}`} onClick={() => copyText(`${window.location.origin}${window.location.pathname}#${id}`, 'Link copied')}>
            <Link />
          </IconButton>
          <IconButton label={`Copy ${codeLine(c)}`} onClick={() => copyText(codeLine(c))}>
            <Copy />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

export default function HttpStatusTool() {
  const [query, setQuery] = useSaved('query', '');
  const [cls, setCls] = useSaved('class', 'all', (v) => FILTERS.includes(v as string));
  const [target, setTarget] = useState<string | null>(null);

  // A link like #404: show that code (whatever the filters) and scroll to it
  useEffect(() => {
    const go = () => {
      const h = window.location.hash.slice(1);
      if (!/^\d{3}$/.test(h)) return;
      setQuery('');
      setCls('all');
      setTarget(h);
      // Again once the rest of the page has laid out, so the code isn't pushed away
      const scroll = () => document.getElementById(h)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      requestAnimationFrame(scroll);
      setTimeout(scroll, 300);
    };
    go();
    window.addEventListener('hashchange', go);
    return () => window.removeEventListener('hashchange', go);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const standard = useMemo(() => filterCodes(STATUS_CODES, cls, query), [cls, query]);
  const unofficial = useMemo(() => filterCodes(UNOFFICIAL_CODES, cls, query), [cls, query]);
  const groups = CLASSES.map((c) => ({ ...c, codes: standard.filter((s) => String(s.code)[0] === c.id) })).filter((g) => g.codes.length);
  const total = standard.length + unofficial.length;

  return (
    <>
      <ToolBar
        onExample={() => {
          setCls('all');
          setQuery('redirect');
        }}
      >
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search status codes"
          placeholder="Search: 404, 5xx, redirect, rate limit…"
          spellCheck={false}
          autoComplete="off"
          className="h-9 min-w-0 flex-[1_1_240px] rounded-lg border bg-background px-3 text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </ToolBar>
      <div className="flex flex-wrap gap-1.5 border-b px-3 py-2.5" role="radiogroup" aria-label="Class">
        {FILTERS.map((f) => {
          const c = CLASSES.find((x) => x.id === f);
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={cls === f}
              onClick={() => setCls(f)}
              className={cn(
                'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                cls === f ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {c ? `${c.label} ${c.summary.toLowerCase()}` : 'all'}
            </button>
          );
        })}
      </div>
      <StatusLine tone={total ? 'muted' : 'warn'} label="Results">
        {total ? `${total} ${total === 1 ? 'code' : 'codes'}` : `No status code matches “${query.trim()}”.`}
      </StatusLine>
      <div aria-label="Status codes">
        {groups.map((g) => (
          <section key={g.id} aria-label={`${g.label} ${g.summary}`}>
            <h2 className="border-b bg-muted/50 px-4 py-2 font-mono text-[12.5px] text-muted-foreground">
              {g.label} · {g.summary}
            </h2>
            {g.codes.map((c) => (
              <CodeCard key={c.code} c={c} target={target === String(c.code)} />
            ))}
          </section>
        ))}
        {unofficial.length > 0 && (
          <section aria-label="Unofficial codes">
            <h2 className="border-b bg-muted/50 px-4 py-2 font-mono text-[12.5px] text-muted-foreground">
              Unofficial · sent or logged by specific products, not in the IANA registry
            </h2>
            {unofficial.map((c) => (
              <CodeCard key={c.code} c={c} target={target === String(c.code)} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
