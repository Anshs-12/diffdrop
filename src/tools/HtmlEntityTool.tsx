import { useMemo } from 'react';
import { decodeEntities, encodeEntities, type EntityStyle } from '@/lib/htmlEntities';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CodeEditor from './CodeEditor';
import { InputActions, OutputActions, Panel, StatusLine } from './shared';
import ToolBar from './ToolBar';
import { useSaved } from './saved';

type Mode = 'encode' | 'decode';
const STYLES: EntityStyle[] = ['named', 'numeric', 'hex'];
const STYLE_LABELS: Record<EntityStyle, string> = {
  named: '&lt;',
  numeric: '&#60;',
  hex: '&#x3C;',
};

const EXAMPLES: Record<Mode, string> = {
  encode: '<p class="note">Fish & chips — £4.50, "today only"</p>',
  decode: '&lt;a href=&quot;/search?q=caf&eacute;&amp;lang=fr&quot;&gt;Caf&#233; &#x2615;&lt;/a&gt; &copy; 2026',
};

export default function HtmlEntityTool() {
  const [mode, setMode] = useSaved<Mode>('mode', 'encode', (v) => v === 'encode' || v === 'decode');
  const [text, setText] = useSaved('input', '');
  const [style, setStyle] = useSaved<EntityStyle>('style', 'named', (v) => STYLES.includes(v as EntityStyle));
  const [nonAscii, setNonAscii] = useSaved('nonAscii', false);

  const encoded = useMemo(() => (mode === 'encode' ? encodeEntities(text, { style, nonAscii }) : ''), [mode, text, style, nonAscii]);
  const decoded = useMemo(() => (mode === 'decode' ? decodeEntities(text) : null), [mode, text]);
  const output = mode === 'encode' ? encoded : (decoded?.text ?? '');

  const switchMode = (next: Mode) => {
    // Flip direction: the output becomes the input
    setText(output);
    setMode(next);
  };

  const status = (() => {
    if (!text)
      return (
        <StatusLine tone="muted">{mode === 'encode' ? 'Type or paste text or HTML to escape.' : 'Paste text with entities like &amp;amp; or &amp;#233; to decode.'}</StatusLine>
      );
    if (mode === 'decode' && decoded?.unknown.length) {
      const list = decoded.unknown.slice(0, 3).join(' ');
      return (
        <StatusLine tone="warn">
          Left as written, not known HTML 4 names: {list}
          {decoded.unknown.length > 3 ? ` and ${decoded.unknown.length - 3} more` : ''}
        </StatusLine>
      );
    }
    const changed = mode === 'encode' ? (encoded.match(/&/g)?.length ?? 0) : (text.match(/&/g)?.length ?? 0);
    return <StatusLine tone="ok">{mode === 'encode' ? `${changed.toLocaleString()} entit${changed === 1 ? 'y' : 'ies'} written` : 'Decoded without running any HTML'}</StatusLine>;
  })();

  return (
    <>
      <ToolBar onExample={() => setText(EXAMPLES[mode])}>
        <ToggleGroup type="single" variant="outline" size="sm" value={mode} onValueChange={(v) => v && v !== mode && switchMode(v as Mode)} aria-label="Direction">
          <ToggleGroupItem value="encode">Encode</ToggleGroupItem>
          <ToggleGroupItem value="decode">Decode</ToggleGroupItem>
        </ToggleGroup>
        {mode === 'encode' && (
          <>
            <ToggleGroup type="single" variant="outline" size="sm" value={style} onValueChange={(v) => v && setStyle(v as EntityStyle)} aria-label="Entity style">
              {STYLES.map((s) => (
                <ToggleGroupItem key={s} value={s} aria-label={s === 'named' ? 'Named' : s === 'numeric' ? 'Decimal' : 'Hex'} className="font-mono text-[12.5px]">
                  {STYLE_LABELS[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <Switch id="he-ascii" size="sm" checked={nonAscii} onCheckedChange={setNonAscii} />
              <Label htmlFor="he-ascii" className="cursor-pointer text-[13px] font-normal text-muted-foreground">
                Encode non-ASCII too
              </Label>
            </div>
          </>
        )}
      </ToolBar>
      {status}
      <div className="tool-panes">
        <Panel
          title={mode === 'encode' ? 'text' : 'html with entities'}
          onFile={setText}
          actions={<InputActions onLoad={setText} onClear={() => setText('')} canClear={!!text} accept="text/*,.html,.htm,.txt,.xml" />}
        >
          <CodeEditor
            key={mode}
            value={text}
            onChange={setText}
            lang={mode === 'decode' ? 'markup' : null}
            wrap
            placeholder={mode === 'encode' ? 'Type or paste text to escape' : 'Paste text with entities to decode'}
            ariaLabel={mode === 'encode' ? 'Text to encode' : 'Text to decode'}
            className="tool-editor"
          />
        </Panel>
        <Panel
          title={mode === 'encode' ? 'escaped' : 'decoded'}
          actions={<OutputActions text={output} fileName={mode === 'encode' ? 'escaped.html' : 'decoded.txt'} mime={mode === 'encode' ? 'text/html' : 'text/plain'} />}
        >
          <CodeEditor
            value={output}
            readOnly
            lang={mode === 'encode' ? 'markup' : null}
            wrap
            ariaLabel={mode === 'encode' ? 'Encoded text' : 'Decoded text'}
            className="tool-editor"
          />
        </Panel>
      </div>
    </>
  );
}
