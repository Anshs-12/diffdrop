import React, { useState } from 'react';
import { Plus, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const PRESETS: { label: string; pattern: string }[] = [
  { label: 'Timestamps', pattern: '\\d{4}-\\d{2}-\\d{2}[T ]\\d{2}:\\d{2}(:\\d{2}(\\.\\d+)?)?(Z|[+-]\\d{2}:?\\d{2})?' },
  { label: 'UUIDs', pattern: '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' },
  { label: 'Hashes', pattern: '\\b[0-9a-f]{7,64}\\b' },
  { label: 'Numbers', pattern: '\\d+(\\.\\d+)?' },
  { label: 'Comments', pattern: '(//|#).*$' },
];

function validate(pattern: string): string | null {
  if (!pattern) return 'Enter a pattern';
  try {
    new RegExp(pattern, 'g');
  } catch (e) {
    return e instanceof Error ? e.message.replace(/^Invalid regular expression: /, '') : 'Invalid pattern';
  }
  if (new RegExp(pattern).test('')) return 'Pattern matches empty text, so it would ignore nothing useful';
  return null;
}

interface IgnoreRulesProps {
  patterns: string[];
  onChange: (patterns: string[]) => void;
}

const IgnoreRules: React.FC<IgnoreRulesProps> = ({ patterns, onChange }) => {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = (pattern: string) => {
    const problem = validate(pattern);
    if (problem) {
      setError(problem);
      return;
    }
    if (!patterns.includes(pattern)) onChange([...patterns, pattern]);
    setDraft('');
    setError(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-[13px] font-normal">
          <SlidersHorizontal />
          Ignore rules
          {patterns.length > 0 && (
            <Badge className="h-4 min-w-4 rounded-full bg-brand px-1 text-[10px] text-brand-foreground">
              {patterns.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,380px)] p-4">
        <p className="text-sm font-medium">Ignore text matching</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Regular expressions. Matching text is left out when lines are compared, so lines that differ only
          there count as unchanged.
        </p>

        {patterns.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {patterns.map((p) => (
              <li key={p} className="flex items-center gap-2 rounded-md border bg-background py-1 pr-1 pl-2.5">
                <code className="min-w-0 flex-1 truncate bg-transparent p-0 text-xs" title={p}>
                  {p}
                </code>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove ${p}`}
                  onClick={() => onChange(patterns.filter((x) => x !== p))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            placeholder="e.g. build-\d+"
            className="h-8 font-mono text-xs"
            aria-label="New ignore pattern"
            aria-invalid={error != null}
            spellCheck={false}
          />
          <Button type="submit" size="sm" className="h-8">
            <Plus /> Add
          </Button>
        </form>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}

        <div className="mt-4 flex flex-wrap gap-1.5">
          {PRESETS.map(({ label, pattern }) => (
            <Button
              key={label}
              variant="outline"
              size="xs"
              className="rounded-full font-normal"
              disabled={patterns.includes(pattern)}
              onClick={() => add(pattern)}
            >
              + {label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default IgnoreRules;
