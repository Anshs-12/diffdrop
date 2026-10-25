import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Copy, Download, Search } from 'lucide-react';
import { pathString } from '@/lib/jsonTools';
import { isContainer, isJsonNumber, stringify } from '@/lib/jsonValue';
import { compactValue, tableModel, valueClass } from '@/lib/jsonTable';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { IconButton, InputActions, JsonStatusLine, Panel, copyText, downloadFile, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Path = (string | number)[];

interface Row {
  id: string;
  path: Path;
  key: string | number | null;
  value: unknown;
  depth: number;
  isContainer: boolean;
  size: number;
}

const ROW = 26;
/** Expand-all and search stop opening branches past this many rows, to stay responsive. */
const MAX_ROWS = 200_000;
const MAX_MATCHES = 1_000;
/** The table draws at most this many rows and columns; the rest are counted in a note. */
const TABLE_ROWS = 1_000;
const TABLE_COLUMNS = 100;

type View = 'text' | 'tree' | 'table';
const INPUT_VIEWS: View[] = ['text', 'tree', 'table'];
const OUTPUT_VIEWS: View[] = ['tree', 'table', 'text'];
const VIEW_LABEL: Record<View, string> = { text: 'Text', tree: 'Tree', table: 'Table' };

const pretty = (value: unknown) => stringify(value, 2) + '\n';

async function copyPathOf(id: string) {
  try {
    await navigator.clipboard.writeText(id);
    toast.success(`Copied ${id.length > 60 ? id.slice(0, 57) + '…' : id}`);
  } catch {
    toast.error('Clipboard unavailable');
  }
}

const entriesOf = (v: object): [string | number, unknown][] =>
  Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v);

/**
 * The rows currently visible: the root plus children of every expanded
 * container. With a filter (search results), only rows it shows, plus anything
 * inside a matching row, are included.
 */
function visibleRows(root: unknown, expanded: Set<string>, filter?: { shown: Set<string>; matches: Set<string> }): Row[] {
  const rows: Row[] = [];
  const stack: { path: Path; key: string | number | null; value: unknown; depth: number; free: boolean }[] = [
    { path: [], key: null, value: root, depth: 0, free: !filter },
  ];
  while (stack.length && rows.length < MAX_ROWS) {
    const { path, key, value, depth, free: parentFree } = stack.pop()!;
    const id = pathString(path);
    if (!parentFree && !filter!.shown.has(id)) continue;
    const free = parentFree || filter!.matches.has(id);
    const container = isContainer(value);
    const children = container ? entriesOf(value) : [];
    rows.push({ id, path, key, value, depth, isContainer: container, size: children.length });
    if (container && expanded.has(id)) {
      for (let i = children.length - 1; i >= 0; i--) {
        const [k, v] = children[i]!;
        stack.push({ path: [...path, k], key: k, value: v, depth: depth + 1, free });
      }
    }
  }
  return rows;
}

/** Ids of every container up to `maxDepth` levels deep (for expand all). */
function containerIds(root: unknown, maxRows: number): Set<string> {
  const out = new Set<string>();
  const stack: { path: Path; value: unknown }[] = [{ path: [], value: root }];
  let count = 0;
  while (stack.length && count < maxRows) {
    const { path, value } = stack.pop()!;
    count++;
    if (!isContainer(value)) continue;
    out.add(pathString(path));
    for (const [k, v] of entriesOf(value)) stack.push({ path: [...path, k], value: v });
  }
  return out;
}

/** Paths of keys or values matching the query, and the containers that lead to them. */
function searchTree(root: unknown, query: string): { matches: Set<string>; open: Set<string> } {
  const q = query.toLowerCase();
  const matches = new Set<string>();
  const open = new Set<string>();
  const stack: { path: Path; value: unknown }[] = [{ path: [], value: root }];
  while (stack.length && matches.size < MAX_MATCHES) {
    const { path, value } = stack.pop()!;
    const last = path[path.length - 1];
    const keyHit = typeof last === 'string' && last.toLowerCase().includes(q);
    const valueHit = !isContainer(value) && String(value).toLowerCase().includes(q);
    if (keyHit || valueHit) {
      matches.add(pathString(path));
      for (let i = 0; i < path.length; i++) open.add(pathString(path.slice(0, i)));
    }
    if (isContainer(value)) for (const [k, v] of entriesOf(value)) stack.push({ path: [...path, k], value: v });
  }
  return { matches, open };
}

function preview(row: Row): { text: string; cls: string } {
  const v = row.value;
  if (row.isContainer) {
    const array = Array.isArray(v);
    return { text: array ? `[${row.size}]` : `{${row.size}}`, cls: 'text-faint' };
  }
  if (typeof v === 'string') return { text: JSON.stringify(v), cls: 'tok-string' };
  if (typeof v === 'number' || isJsonNumber(v)) return { text: String(v), cls: 'tok-number' };
  return { text: String(v), cls: 'tok-literal' };
}

function TreeView({ root, label = 'JSON tree', searchLabel = 'Search keys and values' }: { root: unknown; label?: string; searchLabel?: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['$']));
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const search = useMemo(() => (query.trim().length >= 2 ? searchTree(root, query.trim()) : null), [root, query]);
  const effectiveExpanded = useMemo(() => {
    if (!search) return expanded;
    const merged = new Set(expanded);
    for (const id of search.open) merged.add(id);
    return merged;
  }, [expanded, search]);
  // While searching, show only the matches and the branches leading to them
  const filter = useMemo(
    () => (search ? { shown: new Set([...search.matches, ...search.open]), matches: search.matches } : undefined),
    [search],
  );
  const rows = useMemo(() => visibleRows(root, effectiveExpanded, filter), [root, effectiveExpanded, filter]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW,
    overscan: 20,
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const x of effectiveExpanded) next.add(x);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyPath = (row: Row) => copyPathOf(row.id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keys and values"
          aria-label={searchLabel}
          spellCheck={false}
          className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint"
        />
        {search && (
          <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {search.matches.size >= MAX_MATCHES ? `${MAX_MATCHES}+` : search.matches.size} match
            {search.matches.size === 1 ? '' : 'es'}
          </span>
        )}
        <Button
          variant="ghost"
          size="xs"
          onClick={() => {
            const all = containerIds(root, MAX_ROWS);
            setExpanded(all);
            if (all.size && visibleRows(root, all).length >= MAX_ROWS) toast('Expanded as much as fits; collapse a branch to see more');
          }}
        >
          <ChevronsUpDown /> Expand all
        </Button>
        <Button variant="ghost" size="xs" onClick={() => setExpanded(new Set(['$']))}>
          <ChevronsDownUp /> Collapse all
        </Button>
      </div>
      <div ref={scrollRef} className="tool-tree" role="tree" aria-label={label}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!;
            const expandable = row.isContainer && row.size > 0;
            const open = expandable && effectiveExpanded.has(row.id);
            const hit = search?.matches.has(row.id);
            const p = preview(row);
            return (
              <div
                key={row.id}
                role="treeitem"
                aria-level={row.depth + 1}
                aria-expanded={expandable ? open : undefined}
                className={`tree-row${hit ? ' is-hit' : ''}`}
                style={{ transform: `translateY(${item.start}px)`, paddingLeft: 8 + row.depth * 16 }}
              >
                {expandable ? (
                  <button
                    type="button"
                    className="tree-toggle"
                    aria-label={open ? 'Collapse' : 'Expand'}
                    onClick={() => toggle(row.id)}
                  >
                    {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </button>
                ) : (
                  <span className="tree-toggle" />
                )}
                <button type="button" className="tree-label" title={`Copy path ${row.id}`} onClick={() => copyPath(row)}>
                  <span className={typeof row.key === 'number' ? 'text-faint' : 'tok-keyword'}>
                    {row.key === null ? '$' : typeof row.key === 'number' ? row.key : JSON.stringify(row.key)}
                  </span>
                  <span className="text-faint">: </span>
                  <span className={p.cls}>{p.text}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Arrays of objects as rows with their merged keys as columns; anything else as key/value rows. */
function TableView({ root, label }: { root: unknown; label: string }) {
  const model = useMemo(() => tableModel(root, { maxRows: TABLE_ROWS, maxColumns: TABLE_COLUMNS }), [root]);
  const capped = model.totalRows > model.rows.length || model.totalColumns > model.columns.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {capped && (
        <div className="border-b px-3 py-1.5 font-mono text-xs text-muted-foreground" aria-live="polite">
          {model.totalRows > model.rows.length && `Showing the first ${model.rows.length.toLocaleString()} of ${model.totalRows.toLocaleString()} rows. `}
          {model.totalColumns > model.columns.length && `Showing ${model.columns.length} of ${model.totalColumns.toLocaleString()} columns. `}
          Use the tree to see everything.
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse font-mono text-[12.5px]" aria-label={label}>
          {model.kind !== 'value' && (
            <thead className="sticky top-0 z-[1] bg-background">
              <tr className="border-b">
                <th scope="col" className="px-2 py-1.5 text-left font-normal text-faint">
                  {model.keyLabel}
                </th>
                {model.columns.map((c, k) => (
                  <th key={k} scope="col" className="max-w-[280px] truncate px-2 py-1.5 text-left font-medium text-muted-foreground" title={c.label}>
                    {c.key === null ? <span className="italic">{c.label}</span> : c.label}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {model.rows.length === 0 && (
              <tr>
                <td colSpan={model.columns.length + 1} className="px-3 py-6 text-center text-muted-foreground">
                  {model.kind === 'object' ? 'This object is empty.' : 'This array is empty.'}
                </td>
              </tr>
            )}
            {model.rows.map((row) => (
              <tr key={String(row.key)} className="border-b hover:bg-[var(--bg-hover)]">
                {model.kind !== 'value' && (
                  <th scope="row" className={`px-2 py-1 text-left font-normal ${typeof row.key === 'number' ? 'text-faint tabular-nums' : 'tok-keyword'}`}>
                    {row.key}
                  </th>
                )}
                {row.cells.map((v, k) => {
                  const col = model.columns[k]!;
                  if (v === undefined) return <td key={k} className="px-2 py-1" />;
                  const path = col.key === null ? row.path : [...row.path, col.key];
                  const id = pathString(path);
                  return (
                    <td key={k} className="max-w-[280px] p-0">
                      <button
                        type="button"
                        className={`block w-full cursor-copy truncate px-2 py-1 text-left ${valueClass(v)}`}
                        title={`${compactValue(v, 500)}\nClick to copy ${id}`}
                        onClick={() => copyPathOf(id)}
                      >
                        {compactValue(v) || <span className="text-faint">""</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewToggle({ label, views, value, onChange }: { label: string; views: View[]; value: View; onChange: (v: View) => void }) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      className="mr-1"
      value={value}
      onValueChange={(v) => v && onChange(v as View)}
      aria-label={label}
    >
      {views.map((v) => (
        <ToggleGroupItem key={v} value={v} className="h-7 px-2 font-mono text-[12px]">
          {VIEW_LABEL[v]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export default function JsonViewer() {
  const { text, setText, parsed } = useJsonInput();
  const [inputView, setInputView] = useSaved<View>('inputView', 'text', (v) => INPUT_VIEWS.includes(v as View));
  const [outputView, setOutputView] = useSaved<View>('outputView', 'tree', (v) => OUTPUT_VIEWS.includes(v as View));
  const inputRef = useRef<CodeEditorHandle>(null);
  const valid = parsed.status === 'valid';
  const prettyText = useMemo(() => (parsed.status === 'valid' && outputView === 'text' ? pretty(parsed.value) : ''), [parsed, outputView]);

  const notValid = (
    <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">
      {parsed.status === 'empty' ? 'Nothing to show yet: paste JSON, open a file, or load the example.' : 'The JSON has an error, so it can’t be shown this way.'}
      <Button variant="outline" size="sm" className="mt-3" onClick={() => setInputView('text')}>
        Edit as text
      </Button>
    </div>
  );

  return (
    <>
      <ToolBar
        onExample={() => {
          setText(EXAMPLE_JSON);
        }}
      />
      <JsonStatusLine
        parsed={parsed}
        onJump={(l, c) => {
          setInputView('text');
          // The editor mounts on the next render when switching back to text
          setTimeout(() => inputRef.current?.goToLine(l, c), 0);
        }}
        validNote="click a row or cell to copy its path"
      />
      <div className="tool-panes tool-panes-viewer">
        <Panel
          title="json"
          onFile={setText}
          actions={
            <>
              <ViewToggle label="Input view" views={INPUT_VIEWS} value={inputView} onChange={setInputView} />
              <InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />
            </>
          }
        >
          {inputView === 'text' ? (
            <CodeEditor
              ref={inputRef}
              value={text}
              onChange={setText}
              lang="c"
              errorLine={parsed.status === 'invalid' ? parsed.check.line : null}
              placeholder="Paste JSON here, or open a file"
              ariaLabel="JSON input"
              className="tool-editor"
            />
          ) : (
            <div className="tool-editor flex flex-col">
              {!valid ? notValid : inputView === 'tree' ? (
                <TreeView key={text.length} root={parsed.value} label="Input tree" searchLabel="Search the input" />
              ) : (
                <TableView root={parsed.value} label="Input table" />
              )}
            </div>
          )}
        </Panel>
        <Panel
          title={outputView}
          className="tool-tree-panel"
          actions={
            <>
              <ViewToggle label="Output view" views={OUTPUT_VIEWS} value={outputView} onChange={setOutputView} />
              <IconButton label="Copy full JSON" disabled={!valid} onClick={() => valid && copyText(pretty(parsed.value), 'Copied the full JSON')}>
                <Copy />
              </IconButton>
              <IconButton label="Download data.json" disabled={!valid} onClick={() => valid && downloadFile(pretty(parsed.value), 'data.json', 'application/json;charset=utf-8')}>
                <Download />
              </IconButton>
            </>
          }
        >
          {!valid ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">
              The {outputView === 'text' ? 'formatted JSON' : outputView} appears here once the JSON is valid.
            </div>
          ) : outputView === 'tree' ? (
            <TreeView key={text.length} root={parsed.value} />
          ) : outputView === 'table' ? (
            <TableView root={parsed.value} label="JSON table" />
          ) : (
            <CodeEditor value={prettyText} readOnly lang="c" ariaLabel="Pretty-printed JSON" className="min-h-0 flex-1 overflow-hidden [&_.cm-editor]:h-full" />
          )}
        </Panel>
      </div>
    </>
  );
}
