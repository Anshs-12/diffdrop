import { useEffect, useMemo, useState } from 'react';
import { slugifyLines, type SlugOptions } from '@/lib/slug';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

const EXAMPLE = `10 Tips for Better Sleep (2026 Edition)
Crème Brûlée: A Beginner’s Guide
Straße, Ærø & Łódź — a road trip 🚗
What’s new in v2.0?`;

export default function SlugTool() {
  const [text, setText] = useSaved('input', '');
  const [separator, setSeparator] = useSaved<'-' | '_'>('sep', '-', (v) => v === '-' || v === '_');
  const [lowercase, setLowercase] = useSaved('lower', true);
  const [maxLength, setMaxLength] = useSaved('max', 0, (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 500);
  const [removeStopWords, setRemoveStopWords] = useSaved('stop', false);
  const [maxText, setMaxText] = useState(maxLength ? String(maxLength) : '');
  useEffect(() => setMaxText(maxLength ? String(maxLength) : ''), [maxLength]);

  const output = useMemo(() => {
    const o: SlugOptions = { separator, lowercase, maxLength, removeStopWords };
    return slugifyLines(text, o);
  }, [text, separator, lowercase, maxLength, removeStopWords]);
  const { count, empties } = useMemo(() => {
    const slugs = output.split('\n');
    const lines = text.split(/\r?\n/);
    return {
      count: slugs.filter(Boolean).length,
      empties: lines.filter((l, i) => l.trim() && !slugs[i]).length,
    };
  }, [text, output]);

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLE)}>
        <ToggleGroup type="single" variant="outline" size="sm" value={separator} onValueChange={(v) => v && setSeparator(v as '-' | '_')} aria-label="Separator">
          <ToggleGroupItem value="-" aria-label="Dash" className="font-mono">
            a-b
          </ToggleGroupItem>
          <ToggleGroupItem value="_" aria-label="Underscore" className="font-mono">
            a_b
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="slug-lower" size="sm" checked={lowercase} onCheckedChange={setLowercase} />
          <Label htmlFor="slug-lower" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Lowercase
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="slug-stop" size="sm" checked={removeStopWords} onCheckedChange={setRemoveStopWords} />
          <Label htmlFor="slug-stop" className="cursor-pointer text-[13px] font-normal text-muted-foreground" title="a, an, the, and, of, to, in…">
            Remove stop words
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="slug-max" className="text-[13px] font-normal text-muted-foreground">
            Max length
          </Label>
          <Input
            id="slug-max"
            type="number"
            inputMode="numeric"
            min={0}
            max={500}
            placeholder="none"
            value={maxText}
            onChange={(e) => {
              setMaxText(e.target.value);
              const n = Number(e.target.value || 0);
              if (Number.isInteger(n) && n >= 0 && n <= 500) setMaxLength(n);
            }}
            className="h-8 w-20 font-mono text-[13px]"
          />
        </div>
      </ToolBar>
      {!text ? (
        <StatusLine tone="muted">Type or paste a title, or many, one per line.</StatusLine>
      ) : empties ? (
        <StatusLine tone="warn">
          {empties} line{empties === 1 ? '' : 's'} had no letters or digits left, so {empties === 1 ? 'its' : 'their'} slug is empty
        </StatusLine>
      ) : (
        <StatusLine tone="ok">
          {count.toLocaleString()} slug{count === 1 ? '' : 's'}
          {maxLength ? `, at most ${maxLength} characters` : ''}
        </StatusLine>
      )}
      <div className="tool-panes">
        <Panel title="text" onFile={setText} actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.txt,.csv,.md" />}>
          <CodeEditor value={text} onChange={setText} lang={null} placeholder="One title per line" ariaLabel="Text to slugify" className="tool-editor" />
        </Panel>
        <Panel title="slugs" actions={<OutputActions text={output} fileName="slugs.txt" mime="text/plain" />}>
          <CodeEditor value={output} readOnly lang={null} ariaLabel="Slugs" className="tool-editor" />
        </Panel>
      </div>
    </>
  );
}
