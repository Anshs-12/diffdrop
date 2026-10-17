import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { CornerDownLeft, LayoutGrid, Search } from 'lucide-react';
import { searchPages } from '@/lib/search';
import { cn } from '@/lib/utils';
import { pageById, type Page, type PageId } from '@/site';
import { GROUP_COLORS, TOOL_GROUPS, TOOL_ICONS, type ToolPageId } from './ToolShell';

/** Pages offered, in sidebar order, then the site pages. */
const ORDER: PageId[] = [...TOOL_GROUPS.flatMap((g) => g.ids), 'home', 'about', 'contact'];
const ORDERED = ORDER.map(pageById);
const GROUP_OF = new Map<PageId, string>(TOOL_GROUPS.flatMap((g) => g.ids.map((id) => [id, g.label] as [PageId, string])));

function Icon({ id }: { id: PageId }) {
  const I = id === 'home' ? LayoutGrid : TOOL_ICONS[id as ToolPageId];
  const color = GROUP_COLORS[GROUP_OF.get(id) ?? '']?.text ?? 'text-muted-foreground';
  return <I className={cn('size-4 shrink-0', color)} aria-hidden="true" />;
}

/** Cmd/Ctrl+K search over every tool and page. */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const results = useMemo(() => searchPages(query, ORDERED), [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = (page: Page | undefined) => {
    if (!page) return;
    onOpenChange(false);
    window.location.href = page.path;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed top-[12vh] left-1/2 z-[61] flex max-h-[70vh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">Search tools</Dialog.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  go(results[active]);
                }
              }}
              placeholder="Search tools: base64, json, password, color…"
              aria-label="Search tools"
              role="combobox"
              aria-expanded="true"
              aria-controls="palette-results"
              aria-activedescendant={results[active] ? `palette-${results[active]!.id}` : undefined}
              spellCheck={false}
              autoComplete="off"
              className="h-13 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
            <kbd className="rounded border px-1.5 font-mono text-[11px] text-muted-foreground">esc</kbd>
          </div>
          <ul ref={listRef} id="palette-results" role="listbox" aria-label="Tools" className="overflow-y-auto p-2">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No tool matches "{query}".</li>}
            {results.map((p, i) => (
              <li
                key={p.id}
                id={`palette-${p.id}`}
                role="option"
                aria-selected={i === active}
                data-index={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(p)}
                className={cn('flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2', i === active && 'bg-muted')}
              >
                <Icon id={p.id} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{p.name}</span>
                  <span className="block truncate text-[12.5px] text-muted-foreground">{p.blurb}</span>
                </span>
                <span className="font-mono text-[11px] text-faint">{GROUP_OF.get(p.id)?.toLowerCase() ?? 'page'}</span>
                {i === active && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
