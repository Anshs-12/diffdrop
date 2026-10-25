import { useDeferredValue, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { LIMIT_PRESETS, checkLimit, statsSummary } from '@/lib/counter';
import { formatMinutes, textStats } from '@/lib/textCase';
import { cn } from '@/lib/utils';
import CodeEditor from './CodeEditor';
import { IconButton, InputActions, Panel, copyText } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE = `Writing is easier when you can see your progress. This counter updates as you type, so you always know how close you are to a word limit.

It also counts characters with and without spaces, sentences and paragraphs, and estimates how long the text takes to read aloud or silently. The top words list helps you spot words you repeat too often.`;

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-background p-3">
      <dt className="text-[12.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono text-[20px] font-semibold tabular-nums" data-stat={label}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </dd>
    </div>
  );
}

export default function WordCounterTool() {
  const [text, setText] = useSaved('text', '');
  // 0 means no limit
  const [limit, setLimit] = useSaved('limit', 0, (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1_000_000);
  // Counting a long document can wait a frame; typing can't
  const deferred = useDeferredValue(text);
  const s = useMemo(() => textStats(deferred), [deferred]);
  const check = checkLimit(s.characters, limit);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Character limit">
          <span className="font-mono text-[12.5px] text-muted-foreground">limit</span>
          {[{ limit: 0, label: 'None' }, ...LIMIT_PRESETS].map((p) => (
            <button
              key={p.limit}
              type="button"
              aria-pressed={limit === p.limit}
              onClick={() => setLimit(p.limit)}
              className={cn(
                'h-8 rounded-md border px-2.5 font-mono text-[12.5px] transition-colors',
                limit === p.limit ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={limit || ''}
            onChange={(e) => {
              const v = Math.floor(Number(e.target.value));
              setLimit(Number.isFinite(v) && v > 0 ? Math.min(v, 1_000_000) : 0);
            }}
            placeholder="Custom"
            aria-label="Custom character limit"
            className="h-8 w-24 rounded-md border bg-background px-2 font-mono text-[12.5px]"
          />
        </div>
      </ToolBar>
      <div className="tool-panes tool-panes-counter">
        <Panel title="text" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.md,.csv,.html" />}>
          <CodeEditor value={text} onChange={setText} lang={null} wrap placeholder="Type or paste your text" ariaLabel="Text to count" className="tool-editor" />
        </Panel>
        <div className="counter-stats flex min-w-0 flex-col gap-4 overflow-auto p-4" aria-label="Counts">
          <div className="-mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-[11.5px] text-faint">counts</p>
            <IconButton label="Copy stats" onClick={() => copyText(statsSummary(s), 'Stats copied')} disabled={!deferred}>
              <Copy />
            </IconButton>
          </div>
          {check && (
            <div className="space-y-1.5" aria-label="Character limit check">
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className={cn('font-mono tabular-nums', check.over ? 'text-del' : 'text-foreground')} data-limit-status>
                  {check.over ? `${(-check.left).toLocaleString()} over the limit` : `${check.left.toLocaleString()} left`}
                </span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {check.used.toLocaleString()} / {check.limit.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className={cn('h-full rounded-full', check.over ? 'bg-del' : 'bg-add-strong')} style={{ width: `${Math.min(100, (check.used / check.limit) * 100)}%` }} />
              </div>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-2">
            <Stat label="Words" value={s.words} />
            <Stat label="Characters" value={s.characters} />
            <Stat label="Without spaces" value={s.charactersNoSpaces} />
            <Stat label="Sentences" value={s.sentences} />
            <Stat label="Paragraphs" value={s.paragraphs} />
            <Stat label="Lines" value={s.lines} />
            <Stat label="Reading time" value={formatMinutes(s.readingMinutes)} />
            <Stat label="Speaking time" value={formatMinutes(s.speakingMinutes)} />
          </dl>
          <dl className="space-y-1 text-[13.5px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Average word length</dt>
              <dd className="font-mono">{s.averageWordLength ? s.averageWordLength.toFixed(1) : '0'} letters</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Longest word</dt>
              <dd className="truncate font-mono">{s.longestWord || '–'}</dd>
            </div>
          </dl>
          {s.topWords.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[11.5px] text-faint">top words</p>
              <ol className="space-y-1 text-[13.5px]" aria-label="Top words">
                {s.topWords.map(([w, n]) => (
                  <li key={w} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono">{w}</span>
                    <span className="h-1.5 rounded-full bg-add-strong" style={{ width: `${(n / s.topWords[0]![1]) * 80}px` }} aria-hidden="true" />
                    <span className="w-8 text-right font-mono text-muted-foreground tabular-nums">{n}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
