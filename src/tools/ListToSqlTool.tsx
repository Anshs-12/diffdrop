import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { allNumeric, isNumeric, linesToItems, splitSeparated, toSeparated, toSqlIn, type QuoteStyle } from '@/lib/sqlList';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel } from './shared';
import OptionSwitch from './OptionSwitch';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Mode = 'sql' | 'join' | 'split';
const MODES: { value: Mode; label: string; title: string }[] = [
  { value: 'sql', label: 'SQL IN', title: 'Lines to a SQL IN list' },
  { value: 'join', label: 'Join lines', title: 'Lines to one comma-separated line' },
  { value: 'split', label: 'Split line', title: 'A comma-separated line (or an IN list) back to lines' },
];
const QUOTES: { value: QuoteStyle; label: string; title: string }[] = [
  { value: 'single', label: "'single'", title: 'String values, as in standard SQL' },
  { value: 'double', label: '"double"', title: 'Strings in MySQL by default; in standard SQL and PostgreSQL, double quotes name columns, not values' },
  { value: 'none', label: 'none', title: 'For numbers' },
];
const PER_LINE = [0, 1, 5, 10, 20, 50];

const EXAMPLES: Record<Mode, string> = {
  sql: "1042\n1043\nO'Brien\n  Zoë  \n1042\n\nsmith",
  join: 'red\ngreen\nblue\ngreen',
  split: "IN ('O''Brien', 'Zoë', 'a, b', 'smith')",
};

const bool = (v: unknown) => typeof v === 'boolean';
const str = (v: unknown) => typeof v === 'string' && v.length <= 20;

const selectClass = 'h-8 rounded-md border bg-background px-2 text-[13px]';
const inputClass = 'h-8 w-20 rounded-md border bg-background px-2 font-mono text-[13px] text-foreground';

export default function ListToSqlTool() {
  const [text, setText] = useSaved('text', '');
  const [mode, setMode] = useSaved<Mode>('mode', 'sql', (v) => MODES.some((m) => m.value === v));
  const [quote, setQuote] = useSaved<QuoteStyle>('quote', 'single', (v) => QUOTES.some((q) => q.value === v));
  const [escape, setEscape] = useSaved('escape', true, bool);
  const [wrap, setWrap] = useSaved('wrap', true, bool);
  const [perLine, setPerLine] = useSaved('perLine', 0, (v) => PER_LINE.includes(v as number));
  const [trim, setTrim] = useSaved('trim', true, bool);
  const [skipEmpty, setSkipEmpty] = useSaved('skipEmpty', true, bool);
  const [dedupe, setDedupe] = useSaved('dedupe', true, bool);
  const [unquote, setUnquote] = useSaved('unquote', true, bool);
  const [joinSep, setJoinSep] = useSaved('joinSep', ', ', str);
  const [splitSep, setSplitSep] = useSaved('splitSep', ',', str);

  const items = useMemo(
    () => (mode === 'split' ? splitSeparated(text, splitSep, { trim, skipEmpty, dedupe, unquote }) : linesToItems(text, { trim, skipEmpty, dedupe })),
    [text, mode, splitSep, trim, skipEmpty, dedupe, unquote],
  );
  const output = useMemo(() => {
    if (mode === 'sql') return toSqlIn(items, { quote, escape, wrap, perLine });
    if (mode === 'join') return toSeparated(items, joinSep);
    return items.join('\n');
  }, [items, mode, quote, escape, wrap, perLine, joinSep]);

  const numeric = allNumeric(items);
  const nonNumeric = mode === 'sql' && quote === 'none' ? items.filter((v) => !isNumeric(v)).length : 0;

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLES[mode])}>
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && setMode(v as Mode)} aria-label="Convert">
          {MODES.map((m) => (
            <ToggleGroupItem key={m.value} value={m.value} title={m.title}>
              {m.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </ToolBar>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5" aria-label="Options" role="group">
        {mode === 'sql' && (
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={quote} onValueChange={(v) => v && setQuote(v as QuoteStyle)} aria-label="Quotes">
              {QUOTES.map((q) => (
                <ToggleGroupItem key={q.value} value={q.value} title={q.title} className="font-mono">
                  {q.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <OptionSwitch
              id="sql-escape"
              label="Escape quotes"
              checked={escape && quote !== 'none'}
              onChange={setEscape}
              disabled={quote === 'none'}
              title="Double the quote character inside values: O'Brien becomes 'O''Brien'"
            />
            <OptionSwitch id="sql-wrap" label="IN ( … )" checked={wrap} onChange={setWrap} />
            <select value={perLine} onChange={(e) => setPerLine(Number(e.target.value))} aria-label="Values per line" className={selectClass}>
              {PER_LINE.map((p) => (
                <option key={p} value={p}>
                  {p === 0 ? 'All on one line' : `${p} per line`}
                </option>
              ))}
            </select>
          </>
        )}
        {mode === 'join' && (
          <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
            Separator
            <input value={joinSep} onChange={(e) => setJoinSep(e.target.value)} className={inputClass} aria-label="Separator" spellCheck={false} />
            <span className="text-[12px] text-faint">\t for tab</span>
          </label>
        )}
        {mode === 'split' && (
          <>
            <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
              Split on
              <input value={splitSep} onChange={(e) => setSplitSep(e.target.value)} className={inputClass} aria-label="Separator" spellCheck={false} />
            </label>
            <OptionSwitch id="sql-unquote" label="Remove quotes" checked={unquote} onChange={setUnquote} title="'O''Brien' becomes O'Brien" />
          </>
        )}
        <OptionSwitch id="sql-trim" label="Trim" checked={trim} onChange={setTrim} />
        <OptionSwitch id="sql-empty" label="Skip empty" checked={skipEmpty} onChange={setSkipEmpty} />
        <OptionSwitch id="sql-dedupe" label="Remove duplicates" checked={dedupe} onChange={setDedupe} />
      </div>
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 font-mono text-[12.5px] text-muted-foreground" aria-live="polite" aria-label="List status">
        {text.trim() ? (
          <span>
            {items.length.toLocaleString()} value{items.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="text-faint">{mode === 'split' ? 'Paste a comma-separated line or an IN list.' : 'Paste one value per line, or load the example.'}</span>
        )}
        {mode === 'sql' && numeric && quote !== 'none' && (
          <>
            <span>All values are numbers, so they don’t need quotes.</span>
            <Button variant="outline" size="xs" onClick={() => setQuote('none')}>
              Use no quotes
            </Button>
          </>
        )}
        {nonNumeric > 0 && (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            {nonNumeric} value{nonNumeric === 1 ? ' isn’t a number and needs' : 's aren’t numbers and need'} quotes
          </span>
        )}
      </div>
      <div className="tool-panes">
        <Panel
          title={mode === 'split' ? 'line' : 'lines'}
          onFile={setText}
          actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.csv,.sql" />}
        >
          <CodeEditor
            key={mode === 'split' ? 'wrap' : 'nowrap'}
            value={text}
            onChange={setText}
            lang={null}
            wrap={mode === 'split'}
            placeholder={mode === 'split' ? 'a, b, c' : 'One value per line'}
            ariaLabel="List input"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title={mode === 'sql' ? 'sql' : mode === 'join' ? 'one line' : 'lines'}
          actions={<OutputActions text={output} fileName={mode === 'sql' ? 'in-list.sql' : 'list.txt'} mime={mode === 'sql' ? 'application/sql' : 'text/plain'} />}
        >
          {mode === 'sql' && (
            <p className="flex items-start gap-1.5 border-b px-3 py-2 text-[12.5px] text-amber-700 dark:text-amber-400" role="note">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Don’t paste untrusted input into production SQL. Use parameterized queries; this is for quick ad-hoc queries.
            </p>
          )}
          <CodeEditor value={output} readOnly lang={mode === 'sql' ? 'c' : null} wrap ariaLabel="List output" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
