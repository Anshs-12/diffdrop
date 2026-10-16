import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search } from 'lucide-react';
import { pathString } from '@/lib/jsonTools';
import { isContainer, isJsonNumber } from '@/lib/jsonValue';
import { Button } from '@/components/ui/button';
import CodeEditor, { type CodeEditorHandle } from './CodeEditor';
import { InputActions, JsonStatusLine, Panel, useJsonInput } from './shared';
import { EXAMPLE_JSON } from './content';
import ToolBar from './ToolBar';

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

function TreeView({ root }: { root: unknown }) {
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

  const copyPath = async (row: Row) => {
    try {
      await navigator.clipboard.writeText(row.id);
      toast.success(`Copied ${row.id.length > 60 ? row.id.slice(0, 57) + '…' : row.id}`);
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search keys and values"
          aria-label="Search keys and values"
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
      <div ref={scrollRef} className="tool-tree" role="tree" aria-label="JSON tree">
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

export default function JsonViewer() {
  const { text, setText, parsed } = useJsonInput();
  const inputRef = useRef<CodeEditorHandle>(null);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE_JSON)} />
      <JsonStatusLine parsed={parsed} onJump={(l, c) => inputRef.current?.goToLine(l, c)} validNote="click a row to copy its path" />
      <div className="tool-panes tool-panes-viewer">
        <Panel title="json" actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} />}>
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
        </Panel>
        <Panel title="tree" className="tool-tree-panel">
          {parsed.status === 'valid' ? (
            <TreeView key={text.length} root={parsed.value} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-sm text-muted-foreground">
              The tree appears here once the JSON is valid.
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
