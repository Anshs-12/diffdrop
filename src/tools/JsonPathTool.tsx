import { useDeferredValue, useMemo, useRef } from 'react';
import { jsonPath } from '@/lib/jsonPath';
import { stringify } from '@/lib/jsonValue';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, OutputActions, Panel, StatusLine, useJsonInput } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type View = 'both' | 'values' | 'paths';
const VIEWS: View[] = ['both', 'values', 'paths'];

// The bookstore document from RFC 9535
const EXAMPLE = `{
  "store": {
    "book": [
      { "category": "reference", "author": "Nigel Rees", "title": "Sayings of the Century", "price": 8.95 },
      { "category": "fiction", "author": "Evelyn Waugh", "title": "Sword of Honour", "price": 12.99 },
      { "category": "fiction", "author": "Herman Melville", "title": "Moby Dick", "isbn": "0-553-21311-3", "price": 8.99 },
      { "category": "fiction", "author": "J. R. R. Tolkien", "title": "The Lord of the Rings", "isbn": "0-395-19395-8", "price": 22.99 }
    ],
    "bicycle": { "color": "red", "price": 399 }
  }
}
`;

const EXAMPLES: { expr: string; label: string }[] = [
  { expr: '$.store.book[*].author', label: 'every author' },
  { expr: '$..price', label: 'every price, at any depth' },
  { expr: '$.store.book[?@.price < 10].title', label: 'titles under 10' },
  { expr: '$..book[?@.isbn]', label: 'books with an ISBN' },
  { expr: '$..book[-1]', label: 'the last book' },
  { expr: '$..book[0,1].title', label: 'first two titles' },
  { expr: "$..book[?match(@.author, '.*Rees|.*Waugh')].title", label: 'author matches a pattern' },
  { expr: '$.store[?length(@) == 2]', label: 'objects with 2 members' },
];

export default function JsonPathTool() {
  const { text, setText, parsed } = useJsonInput();
  const [expr, setExpr] = useSaved('expr', '$.store.book[*].author', (v) => typeof v === 'string' && v.length <= 5000);
  const [view, setView] = useSaved<View>('view', 'both', (v) => VIEWS.includes(v as View));
  const inputRef = useRef<CodeEditorHandle>(null);
  const exprRef = useRef<HTMLInputElement>(null);

  const deferredExpr = useDeferredValue(expr);
  const result = useMemo(() => (parsed.status === 'valid' || !text.trim() ? jsonPath(parsed.status === 'valid' ? parsed.value : null, deferredExpr) : null), [parsed, deferredExpr, text]);
  const output = useMemo(() => {
    if (!result?.ok || parsed.status !== 'valid') return '';
    const m = result.matches;
    if (view === 'values') return stringify(m.map((x) => x.value), 2);
    if (view === 'paths') return stringify(m.map((x) => x.path), 2);
    return stringify(m.map((x) => ({ path: x.path, value: x.value })), 2);
  }, [result, view, parsed.status]);

  const count = result?.ok ? result.matches.length : 0;
  const jumpTo = (pos: number) => {
    exprRef.current?.focus();
    exprRef.current?.setSelectionRange(pos, Math.min(pos + 1, expr.length));
  };

  return (
    <>
      <ToolBar
        onExample={() => {
          setText(EXAMPLE);
          setExpr('$.store.book[?@.price < 10].title');
        }}
      />
      <section className="border-b px-4 py-3" aria-label="JSONPath expression">
        <label htmlFor="jsonpath-expr" className="font-mono text-[12.5px] text-muted-foreground">
          jsonpath
        </label>
        <input
          id="jsonpath-expr"
          ref={exprRef}
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-invalid={result?.ok === false}
          aria-describedby="jsonpath-status"
          placeholder="$.store.book[*].author"
          className="mt-1.5 h-10 w-full rounded-lg border bg-background px-3 font-mono text-[14px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-del"
        />
        {result?.ok === false && (
          <pre className="mt-1 overflow-x-auto px-3 font-mono text-[14px] leading-tight text-del" aria-hidden="true">
            {expr.slice(0, result.pos).replace(/[^\t]/g, ' ')}^
          </pre>
        )}
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="Example expressions">
          {EXAMPLES.map((x) => (
            <button
              key={x.expr}
              type="button"
              title={x.label}
              aria-label={`${x.expr}: ${x.label}`}
              onClick={() => setExpr(x.expr)}
              className={cn(
                'h-7 max-w-full truncate rounded-md border px-2 font-mono text-[12px] transition-colors',
                expr === x.expr ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              {x.expr}
            </button>
          ))}
        </div>
      </section>
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} />
      <div id="jsonpath-status">
        {result?.ok === false ? (
          <StatusLine
            tone="error"
            label="Expression status"
            action={
              <button type="button" className="text-[12px] underline" onClick={() => jumpTo(result.pos)}>
                Go to error
              </button>
            }
          >
            {result.error} (at character {result.pos + 1})
          </StatusLine>
        ) : result?.ok && parsed.status === 'valid' ? (
          <StatusLine tone={count ? 'ok' : 'warn'} label="Expression status">
            {count ? `${count.toLocaleString()} match${count === 1 ? '' : 'es'}` : 'No matches'}
          </StatusLine>
        ) : null}
        {result?.ok &&
          result.warnings.map((w) => (
            <StatusLine key={w} tone="warn" label="Warning">
              {w}
            </StatusLine>
          ))}
      </div>
      <div className="tool-panes">
        <Panel title="json" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
          <CodeEditor
            ref={inputRef}
            value={text}
            onChange={setText}
            lang="c"
            errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
            placeholder="Paste JSON, or open a file"
            ariaLabel="JSON input"
            className="tool-editor"
          />
        </Panel>
        <Panel
          title="matches"
          meta={result?.ok && parsed.status === 'valid' ? count.toLocaleString() : undefined}
          actions={
            <>
              <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as View)} aria-label="Show" className="mr-1">
                <ToggleGroupItem value="both" className="h-7 px-2 text-[12px]">
                  Both
                </ToggleGroupItem>
                <ToggleGroupItem value="values" className="h-7 px-2 text-[12px]">
                  Values
                </ToggleGroupItem>
                <ToggleGroupItem value="paths" className="h-7 px-2 text-[12px]">
                  Paths
                </ToggleGroupItem>
              </ToggleGroup>
              <OutputActions text={output} fileName="matches.json" mime="application/json" />
            </>
          }
        >
          <CodeEditor value={output} readOnly lang="c" ariaLabel="Matches" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
