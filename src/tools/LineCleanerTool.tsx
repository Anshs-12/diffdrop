import { useMemo, useState } from 'react';
import { Shuffle } from 'lucide-react';
import { LINE_SORTS, cleanLines, type LineSort } from '@/lib/lines';
import { Button } from '@/components/ui/button';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel } from './shared';
import OptionSwitch from './OptionSwitch';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE = `banana
Apple
  cherry
apple

item 10
item 2
Banana
cherry
item 1
`;

const SORT_LABELS: Record<LineSort, string> = {
  none: 'Keep order',
  az: 'A–Z',
  za: 'Z–A',
  natural: 'Natural (2 before 10)',
  length: 'By length',
  numeric: 'By number in line',
  shuffle: 'Shuffle',
};

const bool = (v: unknown) => typeof v === 'boolean';

export default function LineCleanerTool() {
  const [text, setText] = useSaved('text', '');
  const [dedupe, setDedupe] = useSaved('dedupe', true, bool);
  const [ignoreCase, setIgnoreCase] = useSaved('ignoreCase', false, bool);
  const [trim, setTrim] = useSaved('trim', true, bool);
  const [dropEmpty, setDropEmpty] = useSaved('dropEmpty', true, bool);
  const [reverse, setReverse] = useSaved('reverse', false, bool);
  const [sort, setSort] = useSaved<LineSort>('sort', 'none', (v) => LINE_SORTS.includes(v as LineSort));
  const [seed, setSeed] = useState(() => (Math.random() * 2 ** 32) >>> 0);

  const result = useMemo(
    () => cleanLines(text, { dedupe, ignoreCase, trim, dropEmpty, sort, reverse, seed }),
    [text, dedupe, ignoreCase, trim, dropEmpty, sort, reverse, seed],
  );
  const s = result.stats;
  const n = (x: number) => x.toLocaleString();

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <OptionSwitch id="lc-dedupe" label="Remove duplicates" checked={dedupe} onChange={setDedupe} />
        <OptionSwitch id="lc-case" label="Ignore case" checked={ignoreCase} onChange={setIgnoreCase} disabled={!dedupe} title="Apple and apple count as the same line; the first one’s casing is kept" />
        <OptionSwitch id="lc-trim" label="Trim spaces" checked={trim} onChange={setTrim} />
        <OptionSwitch id="lc-empty" label="Remove blank lines" checked={dropEmpty} onChange={setDropEmpty} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as LineSort)}
          aria-label="Sort"
          className="h-8 rounded-md border bg-background px-2 text-[13px]"
        >
          {LINE_SORTS.map((v) => (
            <option key={v} value={v}>
              {SORT_LABELS[v]}
            </option>
          ))}
        </select>
        {sort === 'shuffle' && (
          <Button variant="outline" size="sm" onClick={() => setSeed((Math.random() * 2 ** 32) >>> 0)}>
            <Shuffle /> Shuffle again
          </Button>
        )}
        <OptionSwitch id="lc-reverse" label="Reverse" checked={reverse} onChange={setReverse} />
      </ToolBar>
      <div className="flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 font-mono text-[12.5px] text-muted-foreground" aria-live="polite" aria-label="Line counts">
        {text ? (
          <>
            <span>
              before: <b className="font-medium text-foreground">{n(s.linesBefore)}</b> lines, {n(s.uniqueBefore)} unique
            </span>
            <span>
              after: <b className="font-medium text-foreground">{n(s.linesAfter)}</b> lines
            </span>
            {dedupe && <span>{n(s.removedDuplicates)} duplicate{s.removedDuplicates === 1 ? '' : 's'} removed</span>}
            {dropEmpty && <span>{n(s.removedEmpty)} blank line{s.removedEmpty === 1 ? '' : 's'} removed</span>}
          </>
        ) : (
          <span className="text-faint">Paste lines, open a file, or load the example.</span>
        )}
      </div>
      <div className="tool-panes">
        <Panel title="lines" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.csv,.log,.md" />}>
          <CodeEditor value={text} onChange={setText} lang={null} placeholder="Paste one item per line" ariaLabel="Lines to clean" className="tool-editor" />
        </Panel>
        <Panel title="cleaned" actions={<OutputActions text={result.text} fileName="lines.txt" mime="text/plain" />}>
          <CodeEditor value={result.text} readOnly lang={null} ariaLabel="Cleaned lines" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
