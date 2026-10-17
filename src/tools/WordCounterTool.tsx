import { useDeferredValue, useMemo, useState } from 'react';
import { formatMinutes, textStats } from '@/lib/textCase';
import CodeEditor from './CodeEditor';
import { InputActions, Panel } from './shared';
import ToolBar from './ToolBar';

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
  const [text, setText] = useState('');
  // Counting a long document can wait a frame; typing can't
  const deferred = useDeferredValue(text);
  const s = useMemo(() => textStats(deferred), [deferred]);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)} />
      <div className="tool-panes tool-panes-counter">
        <Panel title="text" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.md,.csv,.html" />}>
          <CodeEditor value={text} onChange={setText} lang={null} wrap placeholder="Type or paste your text" ariaLabel="Text to count" className="tool-editor" />
        </Panel>
        <div className="counter-stats flex min-w-0 flex-col gap-4 overflow-auto p-4" aria-label="Counts">
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
