import React from 'react';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FindBarProps {
  inputRef: React.Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (q: string) => void;
  count: number;
  /** Index of the current match, -1 when there is none. */
  index: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Search inside the diff. The table only renders the rows on screen, so the
 * browser's own find can't see the rest; this searches every line instead.
 */
const FindBar: React.FC<FindBarProps> = ({ inputRef, query, onQueryChange, count, index, onPrev, onNext }) => (
  <div className="flex items-center gap-2 border-t px-3 py-1.5">
    <Search className="size-3.5 text-muted-foreground" aria-hidden="true" />
    <input
      ref={inputRef}
      type="search"
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (e.shiftKey) onPrev();
          else onNext();
        } else if (e.key === 'Escape') {
          onQueryChange('');
        }
      }}
      placeholder="Find in diff"
      aria-label="Find in diff"
      spellCheck={false}
      className="h-7 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
    />
    {query && (
      <>
        <span className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {count ? `${index + 1}/${count.toLocaleString()}` : 'no matches'}
        </span>
        <Button variant="ghost" size="icon-xs" aria-label="Previous match" onClick={onPrev} disabled={!count}>
          <ChevronUp />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Next match" onClick={onNext} disabled={!count}>
          <ChevronDown />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Clear search" onClick={() => onQueryChange('')}>
          <X />
        </Button>
      </>
    )}
  </div>
);

export default FindBar;
