import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { lorem, type LoremUnit } from '@/lib/generate';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { OutputActions, Panel, StatusLine } from './shared';

const LIMITS: Record<LoremUnit, number> = { paragraphs: 100, sentences: 500, words: 5000 };

export default function LoremTool() {
  const [unit, setUnit] = useState<LoremUnit>('paragraphs');
  const [count, setCount] = useState(3);
  const [classic, setClassic] = useState(true);
  const [html, setHtml] = useState(false);
  const [seed, setSeed] = useState(1);
  // A random seed once in the browser, so each visit gets different text
  useEffect(() => setSeed(Math.floor(Math.random() * 2 ** 31)), []);

  const text = useMemo(() => {
    const parts = lorem(unit, count, { classic, seed });
    if (unit === 'paragraphs') return html ? parts.map((p) => `<p>${p}</p>`).join('\n') : parts.join('\n\n');
    const one = parts.join(' ');
    return html ? `<p>${one}</p>` : one;
  }, [unit, count, classic, html, seed]);

  const words = text.replace(/<\/?p>/g, '').split(/\s+/).filter(Boolean).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-3 py-2.5">
        <input
          type="number"
          min={1}
          max={LIMITS[unit]}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(LIMITS[unit], Number(e.target.value) || 1)))}
          aria-label="How many"
          className="h-8 w-20 rounded-md border bg-background px-2 font-mono text-[13px]"
        />
        <ToggleGroup type="single" variant="outline" size="sm" value={unit} onValueChange={(v) => v && setUnit(v as LoremUnit)} aria-label="Unit">
          <ToggleGroupItem value="paragraphs">Paragraphs</ToggleGroupItem>
          <ToggleGroupItem value="sentences">Sentences</ToggleGroupItem>
          <ToggleGroupItem value="words">Words</ToggleGroupItem>
        </ToggleGroup>
        <div className="flex items-center gap-2">
          <Switch id="lorem-classic" size="sm" checked={classic} onCheckedChange={setClassic} />
          <Label htmlFor="lorem-classic" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            Start with "Lorem ipsum"
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="lorem-html" size="sm" checked={html} onCheckedChange={setHtml} />
          <Label htmlFor="lorem-html" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
            HTML
          </Label>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}>
          <RefreshCw /> Regenerate
        </Button>
      </div>
      <StatusLine tone="ok">
        {words.toLocaleString()} words · {text.length.toLocaleString()} characters
      </StatusLine>
      <Panel title={html ? 'html' : 'text'} actions={<OutputActions text={text} fileName={html ? 'lorem.html' : 'lorem.txt'} mime={html ? 'text/html' : 'text/plain'} />}>
        <CodeEditor value={text} readOnly lang={html ? 'markup' : null} wrap ariaLabel="Lorem ipsum text" className="tool-editor" />
      </Panel>
    </>
  );
}
